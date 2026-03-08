import type { VersionResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VersionInfo({ data }: { data: VersionResponse }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Version</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="flex justify-between">
            <span className="text-muted-foreground capitalize">{key}</span>
            <span className="text-foreground font-mono text-xs">{val}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
