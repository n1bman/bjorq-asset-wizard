import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
}

export function FileUploader({ onFileSelected, isLoading, accept = ".glb,.gltf" }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) {
        setFile(f);
        onFileSelected(f);
      }
    },
    [onFileSelected]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      onFileSelected(f);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-10 text-center transition-colors",
        dragOver ? "border-primary bg-accent/30" : "border-border",
        isLoading && "opacity-50 pointer-events-none"
      )}
    >
      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
      {file ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Drag & drop a <strong>.glb</strong> or <strong>.gltf</strong> file
          </p>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>Browse files</span>
            </Button>
            <input
              type="file"
              accept={accept}
              onChange={handleChange}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
}
