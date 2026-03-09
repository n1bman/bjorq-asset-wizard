import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useConnection } from "@/contexts/ConnectionContext";
import { apiClient } from "@/services/api-client";
import { Settings, RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react";

export function WizardSettingsCard() {
  const { status, latency, baseUrl, setBaseUrl, refresh } = useConnection();
  const [urlDraft, setUrlDraft] = useState(baseUrl);
  const [testing, setTesting] = useState(false);

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
      </CardContent>
    </Card>
  );
}
