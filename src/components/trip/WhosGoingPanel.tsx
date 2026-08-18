import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { RankBadge } from "@/components/RankBadge";
import { PublicProfileDialog } from "@/components/PublicProfileDialog";
import { Car, MapPin } from "lucide-react";

const TRANSPORT_LABEL: Record<string, string> = {
  have_car_will_drive: "Driving",
  have_car_no_drive: "Has car",
  no_car_can_drive: "Can drive others' car",
  no_car_need_seat: "Needs seat",
};

type Row = {
  user_id: string; status: string; transport_status: string | null;
  profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null; snowboard_level: string | null; city: string | null };
  completed?: number;
  ready?: "ready" | "preparing" | null;
  progress?: number | null;
};

export function WhosGoingPanel({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { data: rows } = useQuery({
    queryKey: ["whos-going", eventId, isAdmin],
    queryFn: async () => {
      const statuses = (isAdmin ? ["confirmed","pending"] : ["confirmed"]) as ("confirmed" | "pending")[];
      const { data: regs } = await supabase.from("event_registrations").select("user_id, status, transport_status").eq("event_id", eventId).in("status", statuses);
      const list = (regs ?? []) as Row[];
      if (list.length === 0) return [] as Row[];
      const ids = list.map(r => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, username, profile_picture_url, snowboard_level, city").in("user_id", ids);
      const completedByUser = new Map<string, number>();
      const { data: completed } = await supabase.from("event_registrations").select("user_id, events!inner(status)").in("user_id", ids).eq("status","confirmed").eq("events.status","completed");
      for (const r of (completed ?? []) as { user_id: string }[]) completedByUser.set(r.user_id, (completedByUser.get(r.user_id) ?? 0) + 1);
      const readyByUser = new Map<string, { ready: "ready"|"preparing"; progress: number }>();
      if (isAdmin) {
        const { data: cls } = await supabase.from("trip_checklists").select("user_id, ready_status, progress_percentage").eq("event_id", eventId).in("user_id", ids);
        for (const c of (cls ?? []) as { user_id: string; ready_status: "ready"|"preparing"; progress_percentage: number }[]) {
          readyByUser.set(c.user_id, { ready: c.ready_status, progress: c.progress_percentage });
        }
      }
      return list.map(r => ({
        ...r,
        profile: profs?.find((p: { user_id: string }) => p.user_id === r.user_id) as Row["profile"],
        completed: completedByUser.get(r.user_id) ?? 0,
        ready: readyByUser.get(r.user_id)?.ready ?? null,
        progress: readyByUser.get(r.user_id)?.progress ?? null,
      }));
    },
  });

  const confirmed = (rows ?? []).filter(r => r.status === "confirmed");
  const pending = (rows ?? []).filter(r => r.status === "pending");

  const Card = ({ r }: { r: Row }) => (
    <button onClick={() => { setOpenId(r.user_id); setOpen(true); }} className="text-left rounded-xl bg-card border border-border p-3 hover:border-accent transition flex gap-3 items-start w-full">
      <UserAvatar url={r.profile?.profile_picture_url} name={r.profile?.full_name ?? r.profile?.username} size="md" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{r.profile?.username ? `@${r.profile.username}` : (r.profile?.full_name ?? "Member")}</div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <RankBadge completed={r.completed ?? 0} size="xs" />
          {r.profile?.snowboard_level && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary capitalize">{r.profile.snowboard_level}</span>}
          {isAdmin && r.profile?.snowboard_level === "beginner" && r.ready && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.ready === "ready" ? "bg-summit text-primary-foreground" : "bg-ice text-ice-foreground"}`}>
              {r.ready === "ready" ? "Ready" : `Preparing ${r.progress ?? 0}%`}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
          {r.profile?.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{r.profile.city}</span>}
          {r.transport_status && <span className="inline-flex items-center gap-1"><Car className="w-3 h-3" />{TRANSPORT_LABEL[r.transport_status] ?? r.transport_status}</span>}
        </div>
      </div>
    </button>
  );

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-3">{confirmed.length} confirmed{isAdmin ? ` · ${pending.length} pending` : ""}</div>
      {confirmed.length === 0 && pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Be the first to join.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {confirmed.map(r => <Card key={r.user_id} r={r} />)}
        </div>
      )}
      {isAdmin && pending.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pending (admin only)</div>
          <div className="grid sm:grid-cols-2 gap-2">{pending.map(r => <Card key={r.user_id} r={r} />)}</div>
        </div>
      )}
      <PublicProfileDialog userId={openId} open={open} onOpenChange={setOpen} />
    </div>
  );
}
