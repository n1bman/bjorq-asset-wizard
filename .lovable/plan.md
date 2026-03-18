

## Analysis

TRELLIS.2 has **no `requirements.txt`**. The official install method is a `setup.sh` script that runs individual `pip install` commands for each component group (`--basic`, `--flash-attn`, `--nvdiffrast`, etc.). Several components also require cloning separate git repos and building from source with CUDA.

For the HA addon container (which may lack CUDA Toolkit, conda, and GPU), we need a pragmatic approach: install the **basic Python dependencies** via direct pip commands (mirroring `setup.sh --basic`), and skip GPU-compiled extensions (flash-attn, nvdiffrast, nvdiffrec, cumesh, flexgemm, o-voxel) which require CUDA compilation. Those can be attempted separately if GPU is detected.

## Changes (both `server/` and `bjorq_asset_wizard/server/`)

### 1. Replace `requirements.txt` install with auto-detected strategy

In `doInstall()`, replace the single `pip install -r requirements.txt` call (lines 182-191) with a multi-strategy dependency installer:

1. **Detect install method** by checking the cloned repo for:
   - `setup.sh` (TRELLIS.2 actual method)
   - `requirements.txt` (fallback)
   - `pyproject.toml` / `setup.py` (fallback)
2. **Log which strategy is selected**
3. **For `setup.sh` (primary path)**: Run the basic dependencies as direct pip install commands matching `setup.sh --basic`:
   ```
   pip install imageio imageio-ffmpeg tqdm easydict opencv-python-headless ninja trimesh transformers gradio tensorboard pandas lpips zstandard
   pip install git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e...
   pip install kornia timm
   ```
4. **If GPU detected**: Attempt `pip install flash-attn` (skip on failure since it needs CUDA toolkit)
5. **If no recognized install method**: Fail with a structured error naming what was expected vs. found

### 2. Update step numbering and progress

Change from 4 steps to 5:
1. Clone repo (10%)
2. Create venv (30%)
3. Install basic deps (50%)
4. Install GPU extensions if available (70%)
5. Download model weights (90%)

### 3. Version bump to 2.3.8

Update all 5 version locations + CHANGELOG.

### Files modified
- `server/src/services/trellis/manager.ts`
- `bjorq_asset_wizard/server/src/services/trellis/manager.ts`
- `server/package.json`
- `server/src/index.ts`
- `bjorq_asset_wizard/server/package.json`
- `bjorq_asset_wizard/server/src/index.ts`
- `bjorq_asset_wizard/config.yaml`
- `CHANGELOG.md`

