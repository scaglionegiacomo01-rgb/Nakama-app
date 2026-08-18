import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Mountain, Flag, AlertTriangle, Bell, RotateCcw, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

type Event = {
  id: string; title: string; meeting_point: string; departure_time: string | null;
  date: string; status: string;
};

type Registration = {
  id: string; user_id: string; status: string;
  transport_status: string | null;
  profile?: { full_name: string | null; username: string | null; phone: string | null; profile_picture_url: string | null } | null;
  car_id?: string | null;
  car_label?: string | null;
};

type Checkin = {
  id: string; user_id: string;
  meeting_point_checked_in: boolean; destination_checked_in: boolean; return_checked_in: boolean;
  meeting_point_checked_in_at: string | null; destination_checked_in_at: string | null; return_checked_in_at: string | null;
  status: "not_checked_in" | "arrived_meeting_point" | "arrived_destination" | "returned" | "absent" | "cancelled";
  marked_by_admin: boolean;
};

const STATUS_META: Record<Checkin["status"], { label: string; cls: string }> = {
  not_checked_in: { label: "Not checked in", cls: "bg-secondary text-foreground" },
  arrived_meeting_point: { label: "At meeting point", cls: "bg-ice text-ice-foreground" },
  arrived_destination: { label: "At the resort", cls: "bg-primary text-primary-foreground" },
  returned: { label: "Back safely", cls: "bg-summit text-primary-foreground" },
  absent: { label: "Absent", cls: "bg-destructive text-destructive-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground" },
};

function StatusBadge({ s }: { s: Checkin["status"] }) {
  const m = STATUS_META[s];
  return <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

function fmtTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function CheckinPanel({ event, isAdmin, isParticipant }: { event: Event; isAdmin: boolean; isParticipant: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "arrived" | "missing" | "late" | "absent" | "cancelled">("all");
  const [search, setSearch] = useState("");

  const { data: myCheckin } = useQuery({
    queryKey: ["my-checkin", event.id, user?.id],
    enabled: !!user && isParticipant,
    queryFn: async () => {
      const { data } = await supabase.from("trip_checkins")
        .select("*").eq("event_id", event.id).eq("user_id", user!.id).maybeSingle();
      return data as unknown as Checkin | null;
    },
  });

  const { data: roll } = useQuery({
    queryKey: ["roll-call", event.id],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: regs } = await supabase.from("event_registrations")
        .select("id, user_id, status, transport_status")
        .eq("event_id", event.id)
        .in("status", ["confirmed", "pending"]);
      const list = (regs ?? []) as Registration[];
      if (list.length === 0) return { regs: [], checkins: new Map<string, Checkin>() };
      const ids = list.map(r => r.user_id);
      const [{ data: profs }, { data: checkins }, { data: cars }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, username, phone, profile_picture_url").in("user_id", ids),
        supabase.from("trip_checkins").select("*").eq("event_id", event.id),
        supabase.from("trip_cars").select("id, driver_user_id, departure_area").eq("event_id", event.id),
      ]);
      const profMap = new Map((profs ?? []).map((p: { user_id: string }) => [p.user_id, p]));
      const carList = (cars ?? []) as unknown as { id: string; driver_user_id: string; departure_area: string }[];
      const checkinMap = new Map<string, Checkin>();
      for (const c of (checkins ?? []) as unknown as Checkin[]) checkinMap.set(c.user_id, c);
      const enriched = list.map(r => ({
        ...r,
        profile: profMap.get(r.user_id) as Registration["profile"],
        car_label: (() => {
          const drives = carList.find(c => c.driver_user_id === r.user_id);
          if (drives) return `Driver · ${drives.departure_area}`;
          return null;
        })(),
      }));
      return { regs: enriched, checkins: checkinMap };
    },
  });

  const counts = useMemo(() => {
    if (!roll) return { total: 0, checkedIn: 0, missing: 0, late: 0, absent: 0, cancelled: 0 };
    const total = roll.regs.filter(r => r.status === "confirmed").length;
    let checkedIn = 0, absent = 0, cancelled = 0;
    for (const r of roll.regs) {
      const c = roll.checkins.get(r.user_id);
      if (c?.status === "absent") absent++;
      else if (c?.status === "cancelled") cancelled++;
      else if (c && (c.meeting_point_checked_in || c.destination_checked_in || c.return_checked_in)) checkedIn++;
    }
    // "Late" = past meeting time and not yet at meeting point
    const meetingMs = meetingTimeMs(event);
    const now = Date.now();
    let late = 0;
    if (meetingMs && now > meetingMs) {
      for (const r of roll.regs) {
        if (r.status !== "confirmed") continue;
        const c = roll.checkins.get(r.user_id);
        if (!c || (!c.meeting_point_checked_in && c.status !== "absent" && c.status !== "cancelled")) late++;
      }
    }
    const missing = Math.max(0, total - checkedIn - absent - cancelled);
    return { total, checkedIn, missing, late, absent, cancelled };
  }, [roll, event]);

  const upsertCheckin = async (patch: Partial<Checkin>) => {
    if (!user) return;
    const base = myCheckin ?? { meeting_point_checked_in: false, destination_checked_in: false, return_checked_in: false };
    const { error } = await supabase.from("trip_checkins").upsert({
      event_id: event.id, user_id: user.id,
      meeting_point_checked_in: base.meeting_point_checked_in,
      destination_checked_in: base.destination_checked_in,
      return_checked_in: base.return_checked_in,
      ...patch,
    }, { onConflict: "event_id,user_id" });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my-checkin", event.id, user.id] });
    qc.invalidateQueries({ queryKey: ["roll-call", event.id] });
    if (patch.meeting_point_checked_in) toast.success("Check-in completed. The organizer knows you're here.");
    else if (patch.destination_checked_in) toast.success("Welcome to the mountain!");
    else if (patch.return_checked_in) toast.success("Glad you're back safely.");
    else if (patch.status === "cancelled") toast.success("You let the crew know — thanks.");
  };

  const adminUpdate = async (userId: string, patch: Partial<Checkin>) => {
    if (!user) return;
    const existing = roll?.checkins.get(userId);
    const { error } = await supabase.from("trip_checkins").upsert({
      event_id: event.id, user_id: userId,
      meeting_point_checked_in: existing?.meeting_point_checked_in ?? false,
      destination_checked_in: existing?.destination_checked_in ?? false,
      return_checked_in: existing?.return_checked_in ?? false,
      marked_by_admin: true, admin_marked_by: user.id,
      ...patch,
    }, { onConflict: "event_id,user_id" });
    if (error) toast.error(error.message);
    else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["roll-call", event.id] }); }
  };

  const resetCheckin = async (userId: string) => {
    if (!confirm("Reset this person's check-in?")) return;
    const existing = roll?.checkins.get(userId);
    if (!existing) return;
    const { error } = await supabase.from("trip_checkins")
      .update({
        meeting_point_checked_in: false, destination_checked_in: false, return_checked_in: false,
        meeting_point_checked_in_at: null, destination_checked_in_at: null, return_checked_in_at: null,
        status: "not_checked_in",
      }).eq("id", existing.id);
    if (error) toast.error(error.message);
    else { toast.success("Reset"); qc.invalidateQueries({ queryKey: ["roll-call", event.id] }); }
  };

  const sendReminders = async () => {
    const { data, error } = await supabase.rpc("send_checkin_reminders", { _event_id: event.id });
    if (error) toast.error(error.message);
    else toast.success(`Reminder sent to ${(data as number) ?? 0} ${(data as number) === 1 ? "person" : "people"}`);
  };

  const filtered = useMemo(() => {
    if (!roll) return [];
    const q = search.trim().toLowerCase();
    return roll.regs.filter(r => {
      const c = roll.checkins.get(r.user_id);
      if (q) {
        const hay = `${r.profile?.full_name ?? ""} ${r.profile?.username ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const meetingMs = meetingTimeMs(event);
      const isLate = meetingMs && Date.now() > meetingMs && (!c?.meeting_point_checked_in) && c?.status !== "absent" && c?.status !== "cancelled";
      switch (filter) {
        case "arrived": return !!(c && (c.meeting_point_checked_in || c.destination_checked_in || c.return_checked_in));
        case "missing": return !c || (!c.meeting_point_checked_in && c.status !== "absent" && c.status !== "cancelled");
        case "late": return !!isLate;
        case "absent": return c?.status === "absent";
        case "cancelled": return c?.status === "cancelled";
        default: return true;
      }
    });
  }, [roll, filter, search, event]);

  return (
    <div className="space-y-6">
      {/* User self check-in card */}
      {isParticipant && user && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-summit/10 border border-primary/30 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Roll call</div>
              <h3 className="font-display font-bold text-xl mt-0.5">{event.title}</h3>
              <div className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />{event.meeting_point}{event.departure_time ? ` · ${event.departure_time}` : ""}
              </div>
            </div>
            <StatusBadge s={myCheckin?.status ?? "not_checked_in"} />
          </div>

          <div className="mt-4 grid sm:grid-cols-3 gap-2">
            <Button size="lg" variant={myCheckin?.meeting_point_checked_in ? "outline" : "default"}
              disabled={!!myCheckin?.meeting_point_checked_in || myCheckin?.status === "cancelled"}
              onClick={() => upsertCheckin({ meeting_point_checked_in: true })}>
              <Flag className="w-4 h-4 mr-1" />
              {myCheckin?.meeting_point_checked_in ? `At meeting · ${fmtTime(myCheckin.meeting_point_checked_in_at)}` : "I'm here"}
            </Button>
            <Button size="lg" variant={myCheckin?.destination_checked_in ? "outline" : "secondary"}
              disabled={!myCheckin?.meeting_point_checked_in || !!myCheckin?.destination_checked_in || myCheckin?.status === "cancelled"}
              onClick={() => upsertCheckin({ destination_checked_in: true })}>
              <Mountain className="w-4 h-4 mr-1" />
              {myCheckin?.destination_checked_in ? `At resort · ${fmtTime(myCheckin.destination_checked_in_at)}` : "I'm at the resort"}
            </Button>
            <Button size="lg" variant={myCheckin?.return_checked_in ? "outline" : "secondary"}
              disabled={!myCheckin?.destination_checked_in || !!myCheckin?.return_checked_in || myCheckin?.status === "cancelled"}
              onClick={() => upsertCheckin({ return_checked_in: true })}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {myCheckin?.return_checked_in ? `Back · ${fmtTime(myCheckin.return_checked_in_at)}` : "I'm back"}
            </Button>
          </div>

          {myCheckin?.status !== "cancelled" && (
            <button onClick={() => { if (confirm("Let the crew know you're not coming anymore?")) upsertCheckin({ status: "cancelled" }); }}
              className="mt-3 text-xs text-muted-foreground hover:text-destructive underline">
              I'm not coming anymore
            </button>
          )}
          {myCheckin?.status === "cancelled" && (
            <div className="mt-3 text-xs text-muted-foreground">You marked yourself as not coming. <button className="underline" onClick={() => upsertCheckin({ status: "not_checked_in" })}>Undo</button></div>
          )}
        </div>
      )}

      {/* Admin roll call */}
      {isAdmin && roll && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Stat label="Confirmed" value={counts.total} />
            <Stat label="Checked in" value={counts.checkedIn} tone="ok" />
            <Stat label="Missing" value={counts.missing} tone={counts.missing > 0 ? "warn" : "ok"} />
            <Stat label="Late" value={counts.late} tone={counts.late > 0 ? "alert" : "ok"} />
            <Stat label="Absent" value={counts.absent + counts.cancelled} tone={counts.absent > 0 ? "alert" : "muted"} />
          </div>

          {counts.late > 0 && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
              <div>{counts.late} {counts.late === 1 ? "person hasn't" : "people haven't"} checked in yet and the meeting time has passed.</div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…" className="h-9" />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="arrived">Arrived</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={sendReminders}><Bell className="w-3.5 h-3.5 mr-1" />Send reminder</Button>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No one matches this filter.</p>}
            {filtered.map(r => {
              const c = roll.checkins.get(r.user_id);
              const status: Checkin["status"] = c?.status ?? "not_checked_in";
              const meetingMs = meetingTimeMs(event);
              const isLate = meetingMs && Date.now() > meetingMs && !c?.meeting_point_checked_in && status !== "absent" && status !== "cancelled";
              return (
                <div key={r.id} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <UserAvatar url={r.profile?.profile_picture_url} name={r.profile?.full_name ?? r.profile?.username} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold truncate">{r.profile?.full_name ?? r.profile?.username ?? "Member"}</div>
                        <StatusBadge s={status} />
                        {isLate && <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">Late</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.profile?.username && `@${r.profile.username} · `}{r.profile?.phone ?? "no phone"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                        {r.transport_status && <span className="capitalize">{r.transport_status.replaceAll("_", " ")}</span>}
                        {r.car_label && <span>· {r.car_label}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                        <Pill on={!!c?.meeting_point_checked_in} label="Meeting" time={c?.meeting_point_checked_in_at} />
                        <Pill on={!!c?.destination_checked_in} label="Resort" time={c?.destination_checked_in_at} />
                        <Pill on={!!c?.return_checked_in} label="Back" time={c?.return_checked_in_at} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => adminUpdate(r.user_id, { meeting_point_checked_in: true })}>Mark arrived</Button>
                    <Button size="sm" variant="outline" onClick={() => adminUpdate(r.user_id, { destination_checked_in: true })}>Mark at resort</Button>
                    <Button size="sm" variant="outline" onClick={() => adminUpdate(r.user_id, { return_checked_in: true })}>Mark back</Button>
                    <Button size="sm" variant="outline" onClick={() => adminUpdate(r.user_id, { status: "absent" })}>Absent</Button>
                    <Button size="sm" variant="outline" onClick={() => adminUpdate(r.user_id, { status: "cancelled" })}>Cancelled</Button>
                    <Button size="sm" variant="ghost" onClick={() => resetCheckin(r.user_id)}><RotateCcw className="w-3.5 h-3.5 mr-1" />Reset</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isParticipant && !isAdmin && (
        <div className="rounded-2xl bg-card border border-border p-5 text-sm text-muted-foreground">
          Join this trip to access the roll call.
        </div>
      )}
    </div>
  );
}

function meetingTimeMs(event: { date: string; departure_time: string | null }): number | null {
  if (!event.departure_time) return null;
  const m = event.departure_time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(event.date);
  d.setHours(+m[1], +m[2], 0, 0);
  return d.getTime();
}

function Stat({ label, value, tone = "muted" }: { label: string; value: number; tone?: "ok" | "warn" | "alert" | "muted" }) {
  const cls = tone === "ok" ? "bg-summit/15 text-summit border-summit/30"
    : tone === "warn" ? "bg-primary/10 text-primary border-primary/30"
    : tone === "alert" ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-secondary border-border";
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

function Pill({ on, label, time }: { on: boolean; label: string; time?: string | null }) {
  return (
    <span className={`px-1.5 py-0.5 rounded-full ${on ? "bg-summit text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
      {label}{on && time ? ` · ${fmtTime(time)}` : ""}
    </span>
  );
}
