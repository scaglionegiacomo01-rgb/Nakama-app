import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { BEGINNER_CHECKLIST, TOTAL_CHECKLIST_COUNT } from "@/lib/checklist";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export function BeginnerChecklistPanel({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: checklist } = useQuery({
    queryKey: ["checklist", eventId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("trip_checklists")
        .select("*").eq("event_id", eventId).eq("user_id", user!.id).maybeSingle();
      return data as { id: string; progress_percentage: number; ready_status: "preparing"|"ready" } | null;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["checklist-items", checklist?.id],
    enabled: !!checklist?.id,
    queryFn: async () => {
      const { data } = await supabase.from("trip_checklist_items")
        .select("*").eq("checklist_id", checklist!.id);
      return (data ?? []) as { id: string; item_key: string; checked: boolean }[];
    },
  });

  const checkedSet = useMemo(() => new Set((items ?? []).filter(i => i.checked).map(i => i.item_key)), [items]);
  const checkedCount = checkedSet.size;
  const pct = Math.round((checkedCount / TOTAL_CHECKLIST_COUNT) * 100);

  // Auto-update progress + ready status when items change
  useEffect(() => {
    if (!checklist?.id) return;
    const newStatus = checkedCount === TOTAL_CHECKLIST_COUNT ? "ready" : "preparing";
    if (pct !== checklist.progress_percentage || newStatus !== checklist.ready_status) {
      supabase.from("trip_checklists")
        .update({ progress_percentage: pct, ready_status: newStatus })
        .eq("id", checklist.id)
        .then(() => qc.invalidateQueries({ queryKey: ["checklist", eventId, user?.id] }));
    }
  }, [pct, checkedCount, checklist?.id]);

  const ensureChecklist = async () => {
    if (checklist || !user) return checklist;
    const { data, error } = await supabase.from("trip_checklists")
      .insert({ event_id: eventId, user_id: user.id })
      .select().single();
    if (error) { toast.error(error.message); return null; }
    qc.invalidateQueries({ queryKey: ["checklist", eventId, user.id] });
    return data as { id: string };
  };

  const toggle = async (key: string, value: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      const c = checklist ?? await ensureChecklist();
      if (!c) return;
      const existing = (items ?? []).find(i => i.item_key === key);
      if (existing) {
        await supabase.from("trip_checklist_items")
          .update({ checked: value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("trip_checklist_items")
          .insert({ checklist_id: c.id, item_key: key, checked: value });
      }
      qc.invalidateQueries({ queryKey: ["checklist-items", c.id] });
    } finally { setBusy(false); }
  };

  if (!user) return <p className="text-sm text-muted-foreground">{t("assist.sign_in")}</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-ice grid place-items-center text-ice-foreground"><Sparkles className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold">{t("assist.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("assist.subtitle")}</p>
          </div>
          {checklist?.ready_status === "ready" && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-summit text-primary-foreground"><CheckCircle2 className="w-3 h-3" />{t("assist.ready")}</span>}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{t("assist.items_ready", { n: checkedCount, total: TOTAL_CHECKLIST_COUNT })}</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
      </div>

      {BEGINNER_CHECKLIST.map(group => (
        <div key={group.titleKey} className="rounded-2xl border border-border bg-card p-4">
          <h4 className="font-semibold text-sm mb-3">{t(group.titleKey)}</h4>
          <div className="space-y-2">
            {group.items.map(item => {
              const isChecked = checkedSet.has(item.key);
              return (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer rounded-lg p-2 hover:bg-secondary/40">
                  <Checkbox checked={isChecked} disabled={busy} onCheckedChange={(v) => toggle(item.key, !!v)} className="mt-0.5" />
                  <div className="flex-1 text-sm">
                    <div className={isChecked ? "line-through text-muted-foreground" : ""}>{t(item.labelKey)}</div>
                    {item.hintKey && <div className="text-xs text-muted-foreground mt-0.5">{t(item.hintKey)}</div>}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-muted-foreground text-center">
        {t("assist.footer")}
        {busy && <Loader2 className="w-3 h-3 inline ml-1 animate-spin" />}
      </p>
    </div>
  );
}
