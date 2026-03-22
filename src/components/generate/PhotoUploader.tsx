import { useCallback, useState, useRef } from "react";
import { Camera, X, Plus, Lightbulb } from "lucide-react";
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
  maxImages = 1,
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
            Drag & drop one clear photo of your furniture
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG or WebP - single image input
          </p>
          <label className="mt-3 inline-block">
            <Button variant="outline" size="sm" asChild disabled={disabled}>
              <span>Browse photos</span>
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              multiple={maxImages > 1}
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
          {canAddMore && maxImages > 1 && (
            <label className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-accent/20 transition-colors",
              disabled && "opacity-50 pointer-events-none",
            )}>
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Add more</span>
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                multiple={maxImages > 1}
                onChange={handleChange}
                className="hidden"
                disabled={disabled}
              />
            </label>
          )}
        </div>
      )}

      {/* Photo tips — expanded guidance */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs font-medium text-foreground">Tips for best results</p>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
          <li>Use <strong>one strong hero photo</strong> with a front or 3/4 angle</li>
          <li>Keep the background <strong>clean and simple</strong></li>
          <li>Avoid strong shadows or harsh lighting</li>
          <li>Capture the <strong>full object</strong> in frame</li>
          <li>Even lighting gives the best 3D result</li>
        </ul>
      </div>
    </div>
  );
}
