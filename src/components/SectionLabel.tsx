import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** Eyebrow label above a section — replaces the old `<h2 class="uppercase">` pattern. */
export function SectionLabel({
  children,
  tone = "muted",
  action,
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "coral";
  action?: { label: string; to: string };
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.22em] whitespace-nowrap",
          tone === "coral" ? "text-nakama-coral" : "text-muted-foreground",
        )}
      >
        {children}
      </span>
      {action && (
        <Link
          to={action.to}
          className="text-xs font-semibold text-nakama-coral hover:underline shrink-0"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function StatTile({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[18px] bg-card border border-[oklch(0.34_0.032_290/0.5)] px-3.5 py-3.5",
        className,
      )}
    >
      <div className="font-display text-[24px] leading-[1.1] tracking-[-0.04em] truncate">
        {value}
      </div>
      <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap truncate">
        {label}
      </div>
    </div>
  );
}
