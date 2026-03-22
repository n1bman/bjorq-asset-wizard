"""
Bjorq 3D Worker — TRELLIS.2 inference bridge.

Wraps TRELLIS.2 pipeline calls. Loads the model once at init
and runs generation per-request.

IMPORTANT: The TRELLIS.2 repo exposes its package as `trellis2`
(not `trellis`). The repo root must be on sys.path so that
`import trellis2` resolves to `<repo>/trellis2/`.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("bjorq-worker.bridge")


class BridgeError(Exception):
    """Error during TRELLIS generation."""
    pass


class TrellisBridge:
    """
    Wraps TRELLIS.2 inference.

    On init, validates that the TRELLIS repo and weights exist.
    The actual model is loaded lazily on first generate() call
    to speed up worker startup.
    """

    def __init__(self, repo_path: str, weights_path: str):
        self.repo_path = Path(repo_path)
        self.weights_path = Path(weights_path)
        self._pipeline = None

        # Validate paths exist
        if not self.repo_path.exists():
            raise BridgeError(
                f"TRELLIS repository not found at {self.repo_path}. "
                "Run the installer first."
            )

        # Verify trellis2 package directory exists inside repo
        trellis2_pkg = self.repo_path / "trellis2"
        if not trellis2_pkg.exists():
            # Some repo layouts use 'trellis' — check that too
            trellis1_pkg = self.repo_path / "trellis"
            if trellis1_pkg.exists():
                logger.warning(
                    "Found 'trellis/' instead of 'trellis2/' in repo — "
                    "this may be an older TRELLIS version"
                )
            else:
                logger.warning(
                    "Neither 'trellis2/' nor 'trellis/' found in %s — "
                    "imports may fail", self.repo_path
                )

        # Add repo to sys.path so `import trellis2` works
        repo_str = str(self.repo_path)
        if repo_str not in sys.path:
            sys.path.insert(0, repo_str)

        # Set weights environment variable
        os.environ["TRELLIS_WEIGHTS_PATH"] = str(self.weights_path)

        logger.info("Bridge initialized (repo=%s, weights=%s)", self.repo_path, self.weights_path)

    def _load_pipeline(self):
        """Lazy-load the TRELLIS pipeline on first use."""
        if self._pipeline is not None:
            return

        logger.info("Loading TRELLIS pipeline (first generation)...")
        try:
            # Try trellis2 first (TRELLIS.2 repo), then trellis (older)
            pipeline_cls = None
            try:
                # TRELLIS.2 does not reliably re-export pipeline classes from trellis2.pipelines.__init__
                from trellis2.pipelines.trellis2_image_to_3d import Trellis2ImageTo3DPipeline
                pipeline_cls = Trellis2ImageTo3DPipeline
                logger.info("Using trellis2.pipelines.trellis2_image_to_3d.Trellis2ImageTo3DPipeline")
            except ModuleNotFoundError as e:
                # Common failure on fresh Windows machines: missing CUDA extension deps
                if getattr(e, "name", "") in ("cumesh", "flex_gemm"):
                    raise BridgeError(
                        "TRELLIS.2 CUDA extensions are missing (cumesh/flex_gemm). "
                        "Re-run the installer after installing Visual Studio Build Tools 2022 "
                        "(Desktop development with C++)."
                    )
                raise
            except ImportError:
                try:
                    from trellis2.pipelines import TrellisImageTo3DPipeline
                    pipeline_cls = TrellisImageTo3DPipeline
                    logger.info("Using trellis2.pipelines.TrellisImageTo3DPipeline")
                except ImportError:
                    try:
                        from trellis.pipelines import TrellisImageTo3DPipeline
                        pipeline_cls = TrellisImageTo3DPipeline
                        logger.info("Using trellis.pipelines.TrellisImageTo3DPipeline (legacy)")
                    except ImportError:
                        pass

            if pipeline_cls is None:
                # List what's actually available for debugging
                available = []
                for mod_name in ["trellis2", "trellis"]:
                    try:
                        mod = __import__(mod_name)
                        available.append(f"{mod_name} (found at {getattr(mod, '__file__', '?')})")
                    except ImportError:
                        pass
                raise BridgeError(
                    "Could not import TRELLIS pipeline class. "
                    f"Tried: trellis2.pipelines, trellis.pipelines. "
                    f"Available modules: {available or 'none'}. "
                    f"sys.path includes: {self.repo_path}"
                )

            self._pipeline = pipeline_cls.from_pretrained(str(self.weights_path))

            try:
                import torch

                if torch.cuda.is_available():
                    self._pipeline.to(torch.device("cuda"))
                    logger.info("TRELLIS pipeline moved to CUDA")
                else:
                    logger.warning("CUDA is not available - TRELLIS will run on CPU")
            except Exception as move_err:
                logger.warning("Could not move TRELLIS pipeline to CUDA: %s", move_err)

            logger.info("TRELLIS pipeline loaded successfully")
        except BridgeError:
            raise
        except Exception as e:
            raise BridgeError(f"Failed to load TRELLIS pipeline: {e}")

    def _export_glb(self, mesh_output: Any) -> bytes:
        try:
            import tempfile

            if hasattr(mesh_output, "export"):
                glb_bytes = mesh_output.export(file_type="glb")
                return bytes(glb_bytes) if not isinstance(glb_bytes, bytes) else glb_bytes

            try:
                import o_voxel  # type: ignore

                with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as tmp:
                    tmp_path = tmp.name

                try:
                    o_voxel.postprocess.to_glb(
                        mesh_output.vertices,
                        mesh_output.faces,
                        mesh_output.coords,
                        mesh_output.attrs,
                        mesh_output.layout,
                        mesh_output.voxel_size,
                        tmp_path,
                    )
                    return Path(tmp_path).read_bytes()
                finally:
                    Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass

            if isinstance(mesh_output, (bytes, bytearray)):
                return bytes(mesh_output)

            raise BridgeError(
                "TRELLIS output could not be exported to GLB. "
                "Expected MeshWithVoxel/exportable mesh output."
            )
        except BridgeError:
            raise
        except Exception as e:
            raise BridgeError(f"Failed to export GLB: {e}")

    def generate(self, image_paths: list[str], options: dict) -> bytes:
        """
        Generate a 3D model from a single input image.

        Args:
            image_paths: List of paths to input images (first item is used)
            options: Generation options (style, target, variant)

        Returns:
            GLB file contents as bytes
        """
        self._load_pipeline()

        logger.info("Generating 3D model from %d image(s)", len(image_paths))

        try:
            from PIL import Image

            if not image_paths:
                raise BridgeError("At least one input image is required")

            if len(image_paths) > 1:
                raise BridgeError(
                    "TRELLIS.2 worker currently supports one input image per generation. "
                    "Upload a single hero photo for now."
                )

            image = Image.open(image_paths[0]).convert("RGB")
            outputs = self._pipeline.run(
                image,
                seed=options.get("seed", 42),
                num_samples=1,
            )

            if not outputs:
                raise BridgeError("TRELLIS pipeline returned no mesh output")

            mesh_output = outputs[0]
            glb_bytes = self._export_glb(mesh_output)

            if len(glb_bytes) < 100:
                raise BridgeError(f"Generated GLB is too small ({len(glb_bytes)} bytes)")

            # Validate GLB magic
            if len(glb_bytes) >= 4:
                magic = int.from_bytes(glb_bytes[:4], "little")
                if magic != 0x46546C67:  # 'glTF'
                    raise BridgeError("Output is not a valid GLB file")

            logger.info("Generation complete: %d bytes", len(glb_bytes))
            return glb_bytes

        except BridgeError:
            raise
        except Exception as e:
            raise BridgeError(f"Generation failed: {e}")
