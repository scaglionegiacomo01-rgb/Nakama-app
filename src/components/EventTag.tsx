import { TAG_STYLE, tagLabel } from "@/lib/event-tags";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EventTag({ tag, className }: { tag: string; className?: string }) {
  const t = useT();
  return (
    <span className={cn("text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full", TAG_STYLE[tag] ?? "bg-secondary", className)}>
      {tagLabel(tag, t)}
    </span>
  );
}
