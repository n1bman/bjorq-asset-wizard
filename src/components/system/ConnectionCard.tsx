import { useConnection } from "@/contexts/ConnectionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2, Pencil, Check } from "lucide-react";
import { useState } from "react";

export function ConnectionCard() {
  const { status, isConnected, isMockMode, latency, baseUrl, setBaseUrl, refresh } = useConnection();
  const [editing, setEditing] = useState(false);
  const [urlDraft, setUrlDraft] = useState(baseUrl);

  const handleSave = () => {
    setBaseUrl(urlDraft);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Connection</CardTitle>
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className="gap-1"
          >
            {status === "checking" ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Checking</>
            ) : isConnected ? (
              <><Wifi className="h-3 w-3" /> Connected</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Offline</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Backend URL</p>
          {editing ? (
            <div className="flex gap-2">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="http://localhost:3500"
              />
              <Button size="sm" variant="outline" onClick={handleSave} className="h-8 px-2">
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-foreground">{baseUrl}</code>
              <Button size="sm" variant="ghost" onClick={() => { setUrlDraft(baseUrl); setEditing(true); }} className="h-6 w-6 p-0">
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {latency !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Latency</span>
            <span className="text-foreground">{latency} ms</span>
          </div>
        )}

        {isMockMode && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
            Demo mode — using mock data. Connect a backend to use real data.
          </p>
        )}

        <Button variant="outline" size="sm" onClick={refresh} className="w-full">
          Test Connection
        </Button>
      </CardContent>
    </Card>
  );
}
