import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ingestAsset } from "@/services/api";
import type { IngestMeta } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

export function IngestForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<IngestMeta>({
    id: "",
    name: "",
    category: "",
    subcategory: "",
    style: "",
    placement: "floor",
  });
  const [hasMappable, setHaMappable] = useState(false);
  const [haDomain, setHaDomain] = useState("");
  const [haKind, setHaKind] = useState("");
  const [jobId, setJobId] = useState("");

  const update = (key: keyof IngestMeta, value: string) =>
    setMeta((m) => ({ ...m, [key]: value }));

  const handleSubmit = async () => {
    if (!meta.id || !meta.name || !meta.category) {
      toast({ title: "Missing fields", description: "ID, name, and category are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload: IngestMeta = { ...meta };
      if (hasMappable) {
        payload.ha = { mappable: true, defaultDomain: haDomain, defaultKind: haKind };
      }
      const res = await ingestAsset(payload, undefined, undefined, jobId || undefined);
      toast({ title: "Asset ingested", description: `Path: ${res.catalogEntry.path}` });
    } catch (e: unknown) {
      toast({ title: "Ingest failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ingest to Catalog</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Asset ID *</Label>
            <Input value={meta.id} onChange={(e) => update("id", e.target.value)} placeholder="google-home-mini" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input value={meta.name} onChange={(e) => update("name", e.target.value)} placeholder="Google Home Mini" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category *</Label>
            <Input value={meta.category} onChange={(e) => update("category", e.target.value)} placeholder="devices" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Subcategory</Label>
            <Input value={meta.subcategory ?? ""} onChange={(e) => update("subcategory", e.target.value)} placeholder="speakers" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Style</Label>
            <Input value={meta.style ?? ""} onChange={(e) => update("style", e.target.value)} placeholder="modern" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Placement</Label>
            <Input value={meta.placement ?? ""} onChange={(e) => update("placement", e.target.value)} placeholder="table" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Job ID (optional, references previous optimize job)</Label>
          <Input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="opt_a1b2c3d4" />
        </div>

        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Switch checked={hasMappable} onCheckedChange={setHaMappable} />
            <Label className="text-sm">HA Mappable</Label>
          </div>
          {hasMappable && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Default Domain</Label>
                <Input value={haDomain} onChange={(e) => setHaDomain(e.target.value)} placeholder="media_player" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Default Kind</Label>
                <Input value={haKind} onChange={(e) => setHaKind(e.target.value)} placeholder="speaker" />
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Ingesting…" : "Ingest Asset"}
        </Button>
      </CardContent>
    </Card>
  );
}
