import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  categories: string[];
  active: string | null;
  onSelect: (cat: string | null) => void;
}

export function CategoryFilter({ categories, active, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={active === null ? "default" : "outline"}
        onClick={() => onSelect(null)}
      >
        All
      </Button>
      {categories.map((c) => (
        <Button
          key={c}
          size="sm"
          variant={active === c ? "default" : "outline"}
          onClick={() => onSelect(c)}
        >
          {c}
        </Button>
      ))}
    </div>
  );
}
