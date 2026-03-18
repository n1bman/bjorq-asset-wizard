

## Analysis

After reviewing the official TRELLIS.2 `setup.sh` and README, the reality is clear:

**Full TRELLIS.2 runtime is NOT feasible inside the HA addon container.** The addon runs on Alpine Linux with no NVIDIA GPU, no CUDA Toolkit, and no conda. TRELLIS.2 requires:
- Linux + NVIDIA GPU with 24GB+ VRAM
- CUDA Toolkit 12.4 for compiling 6 native extensions (nvdiffrast, nvdiffrec, cumesh, flexgemm, o-voxel, flash-attn)
- PyTorch with CUDA support
- ~15GB+ for model weights (4B parameter model)

The installer should be honest about this and prepare for a future external GPU worker architecture.

## Changes

### 1. Refactor `manager.ts` — Accurate install pipeline (both `server/` and `bjorq_asset_wizard/server/`)

**Clone fix**: Use `--recursive` flag (required for submodules like `o-voxel`).

**Environment capability detection** — new function `detectEnvironmentCapabilities()` that checks:
- `nvidia-smi` presence and GPU VRAM
- CUDA Toolkit (`nvcc --version`)
- Available disk space on `/data`

**Match official `setup.sh` structure**:
- **Basic deps**: `imageio imageio-ffmpeg tqdm easydict opencv-python-headless ninja trimesh transformers gradio==6.0.1 tensorboard pandas lpips zstandard` + `utils3d` from git + `pillow-simd` + `kornia timm`
- **PyTorch**: Install `torch==2.6.0 torchvision==0.21.0` with correct index URL based on detected platform
- **CUDA extensions** (each cloned + built separately, skip on failure with clear logging):
  - `flash-attn==2.7.3`
  - `nvdiffrast` v0.4.0 from NVlabs
  - `nvdiffrec` from JeffreyXiang fork
  - `CuMesh` from JeffreyXiang
  - `FlexGEMM` from JeffreyXiang
  - `o-voxel` from repo submodule
- Each extension logs whether it was installed or skipped (and why)

**Pretrained weights**: Use `huggingface-hub` to download `microsoft/TRELLIS.2-4B` to a configurable weights directory.

**Honest status reporting** — expand `TrellisState` and `TrellisStatusResponse` with:
- `environment.gpu` — detected GPU name + VRAM, or `null`
- `environment.cuda` — CUDA toolkit version, or `null`
- `environment.platform` — `"cuda" | "hip" | "cpu-only"`
- `environment.meetsRequirements` — boolean
- `environment.missingRequirements` — string[] (e.g., `["NVIDIA GPU with 24GB+ VRAM", "CUDA Toolkit 12.4"]`)
- `extensions` — record of which CUDA extensions installed vs skipped
- `weightsDownloaded` — boolean

### 2. Update types (`src/types/generate.ts` + `server/src/types/generate.ts`)

Extend `TrellisStatusResponse`:
```typescript
export interface TrellisEnvironment {
  platform: "cuda" | "hip" | "cpu-only";
  gpu: string | null;          // e.g. "NVIDIA A100 (48GB)"
  cudaVersion: string | null;  // e.g. "12.4"
  meetsRequirements: boolean;
  missingRequirements: string[];
}

export interface TrellisStatusResponse {
  installed: boolean;
  running: boolean;
  gpu: boolean;
  version?: string;
  installing?: boolean;
  installProgress?: number;
  environment?: TrellisEnvironment;
  weightsDownloaded?: boolean;
  extensions?: Record<string, boolean>;
}
```

### 3. Update `EngineStatus.tsx` — Honest UI reporting

- If `environment.meetsRequirements === false`, show a warning with the list of missing requirements instead of a generic "Install Engine" button
- Still allow install attempt (for partial installs / testing), but with a clear disclaimer
- Show which extensions were installed vs skipped after installation
- Show weights download status

### 4. Version bump to 2.3.9

Update all 5 version locations + CHANGELOG.

### Files modified
- `server/src/services/trellis/manager.ts`
- `bjorq_asset_wizard/server/src/services/trellis/manager.ts`
- `src/types/generate.ts`
- `server/src/types/generate.ts`
- `bjorq_asset_wizard/server/src/types/generate.ts`
- `src/components/generate/EngineStatus.tsx`
- `server/package.json`, `server/src/index.ts`
- `bjorq_asset_wizard/server/package.json`, `bjorq_asset_wizard/server/src/index.ts`
- `bjorq_asset_wizard/config.yaml`
- `CHANGELOG.md`

