import { getRank, RANKS, rangeLabel } from "@/lib/ranks";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function RankBadge({
  completed,
  size = "sm",
  className,
  interactive = true,
}: {
  completed: number;
  size?: "xs" | "sm" | "md";
  className?: string;
  interactive?: boolean;
}) {
  const { t } = useI18n();
  const r = getRank(completed);
  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  } as const;

  const pill = (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-ice text-ice-foreground font-medium", sizes[size], interactive && "cursor-pointer hover:opacity-90", className)}>
      <span>{r.emoji}</span>
      <span>{r.title}</span>
    </span>
  );

  if (!interactive) return pill;

  const idx = RANKS.findIndex(x => x.title === r.title);
  const next = RANKS[idx + 1];
  const remaining = next ? next.min - completed : 0;
  const progress = next ? Math.min(100, ((completed - r.min) / (next.min - r.min)) * 100) : 100;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center"
          aria-label={t("ranks.aria_rank", { title: r.title })}
        >
          {pill}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{r.emoji}</span>
          <div>
            <div className="font-display font-bold">{r.title}</div>
            <div className="text-[11px] text-muted-foreground">
              {rangeLabel(RANKS[idx], idx, t)}
            </div>
          </div>
        </div>
        <p className="text-sm italic text-muted-foreground mt-2">"{t(r.descriptionKey)}"</p>
        <div className="mt-3 text-xs text-foreground">
          {t(completed === 1 ? "ranks.currently_completed_one" : "ranks.currently_completed_other", { n: completed })}
        </div>
        {next && (
          <>
            <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-summit" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {t("ranks.until_next", { n: remaining, tripWord: t(remaining === 1 ? "ranks.trip" : "ranks.trips"), title: next.title })}
            </div>
          </>
        )}
        <Link to="/ranks" className="mt-3 inline-block text-xs text-accent hover:underline">{t("ranks.see_all")} →</Link>
      </PopoverContent>
    </Popover>
  );
}
