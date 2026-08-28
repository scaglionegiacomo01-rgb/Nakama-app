import { RANKS, getRank, rangeLabel } from "@/lib/ranks";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Check, Lock } from "lucide-react";

export function RankLegend({ completed, className }: { completed?: number; className?: string }) {
  const t = useT();
  const current = typeof completed === "number" ? getRank(completed) : null;
  const currentIdx = current ? RANKS.findIndex((r) => r.title === current.title) : -1;

  return (
    <div className={cn("flex flex-col gap-[9px]", className)}>
      {RANKS.map((r, i) => {
        const isCurrent = i === currentIdx;
        const reached = typeof completed === "number" && completed >= r.min && !isCurrent;
        const isNext = currentIdx >= 0 && i === currentIdx + 1;

        return (
          <div
            key={r.title}
            className={cn(
              "flex items-center gap-[13px] rounded-[18px] border p-[12px_14px] transition",
              isCurrent
                ? "border-[oklch(0.62_0.24_350/0.5)] bg-[linear-gradient(135deg,oklch(0.40_0.17_5/0.28),oklch(0.34_0.07_320/0.2))] shadow-[0_12px_34px_-16px_oklch(0.40_0.17_5)]"
                : "border-[oklch(0.34_0.032_290/0.5)] bg-card",
              reached && "opacity-65",
            )}
          >
            <span
              className={cn(
                "shrink-0 w-[26px] text-center leading-none",
                isCurrent ? "text-[22px]" : "text-[20px]",
              )}
            >
              {r.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "font-display leading-[1.15] tracking-[-0.03em] whitespace-nowrap truncate",
                  isCurrent ? "text-[18px]" : "text-[16px]",
                )}
              >
                {r.title}
              </div>
              <div
                className={cn(
                  "mt-0.5 text-[11px]",
                  isCurrent ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {rangeLabel(r, i)}
                {isCurrent && ` · ${t("ranks.here")}`}
              </div>
            </div>
            {isCurrent ? (
              <span className="shrink-0 px-[9px] py-1 rounded-full bg-nakama-pink text-[9px] font-bold uppercase tracking-[0.12em] whitespace-nowrap">
                {t("ranks.now")}
              </span>
            ) : reached ? (
              <Check className="w-4 h-4 shrink-0 text-nakama-coral" />
            ) : isNext ? (
              <span className="shrink-0 text-[11px] font-semibold text-nakama-coral whitespace-nowrap">
                +{r.min - (completed ?? 0)}
              </span>
            ) : (
              <Lock className="w-[15px] h-[15px] shrink-0 text-muted-foreground/60" />
            )}
          </div>
        );
      })}
    </div>
  );
}
