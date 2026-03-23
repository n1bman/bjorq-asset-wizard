import type { AssetSource, SyncStatus, OptimizationStatus, IngestStatus, ImportType, ConversionStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const sourceConfig: Record<AssetSource, { label: string; className: string }> = {
  uploaded:  { label: "Uploaded",  className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  optimized: { label: "Optimized", className: "bg-primary/15 text-primary border-primary/30" },
  catalog:   { label: "Catalog",   className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  synced:    { label: "Synced",    className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  wizard:    { label: "Wizard",    className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  imported:  { label: "Imported",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

const syncConfig: Record<SyncStatus, { label: string; dot: string }> = {
  not_synced: { label: "Not synced", dot: "bg-muted-foreground" },
  pending:    { label: "Pending",    dot: "bg-amber-300" },
  syncing:    { label: "Syncing",    dot: "bg-yellow-400" },
  synced:     { label: "Synced",     dot: "bg-emerald-400" },
  error:      { label: "Error",      dot: "bg-destructive" },
};

export function SourceBadge({ source }: { source?: AssetSource }) {
  if (!source) return null;
  const cfg = sourceConfig[source];
  if (!cfg) return null;
  return <Badge variant="outline" className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>;
}

export function SyncDot({ status }: { status?: SyncStatus }) {
  if (!status) return null;
  const cfg = syncConfig[status];
  if (!cfg) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title={cfg.label}>
      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function OptimizationBadge({ status }: { status?: OptimizationStatus }) {
  if (!status) return null;
  const variants: Record<OptimizationStatus, string> = {
    not_optimized: "text-muted-foreground",
    optimizing: "text-yellow-400",
    optimized: "text-primary",
    error: "text-destructive",
  };
  const labels: Record<OptimizationStatus, string> = {
    not_optimized: "Not optimized",
    optimizing: "Optimizing…",
    optimized: "Optimized",
    error: "Error",
  };
  return <span className={cn("text-xs", variants[status])}>{labels[status]}</span>;
}

export function IngestBadge({ status }: { status?: IngestStatus }) {
  if (!status || status === "not_ingested") return null;
  const labels: Record<IngestStatus, string> = {
    not_ingested: "",
    ingesting: "Ingesting…",
    ingested: "Ingested",
    error: "Ingest error",
  };
  return <Badge variant="secondary" className="text-xs">{labels[status]}</Badge>;
}

const importTypeConfig: Record<ImportType, { label: string; className: string }> = {
  "direct-upload":     { label: "Direct Upload",     className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  "converted-project": { label: "Converted Project", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  catalog:             { label: "Catalog",            className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  synced:              { label: "Synced",             className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

export function ImportTypeBadge({ importType }: { importType?: ImportType }) {
  if (!importType) return null;
  const cfg = importTypeConfig[importType];
  return <Badge variant="outline" className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>;
}

const conversionConfig: Record<ConversionStatus, { label: string; className: string }> = {
  not_converted: { label: "Not converted", className: "text-muted-foreground" },
  converting:    { label: "Converting…",   className: "text-amber-400" },
  converted:     { label: "Converted",     className: "text-primary" },
  error:         { label: "Conversion error", className: "text-destructive" },
};

export function ConversionBadge({ status }: { status?: ConversionStatus }) {
  if (!status || status === "not_converted") return null;
  const cfg = conversionConfig[status];
  return <span className={cn("text-xs", cfg.className)}>{cfg.label}</span>;
}
