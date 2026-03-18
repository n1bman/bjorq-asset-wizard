import { useCallback, useState, useRef } from "react";
import { Camera, X, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per image
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUploader({
  images,
  onImagesChange,
  maxImages = 4,
  disabled = false,
}: PhotoUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = Array.from(files).filter(
        (f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE,
      );
      const next = [...images, ...valid].slice(0, maxImages);
      onImagesChange(next);
    },
    [images, maxImages, onImagesChange],
  );

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!disabled) addFiles(e.dataTransfer.files);
    },
    [addFiles, disabled],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {canAddMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragOver ? "border-primary bg-accent/30" : "border-border",
            disabled && "opacity-50 pointer-events-none",
          )}
        >
          <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Drag & drop photos of your furniture
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG or WebP · Up to {maxImages} images
          </p>
          <label className="mt-3 inline-block">
            <Button variant="outline" size="sm" asChild disabled={disabled}>
              <span>Browse photos</span>
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              multiple
              onChange={handleChange}
              className="hidden"
              disabled={disabled}
            />
          </label>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img
                src={URL.createObjectURL(file)}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5 text-foreground" />
              </button>
              <span className="absolute bottom-1 left-1 text-[10px] font-mono bg-background/70 px-1.5 py-0.5 rounded text-muted-foreground">
                {i + 1}
              </span>
            </div>
          ))}
          {canAddMore && (
            <label className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-accent/20 transition-colors",
              disabled && "opacity-50 pointer-events-none",
            )}>
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Add more</span>
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                multiple
                onChange={handleChange}
                className="hidden"
                disabled={disabled}
              />
            </label>
          )}
        </div>
      )}

      {/* Helper tips */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Use <strong>2–4 photos</strong> from different angles for best results</p>
          <p>Keep background simple · Good lighting · Show the full object</p>
        </div>
      </div>
    </div>
  );
}
