import { useState } from "react";
import { FileUploader } from "@/components/upload/FileUploader";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { analyzeModel } from "@/services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisResponse } from "@/types/api";

export default function UploadAnalyze() {
  const { toast } = useToast();
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
        </p>
      </div>

      <FileUploader onFileSelected={setFile} isLoading={loading} />

      {file && !result && (
        <Button onClick={handleAnalyze} disabled={loading} className="w-full">
          {loading ? "Analyzing…" : "Analyze Model"}
        </Button>
      )}

      {result && <AnalysisResults data={result.analysis} />}
    </div>
  );
}
