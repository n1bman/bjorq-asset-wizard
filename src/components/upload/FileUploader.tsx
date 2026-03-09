import { useCallback, useState } from "react";
import { Upload, AlertTriangle, AlertCircle, X, FileBox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  validateFileSize,
  formatFileSize,
  STAGE_LABELS,
  type ProcessingStage,
  type FileSizeValidation,
} from "@/lib/upload-limits";

export type UploadState = "idle" | "selected" | "uploading" | "processing" | "complete" | "error";

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
  /** Upload progress 0-100 (set externally) */
  uploadProgress?: number;
  /** Current processing stage */
  processingStage?: string;
  /** Current state of the upload flow */
  uploadState?: UploadState;
  /** Error info */
  error?: { stage?: ProcessingStage; message?: string };
  /** Called when user wants to reset / try again */
  onReset?: () => void;
}

export function FileUploader({
  onFileSelected,
  isLoading,
  accept = ".glb,.gltf",
  uploadProgress,
  processingStage,
  uploadState = "idle",
  error,
  onReset,
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<FileSizeValidation | null>(null);

  const processFile = useCallback(
    (f: File) => {
      const v = validateFileSize(f);
      setValidation(v);

      if (!v.ok) {
        setFile(f);
        return; // Don't call onFileSelected for files that exceed limit
      }

      setFile(f);
      onFileSelected(f);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleReset = () => {
    setFile(null);
    setValidation(null);
    onReset?.();
  };

  const isUploading = uploadState === "uploading";
  const isProcessing = uploadState === "processing";
  const isError = uploadState === "error";
  const isActive = isUploading || isProcessing;

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-10 text-center transition-colors",
          dragOver ? "border-primary bg-accent/30" : "border-border",
          (isLoading || isActive) && "opacity-50 pointer-events-none",
          isError && "border-destructive/50 bg-destructive/5",
          validation && !validation.ok && "border-destructive/50 bg-destructive/5",
        )}
      >
        {/* Error state */}
        {isError && error && (
          <div className="space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                {error.stage ? STAGE_LABELS[error.stage] : "Processing failed"}
              </p>
              <p className="text-xs text-muted-foreground">{error.message || "An unexpected error occurred"}</p>
              {error.stage && (
                <p className="text-xs text-muted-foreground/70">
                  Failed at stage: <span className="font-mono">{error.stage}</span>
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        )}

        {/* Uploading state */}
        {isUploading && !isError && (
          <div className="space-y-3">
            <Upload className="mx-auto h-10 w-10 text-primary animate-pulse" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Uploading{file ? ` ${file.name}` : ""}…</p>
              <Progress value={uploadProgress ?? 0} className="max-w-xs mx-auto" />
              <p className="text-xs text-muted-foreground">{uploadProgress ?? 0}%</p>
            </div>
          </div>
        )}

        {/* Processing state */}
        {isProcessing && !isError && (
          <div className="space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {processingStage || "Processing"}…
              </p>
              <p className="text-xs text-muted-foreground">This may take a moment for large files</p>
            </div>
          </div>
        )}

        {/* File exceeds max size */}
        {!isActive && !isError && file && validation && !validation.ok && (
          <div className="space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">{validation.error}</p>
              <p className="text-xs text-muted-foreground">Select a smaller file or optimize it externally first.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Select Different File
            </Button>
          </div>
        )}

        {/* File selected (valid) */}
        {!isActive && !isError && file && validation?.ok && (
          <div className="space-y-2">
            <FileBox className="mx-auto h-10 w-10 text-primary" />
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <button onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>
        )}

        {/* Idle — no file */}
        {!isActive && !isError && !file && (
          <div className="space-y-2">
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a <strong>.glb</strong> or <strong>.gltf</strong> file
            </p>
            <p className="text-xs text-muted-foreground">Up to 100 MB</p>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>Browse files</span>
              </Button>
              <input type="file" accept={accept} onChange={handleChange} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* Large file warning (shown below the drop zone) */}
      {validation?.warning && validation.ok && !isError && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{validation.warning}</p>
        </div>
      )}
    </div>
  );
}
