import type { Recommendation } from "@/types/api";
import { AlertTriangle, Info } from "lucide-react";

export function RecommendationList({ items }: { items: Recommendation[] }) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-foreground">Recommendations</h4>
      <ul className="space-y-1.5">
        {items.map((r, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm rounded-md bg-muted/50 px-3 py-2"
          >
            {r.severity === "warning" ? (
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <span className="text-foreground">{r.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
