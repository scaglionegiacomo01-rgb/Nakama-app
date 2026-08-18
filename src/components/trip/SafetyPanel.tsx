import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";

type Event = { id: string; status: string; safety_meeting_point_ok: boolean; safety_destination_ok: boolean; safety_return_ok: boolean };
type Checkin = { id: string; user_id: string; meeting_point_checked_in: boolean; destination_checked_in: boolean; return_checked_in: boolean };

export function SafetyPanel({ event, isAdmin, isParticipant }: { event: Event; isAdmin: boolean; isParticipant: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: myCheckin } = useQuery({
    queryKey: ["my-checkin", event.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("trip_checkins").select("*").eq("event_id", event.id).eq("user_id", user!.id).maybeSingle();
      return data as unknown as Checkin | null;
    },
  });

  const { data: allCheckins } = useQuery({
    queryKey: ["checkins", event.id],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("trip_checkins").select("*").eq("event_id", event.id);
      const list = (data ?? []) as unknown as Checkin[];
      if (list.length === 0) return list;
      const ids = list.map(c => c.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, username, profile_picture_url").in("user_id", ids);
      return list.map(c => ({ ...c, profile: profs?.find((p: { user_id: string }) => p.user_id === c.user_id) }));
    },
  });

  const upsertCheckin = async (patch: Partial<Checkin>) => {
    if (!user) return;
    const { error } = await supabase.from("trip_checkins").upsert({ event_id: event.id, user_id: user.id, ...(myCheckin ?? {}), ...patch }, { onConflict: "event_id,user_id" });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my-checkin", event.id, user.id] });
    qc.invalidateQueries({ queryKey: ["checkins", event.id] });
  };

  const setAdminFlag = async (col: "safety_meeting_point_ok" | "safety_destination_ok" | "safety_return_ok", val: boolean) => {
    const patch: Partial<Record<typeof col, boolean>> = { [col]: val };
    const { error } = await supabase.from("events").update(patch).eq("id", event.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["event", event.id] });
  };

  const completeTrip = async () => {
    // Safety integration: warn if check-ins are incomplete
    let warning = "";
    if (isAdmin) {
      const { data: regs } = await supabase.from("event_registrations").select("user_id, status").eq("event_id", event.id).eq("status", "confirmed");
      const ids = (regs ?? []).map(r => r.user_id);
      if (ids.length > 0) {
        const { data: cs } = await supabase.from("trip_checkins").select("user_id, meeting_point_checked_in, destination_checked_in, return_checked_in, status").eq("event_id", event.id);
        const cmap = new Map<string, { meeting_point_checked_in: boolean; destination_checked_in: boolean; return_checked_in: boolean; status: string }>();
        for (const c of (cs ?? []) as unknown as Array<{ user_id: string; meeting_point_checked_in: boolean; destination_checked_in: boolean; return_checked_in: boolean; status: string }>) cmap.set(c.user_id, c);
        let neverCheckedIn = 0, atResortNotBack = 0, stillMissing = 0;
        for (const uid of ids) {
          const c = cmap.get(uid);
          if (!c) { neverCheckedIn++; stillMissing++; continue; }
          if (c.status === "absent" || c.status === "cancelled") continue;
          if (!c.meeting_point_checked_in) { neverCheckedIn++; stillMissing++; }
          if (c.destination_checked_in && !c.return_checked_in) atResortNotBack++;
        }
        if (neverCheckedIn || atResortNotBack || stillMissing) {
          warning = "Some participants are not fully accounted for. Please confirm before completing the trip.\n\n";
          if (neverCheckedIn) warning += `• ${neverCheckedIn} never checked in\n`;
          if (atResortNotBack) warning += `• ${atResortNotBack} reached the resort but didn't check back\n`;
        }
      }
    }
    const msg = warning ? `${warning}\nMark this trip as completed?` : "Mark this trip as completed? Confirmed users will see it in their Passport.";
    if (!confirm(msg)) return;
    const { error } = await supabase.from("events").update({ status: "completed" }).eq("id", event.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Trip completed");
    qc.invalidateQueries({ queryKey: ["event", event.id] });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-summit/10 border border-summit/30 p-5">
        <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="w-4 h-4" /> Nobody gets left behind</div>
        <p className="mt-2 text-sm">Stay with your assigned group, respect the meeting times, and tell the organizer if you leave or split from the group.</p>
      </div>

      {isParticipant && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <h3 className="font-display font-bold mb-3">My check-ins</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!myCheckin?.meeting_point_checked_in} onCheckedChange={v => upsertCheckin({ meeting_point_checked_in: !!v })} />I'm at the meeting point</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!myCheckin?.destination_checked_in} onCheckedChange={v => upsertCheckin({ destination_checked_in: !!v })} />I'm at the resort</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!myCheckin?.return_checked_in} onCheckedChange={v => upsertCheckin({ return_checked_in: !!v })} />I'm back</label>
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="rounded-2xl bg-card border border-border p-5">
            <h3 className="font-display font-bold mb-3">Organizer checklist</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={event.safety_meeting_point_ok} onCheckedChange={v => setAdminFlag("safety_meeting_point_ok", !!v)} />Everyone arrived at meeting point</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={event.safety_destination_ok} onCheckedChange={v => setAdminFlag("safety_destination_ok", !!v)} />Everyone arrived at destination</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={event.safety_return_ok} onCheckedChange={v => setAdminFlag("safety_return_ok", !!v)} />Everyone back at final meeting point</label>
            </div>
            {event.status !== "completed" && (
              <Button onClick={completeTrip} className="mt-4 w-full"><CheckCircle2 className="w-4 h-4 mr-1" />Mark trip completed</Button>
            )}
            {event.status === "completed" && <div className="mt-4 text-sm text-summit font-semibold">Trip completed ✓</div>}
          </div>

          <div className="rounded-2xl bg-card border border-border p-5">
            <h3 className="font-display font-bold mb-3">Crew check-ins ({(allCheckins ?? []).length})</h3>
            {(allCheckins ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No check-ins yet.</p> : (
              <div className="space-y-2">
                {(allCheckins as (Checkin & { profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null } })[]).map(c => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <UserAvatar url={c.profile?.profile_picture_url} name={c.profile?.full_name ?? c.profile?.username} size="sm" />
                    <div className="flex-1 min-w-0 truncate">{c.profile?.username ? `@${c.profile.username}` : (c.profile?.full_name ?? "Member")}</div>
                    <div className="flex gap-1 text-[10px]">
                      <Pill on={c.meeting_point_checked_in}>Meet</Pill>
                      <Pill on={c.destination_checked_in}>Resort</Pill>
                      <Pill on={c.return_checked_in}>Back</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Pill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={`px-1.5 py-0.5 rounded-full ${on ? "bg-summit text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{children}</span>;
}
