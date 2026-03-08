import { IngestForm } from "@/components/ingest/IngestForm";

export default function CatalogIngestPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Catalog Ingest</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add an optimized asset to the curated catalog.
        </p>
      </div>
      <IngestForm />
    </div>
  );
}
