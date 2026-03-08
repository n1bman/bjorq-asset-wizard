import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ok: { label: "OK", variant: "default" },
  optimization_recommended: { label: "Optimize", variant: "secondary" },
  optimization_strongly_recommended: { label: "Needs Work", variant: "destructive" },
};

export function PerformanceBadge({ status }: { status: string }) {
  const info = statusMap[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
