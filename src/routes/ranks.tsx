import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RankLegend } from "@/components/RankLegend";
import { getRank } from "@/lib/ranks";
import { Award } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SectionLabel } from "@/components/SectionLabel";

export const Route = createFileRoute("/ranks")({ component: RanksPage });

function RanksPage() {
  const { user } = useAuth();
  const t = useT();

  const { data: completed } = useQuery({
    queryKey: ["completed-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("event_id, events(status)")
        .eq("user_id", user!.id)
        .eq("status", "confirmed");
      const rows = (data ?? []) as unknown as { events: { status: string } | null }[];
      return rows.filter((r) => r.events?.status === "completed").length;
    },
  });

  const r = typeof completed === "number" ? getRank(completed) : null;
  const progress =
    r && r.next ? Math.min(100, ((completed! - r.min) / (r.next - r.min)) * 100) : 100;
  const remaining = r && r.next ? r.next - completed! : 0;

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-10 md:pt-10 md:max-w-6xl">
      <div className="relative overflow-hidden rounded-[26px] border border-[oklch(0.62_0.24_350/0.3)] p-5 md:p-8">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.40 0.17 5), oklch(0.34 0.07 320) 60%, oklch(0.26 0.030 295))",
          }}
        />
        <div className="relative text-primary-foreground">
          <div className="inline-flex items-center gap-[7px] text-[9.5px] font-bold uppercase tracking-[0.22em] opacity-85 whitespace-nowrap">
            <Award className="w-[13px] h-[13px]" /> {t("ranks.title")}
          </div>
          {r && (
            <>
              <div className="mt-2.5 flex items-center gap-3.5">
                <div className="text-[40px] leading-none shrink-0">{r.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] opacity-85 whitespace-nowrap">
                    {t("ranks.your_rank")}
                  </div>
                  <div className="mt-1 font-display text-[28px] leading-[1.02] tracking-[-0.045em] whitespace-nowrap truncate">
                    {r.title}
                  </div>
                </div>
              </div>
              {r.next && r.nextTitle ? (
                <>
                  <div className="mt-4 h-[7px] rounded-full bg-[rgba(11,15,18,.35)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-foreground transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-[9px] text-xs opacity-90">
                    {t("ranks.until_next", {
                      n: remaining,
                      tripWord: remaining === 1 ? t("ranks.trip") : t("ranks.trips"),
                      title: r.nextTitle,
                    })}{" "}
                    · {completed} {completed === 1 ? t("ranks.trip") : t("ranks.trips")}
                  </p>
                </>
              ) : (
                <p className="mt-4 text-xs opacity-90">
                  {completed} {t("ranks.trips_completed")}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <section className="mt-5">
        <SectionLabel>{t("ranks.all_ranks")}</SectionLabel>
        <div className="mt-2.5">
          <RankLegend completed={completed} />
        </div>
      </section>

      <div className="mt-4 rounded-[18px] border border-[oklch(0.34_0.032_290/0.55)] bg-card p-[14px_16px] text-center">
        <p className="font-display text-base tracking-[-0.03em]">{t("ranks.closing_title")}</p>
        <p className="mt-[5px] text-[11.5px] text-muted-foreground">
          {t("ranks.closing_subtitle")}
        </p>
        <Link to="/trips" className="inline-block mt-3 text-sm text-accent hover:underline">
          {t("ranks.explore_trips")} →
        </Link>
      </div>
    </div>
  );
}
