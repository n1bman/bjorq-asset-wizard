import { useState } from "react";
import { FileUploader } from "@/components/upload/FileUploader";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { analyzeModel } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileBox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisResponse, ImportType } from "@/types/api";

const CONVERSION_FORMATS = ["SketchUp (.skp)", "IFC (.ifc)", "OBJ (.obj)", "FBX (.fbx)", "STEP (.step)"];

export default function UploadAnalyze() {
  const { toast } = useToast();
  const [importType, setImportType] = useState<ImportType>("direct-upload");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await analyzeModel(file);
      setResult(res);
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload & Analyze</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a 3D model to analyze its geometry, materials, and performance.
          Supports direct GLB/GLTF models as well as larger building models and SketchUp-style exports.
        </p>
      </div>

      {/* Import type selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setImportType("direct-upload")}
          className={cn(
            "rounded-lg border p-4 text-left transition-colors",
            importType === "direct-upload"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Upload className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Direct Model</span>
          </div>
          <p className="text-xs text-muted-foreground">GLB / GLTF — ready for analysis and optimization</p>
        </button>

        <button
          onClick={() => setImportType("converted-project")}
          className={cn(
            "rounded-lg border p-4 text-left transition-colors relative",
            importType === "converted-project"
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-border hover:border-muted-foreground/50"
          )}
        >
          <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">Coming soon</Badge>
          <div className="flex items-center gap-2 mb-1">
            <FileBox className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-foreground">Convert Project</span>
          </div>
          <p className="text-xs text-muted-foreground">Building models, room shells, SketchUp exports</p>
        </button>
      </div>

      {/* Conversion info panel */}
      {importType === "converted-project" && (
        <Card>
          <CardContent className="py-5 space-y-3">
            <p className="text-sm text-foreground font-medium">Conversion-based import</p>
            <p className="text-xs text-muted-foreground">
              This path will convert raw model sources to GLB before entering the standard Wizard pipeline.
              After conversion, assets follow the same analyze → optimize → review → save flow and end up
              in the same catalog format (model.glb, thumb.webp, meta.json).
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CONVERSION_FORMATS.map((fmt) => (
                <Badge key={fmt} variant="outline" className="text-xs text-muted-foreground">{fmt}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Conversion backend is not yet available. Use Direct Model for now.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Direct upload flow (unchanged behavior) */}
      {importType === "direct-upload" && (
        <>
          <FileUploader onFileSelected={setFile} isLoading={loading} />

          {file && !result && (
            <Button onClick={handleAnalyze} disabled={loading} className="w-full">
              {loading ? "Analyzing…" : "Analyze Model"}
            </Button>
          )}

          {result && <AnalysisResults data={result.analysis} />}
        </>
      )}
    </div>
  );
}
