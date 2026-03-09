import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useConnection } from "@/contexts/ConnectionContext";
import { apiClient } from "@/services/api-client";
import { Settings, RefreshCw, Wifi, WifiOff, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WizardSettingsCard() {
  const { status, latency, baseUrl, setBaseUrl, refresh } = useConnection();
  const { toast } = useToast();
  const [urlDraft, setUrlDraft] = useState(baseUrl);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSaveUrl = () => {
    setBaseUrl(urlDraft);
  };

  const handleTest = async () => {
    setTesting(true);
    await refresh();
    setTesting(false);
  };

  const handleReset = () => {
    apiClient.resetBaseUrl();
    setUrlDraft(apiClient.baseUrl);
    refresh();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      toast({ title: "Copied", description: "API URL copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const dashboardEndpoints = [
    { method: "GET", path: "/libraries", desc: "List libraries" },
    { method: "GET", path: "/assets/:id/meta", desc: "Asset metadata" },
    { method: "GET", path: "/assets/:id/model", desc: "Asset model GLB" },
    { method: "GET", path: "/assets/:id/thumbnail", desc: "Asset thumbnail" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Wizard Connection</CardTitle>
        </div>
        <CardDescription>Configure connection to the Bjorq Asset Wizard service</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">API Base URL</Label>
          <div className="flex gap-2">
            <Input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="http://localhost:3500"
              className="font-mono text-sm"
            />
            <Button size="sm" variant="secondary" onClick={handleSaveUrl} disabled={urlDraft === baseUrl}>
              Save
            </Button>
          </div>
          <button onClick={handleReset} className="text-xs text-muted-foreground underline hover:text-foreground">
            Reset to auto-detected URL
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "connected" ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <Wifi className="mr-1 h-3 w-3" /> Connected
              </Badge>
            ) : status === "checking" ? (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Checking…
              </Badge>
            ) : (
              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                <WifiOff className="mr-1 h-3 w-3" /> Disconnected
              </Badge>
            )}
            {latency !== null && status === "connected" && (
              <span className="text-xs text-muted-foreground">{latency}ms</span>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={handleTest} disabled={testing}>
            <RefreshCw className={`mr-1 h-3 w-3 ${testing ? "animate-spin" : ""}`} />
            Test
          </Button>
        </div>

        <Separator />

        {/* Dashboard Integration */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-foreground">Dashboard Integration</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure your Bjorq Dashboard to connect to this Wizard API URL:
            </p>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
            <code className="text-xs font-mono text-foreground flex-1 break-all">{baseUrl}</code>
            <Button size="sm" variant="ghost" onClick={handleCopyUrl} className="h-7 w-7 p-0 shrink-0">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Available endpoints:</p>
            <div className="space-y-0.5">
              {dashboardEndpoints.map(ep => (
                <div key={ep.path} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{ep.method}</Badge>
                  <code className="font-mono text-muted-foreground">{ep.path}</code>
                  <span className="text-muted-foreground/70">— {ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
