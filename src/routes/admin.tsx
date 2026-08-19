import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, Users, Bell, Camera, Download, Car, ClipboardCheck,
  LayoutDashboard, CalendarDays, UserCog, ShieldCheck, AlertTriangle, RotateCcw,
  CheckCircle2, XCircle, Send,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { PublicProfileDialog } from "@/components/PublicProfileDialog";
import { EVENT_TAGS } from "@/lib/event-tags";
import { EventTag } from "@/components/EventTag";

export const Route = createFileRoute("/admin")({ component: AdminPage });

// ---------- Helpers ----------
const STATUSES = ["pending", "confirmed", "waitlisted", "rejected", "cancelled"] as const;
const CHECKIN_LABELS: Record<string, string> = {
  not_checked_in: "Not checked in",
  arrived_meeting_point: "At meeting point",
  arrived_destination: "At resort",
  returned: "Back safely",
  absent: "Absent",
  cancelled: "Cancelled",
};

function toCSV(rows: Record<string, unknown>[], headers: string[]) {
  const head = headers.join(",");
  const body = rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`).join(",")).join("\n");
  return head + "\n" + body;
}
function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---------- Main ----------
function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    else if (!loading && user && !isAdmin) { toast.error("Admin access required"); navigate({ to: "/" }); }
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;
  if (!user || !isAdmin) return null;

  return <AdminPageInner userId={user.id} />;
}

function AdminPageInner({ userId }: { userId: string }) {
  const [tab, setTab] = useState("overview");
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5" />Admin</div>
      <h1 className="text-3xl md:text-4xl font-bold mt-1">Operations dashboard</h1>
      <p className="text-muted-foreground mt-1">Run trips, keep the crew safe, and make sure nobody gets left behind.</p>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex flex-nowrap whitespace-nowrap">
            <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="trips"><CalendarDays className="w-4 h-4 mr-1" />Trips</TabsTrigger>
            <TabsTrigger value="regs"><Users className="w-4 h-4 mr-1" />Registrations</TabsTrigger>
            <TabsTrigger value="carpool"><Car className="w-4 h-4 mr-1" />Carpool</TabsTrigger>
            <TabsTrigger value="rollcall"><ClipboardCheck className="w-4 h-4 mr-1" />Roll call</TabsTrigger>
            <TabsTrigger value="gallery"><Camera className="w-4 h-4 mr-1" />Gallery</TabsTrigger>
            <TabsTrigger value="users"><UserCog className="w-4 h-4 mr-1" />Users</TabsTrigger>
            <TabsTrigger value="notifs"><Bell className="w-4 h-4 mr-1" />Notifications</TabsTrigger>
            <TabsTrigger value="exports"><Download className="w-4 h-4 mr-1" />Exports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6"><OverviewSection onJump={setTab} /></TabsContent>
        <TabsContent value="trips" className="mt-6"><TripsSection userId={userId} /></TabsContent>
        <TabsContent value="regs" className="mt-6"><RegistrationsSection /></TabsContent>
        <TabsContent value="carpool" className="mt-6"><CarpoolSection /></TabsContent>
        <TabsContent value="rollcall" className="mt-6"><RollCallSection /></TabsContent>
        <TabsContent value="gallery" className="mt-6"><GalleryShortcut /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersSection /></TabsContent>
        <TabsContent value="notifs" className="mt-6"><NotificationsSection /></TabsContent>
        <TabsContent value="exports" className="mt-6"><ExportsSection /></TabsContent>
      </Tabs>
    </div>
  );
}


// ---------- Overview ----------
function OverviewSection({ onJump }: { onJump: (tab: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: stats } = useQuery({
    queryKey: ["admin-overview-stats"],
    queryFn: async () => {
      const [u, e, eUp, regPending, regConfirmed, mediaPending, seatPending, notifsUnread] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published").gte("date", today),
        supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("trip_media").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("seat_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("admin_notifications").select("*", { count: "exact", head: true }).eq("read", false),
      ]);
      // Missing check-ins: confirmed regs for trips happening today/tomorrow without checkin
      const inTwoDays = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      const { data: activeEvents } = await supabase.from("events").select("id").eq("status", "published").gte("date", today).lte("date", inTwoDays);
      const activeIds = (activeEvents ?? []).map(x => x.id);
      let missing = 0;
      if (activeIds.length) {
        const { data: regs } = await supabase.from("event_registrations").select("user_id, event_id").in("event_id", activeIds).eq("status", "confirmed");
        const { data: chk } = await supabase.from("trip_checkins").select("user_id, event_id, meeting_point_checked_in, status").in("event_id", activeIds);
        const key = (a: { user_id: string; event_id: string }) => `${a.event_id}:${a.user_id}`;
        const done = new Set((chk ?? []).filter(c => c.meeting_point_checked_in || ["absent", "cancelled"].includes(c.status as string)).map(key));
        missing = (regs ?? []).filter(r => !done.has(key(r))).length;
      }
      return {
        users: u.count ?? 0, published: e.count ?? 0, upcoming: eUp.count ?? 0,
        regPending: regPending.count ?? 0, regConfirmed: regConfirmed.count ?? 0,
        mediaPending: mediaPending.count ?? 0, seatPending: seatPending.count ?? 0,
        notifs: notifsUnread.count ?? 0, missing,
      };
    },
  });

  const cards = [
    { label: "Total users", value: stats?.users, icon: Users },
    { label: "Published trips", value: stats?.published, icon: CalendarDays },
    { label: "Upcoming trips", value: stats?.upcoming, icon: CalendarDays },
    { label: "Pending registrations", value: stats?.regPending, icon: Users, warn: !!stats?.regPending },
    { label: "Confirmed participants", value: stats?.regConfirmed, icon: CheckCircle2 },
    { label: "Pending gallery uploads", value: stats?.mediaPending, icon: Camera, warn: !!stats?.mediaPending },
    { label: "Pending seat requests", value: stats?.seatPending, icon: Car, warn: !!stats?.seatPending },
    { label: "Missing check-ins (next 48h)", value: stats?.missing, icon: AlertTriangle, warn: !!stats?.missing },
    { label: "Unread admin notifications", value: stats?.notifs, icon: Bell, warn: !!stats?.notifs },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.warn ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide"><c.icon className="w-3.5 h-3.5" />{c.label}</div>
            <div className="text-3xl font-bold mt-1">{c.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold">Quick actions</h2>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <QuickAction onJump={onJump} tab="trips" icon={Plus} label="Create / manage trips" />
        <QuickAction onJump={onJump} tab="regs" icon={Users} label="Registrations" />
        <QuickAction onJump={onJump} tab="carpool" icon={Car} label="Carpool" />
        <QuickAction onJump={onJump} tab="rollcall" icon={ClipboardCheck} label="Roll call" />
        <Link to="/admin/gallery" className="rounded-xl border border-border bg-card hover:bg-secondary p-3 text-sm font-medium inline-flex items-center gap-2"><Camera className="w-4 h-4" />Gallery moderation</Link>
        <QuickAction onJump={onJump} tab="users" icon={UserCog} label="Users" />
        <QuickAction onJump={onJump} tab="exports" icon={Download} label="Exports" />
        <QuickAction onJump={onJump} tab="notifs" icon={Bell} label="Notifications" />
      </div>
    </div>
  );
}
function QuickAction({ tab, icon: Icon, label, onJump }: { tab: string; icon: React.ComponentType<{ className?: string }>; label: string; onJump: (tab: string) => void }) {
  return (
    <button onClick={() => onJump(tab)} className="rounded-xl border border-border bg-card hover:bg-secondary p-3 text-sm font-medium inline-flex items-center gap-2 text-left">
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}


// ---------- Trips (CRUD) ----------
type EventInput = {
  title: string; destination: string; date: string; meeting_point: string;
  departure_time: string; return_time: string; type: Database["public"]["Enums"]["event_type"]; difficulty: Database["public"]["Enums"]["event_difficulty"];
  max_participants: number; price_estimate: number; lunch_plan: string;
  rental_available: boolean; required_equipment: string; description: string;
  safety_notes: string; status: Database["public"]["Enums"]["event_status"]; organizer_name: string; tags: string[];
  location_name: string; resort_name: string; latitude: number | null; longitude: number | null;
};
const blankEvent: EventInput = {
  title: "", destination: "", date: "", meeting_point: "",
  departure_time: "08:00", return_time: "19:00", type: "snowboard", difficulty: "easy",
  max_participants: 10, price_estimate: 0, lunch_plan: "Packed lunch",
  rental_available: false, required_equipment: "", description: "",
  safety_notes: "", status: "draft", organizer_name: "", tags: [],
  location_name: "", resort_name: "", latitude: null, longitude: null,
};

// Free OpenStreetMap geocoder — no API key. Used by admins to fill in trip
// coordinates from the destination name so the Passport map can plot pins.
async function geocodeDestination(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const results = (await res.json()) as { lat: string; lon: string }[];
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

function TripsSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; form: EventInput } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const lookupCoordinates = async () => {
    if (!editing?.form.destination) { toast.error("Enter a destination first"); return; }
    setGeocoding(true);
    try {
      const coords = await geocodeDestination(editing.form.destination);
      if (!coords) { toast.error("No coordinates found for that destination"); return; }
      setEditing(cur => cur && { ...cur, form: { ...cur.form, latitude: coords.lat, longitude: coords.lng } });
      toast.success("Coordinates found");
    } catch {
      toast.error("Lookup failed, try again");
    } finally {
      setGeocoding(false);
    }
  };

  const { data: events } = useQuery({
    queryKey: ["admin-events-all"],
    queryFn: async () => (await supabase.from("events").select("*").order("date", { ascending: false })).data ?? [],
  });

  const save = async () => {
    if (!editing) return;
    const { id, form } = editing;
    const payload = { ...form, organizer_id: userId };
    const { error } = id
      ? await supabase.from("events").update(payload).eq("id", id)
      : await supabase.from("events").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(id ? "Trip updated" : "Trip created"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); }
  };
  const setStatus = async (id: string, status: EventInput["status"]) => {
    const { error } = await supabase.from("events").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-events-all"] }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold">All trips ({events?.length ?? 0})</h2>
        <Button onClick={() => setEditing({ form: blankEvent })}><Plus className="w-4 h-4 mr-1" />New trip</Button>
      </div>

      <div className="mt-4 space-y-3">
        {events?.map(e => (
          <div key={e.id} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-bold">{e.title}</div>
                <div className="text-sm text-muted-foreground">{e.destination} · {new Date(e.date).toLocaleDateString()}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-xs capitalize">{e.status}</span>
                  {(e.tags as string[] | null ?? []).slice(0, 4).map(t => <EventTag key={t} tag={t} />)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={e.status} onValueChange={(v: EventInput["status"]) => setStatus(e.id, v)}>
                  <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{(["draft", "published", "cancelled", "completed"] as const).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
                <Link to="/admin/events/$id" params={{ id: e.id }}><Button size="sm" variant="outline"><Users className="w-4 h-4 mr-1" />Details</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => setEditing({ id: e.id, form: { ...blankEvent, ...e, tags: (e.tags as string[] | null) ?? [] } as EventInput })}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        ))}
        {events && events.length === 0 && <p className="text-muted-foreground">No trips yet. Create the first one.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit trip" : "New trip"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <F label="Title"><Input value={editing.form.title} onChange={e => setEditing({ ...editing, form: { ...editing.form, title: e.target.value } })} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Destination"><Input value={editing.form.destination} onChange={e => setEditing({ ...editing, form: { ...editing.form, destination: e.target.value } })} /></F>
                <F label="Date"><Input type="date" value={editing.form.date} onChange={e => setEditing({ ...editing, form: { ...editing.form, date: e.target.value } })} /></F>
                <F label="Meeting point"><Input value={editing.form.meeting_point} onChange={e => setEditing({ ...editing, form: { ...editing.form, meeting_point: e.target.value } })} /></F>
                <F label="Organizer name"><Input value={editing.form.organizer_name} onChange={e => setEditing({ ...editing, form: { ...editing.form, organizer_name: e.target.value } })} /></F>
                <F label="Departure time"><Input value={editing.form.departure_time} onChange={e => setEditing({ ...editing, form: { ...editing.form, departure_time: e.target.value } })} /></F>
                <F label="Return time"><Input value={editing.form.return_time} onChange={e => setEditing({ ...editing, form: { ...editing.form, return_time: e.target.value } })} /></F>
                <F label="Max participants"><Input type="number" value={editing.form.max_participants} onChange={e => setEditing({ ...editing, form: { ...editing.form, max_participants: +e.target.value } })} /></F>
                <F label="Price estimate (€)"><Input type="number" value={editing.form.price_estimate} onChange={e => setEditing({ ...editing, form: { ...editing.form, price_estimate: +e.target.value } })} /></F>
                <F label="Type"><Select value={editing.form.type} onValueChange={(v: EventInput["type"]) => setEditing({ ...editing, form: { ...editing.form, type: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["snowboard", "mountain_walk", "skate", "surf"] as const).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></F>
                <F label="Difficulty"><Select value={editing.form.difficulty} onValueChange={(v: EventInput["difficulty"]) => setEditing({ ...editing, form: { ...editing.form, difficulty: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["easy", "moderate", "hard", "expert"] as const).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></F>
                <F label="Status"><Select value={editing.form.status} onValueChange={(v: EventInput["status"]) => setEditing({ ...editing, form: { ...editing.form, status: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["draft", "published", "cancelled", "completed"] as const).map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select></F>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Label className="text-xs">Map coordinates</Label>
                  <Button type="button" size="sm" variant="outline" onClick={lookupCoordinates} disabled={geocoding}>
                    {geocoding ? "Looking up…" : "Find from destination"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Latitude"><Input type="number" step="any" value={editing.form.latitude ?? ""} onChange={e => setEditing({ ...editing, form: { ...editing.form, latitude: e.target.value === "" ? null : +e.target.value } })} /></F>
                  <F label="Longitude"><Input type="number" step="any" value={editing.form.longitude ?? ""} onChange={e => setEditing({ ...editing, form: { ...editing.form, longitude: e.target.value === "" ? null : +e.target.value } })} /></F>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Powers the pin on members' Passport map. "Find from destination" looks it up automatically — you can still fine-tune it by hand.</p>
              </div>
              <F label="Lunch plan"><Input value={editing.form.lunch_plan} onChange={e => setEditing({ ...editing, form: { ...editing.form, lunch_plan: e.target.value } })} /></F>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={editing.form.rental_available} onCheckedChange={(v) => setEditing({ ...editing, form: { ...editing.form, rental_available: !!v } })} />Rental available on site</label>
              <F label="Required equipment"><Textarea value={editing.form.required_equipment} onChange={e => setEditing({ ...editing, form: { ...editing.form, required_equipment: e.target.value } })} /></F>
              <F label="Description"><Textarea rows={4} value={editing.form.description} onChange={e => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })} /></F>
              <F label="Safety notes"><Textarea value={editing.form.safety_notes} onChange={e => setEditing({ ...editing, form: { ...editing.form, safety_notes: e.target.value } })} /></F>
              <div>
                <Label className="mb-1.5 block text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TAGS.map(t => {
                    const on = editing.form.tags.includes(t);
                    return (
                      <button type="button" key={t} onClick={() => setEditing({ ...editing, form: { ...editing.form, tags: on ? editing.form.tags.filter(x => x !== t) : [...editing.form.tags, t] } })}
                        className={`transition ${on ? "ring-2 ring-primary rounded-full" : "opacity-60 hover:opacity-100"}`}>
                        <EventTag tag={t} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={save} className="w-full">Save trip</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-xs">{label}</Label>{children}</div>;
}

// ---------- Trip picker (shared) ----------
function useTripList() {
  return useQuery({
    queryKey: ["admin-trip-picker"],
    queryFn: async () => (await supabase.from("events").select("id, title, destination, date, status").order("date", { ascending: false })).data ?? [],
  });
}
function TripPicker({ value, onChange, label = "Select trip" }: { value: string | null; onChange: (v: string) => void; label?: string }) {
  const { data } = useTripList();
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full md:w-96"><SelectValue placeholder="Pick a trip…" /></SelectTrigger>
        <SelectContent>{(data ?? []).map(e => (
          <SelectItem key={e.id} value={e.id}>{e.title} — {new Date(e.date).toLocaleDateString()} <span className="text-muted-foreground">({e.status})</span></SelectItem>
        ))}</SelectContent>
      </Select>
    </div>
  );
}

// ---------- Registrations ----------
function RegistrationsSection() {
  const qc = useQueryClient();
  const [tripId, setTripId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: regs } = useQuery({
    queryKey: ["admin-regs-section", tripId, filter],
    enabled: !!tripId,
    queryFn: async () => {
      let q = supabase.from("event_registrations").select("*").eq("event_id", tripId!).order("created_at");
      if (filter !== "all") q = q.eq("status", filter as Database["public"]["Enums"]["registration_status"]);
      const { data: regs } = await q;
      if (!regs?.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", regs.map(r => r.user_id));
      return regs.map(r => ({ ...r, profile: profiles?.find(p => p.user_id === r.user_id) }));
    },
  });

  const update = async (id: string, status: Database["public"]["Enums"]["registration_status"]) => {
    const prev = regs?.find(r => r.id === id);
    const isConfirmTransition = status === "confirmed" && prev && (prev.status === "pending" || prev.status === "waitlisted");
    const { error } = await supabase.from("event_registrations").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (isConfirmTransition) {
      toast.success("Participant confirmed. Email system is not configured yet — set up Lovable Emails to send confirmation emails.");
    } else {
      toast.success("Updated");
    }
    qc.invalidateQueries({ queryKey: ["admin-regs-section"] });
  };
  const resendConfirmation = async (id: string) => {
    // Reset flag so once email is configured, the next dispatch will send.
    const { error } = await supabase.from("event_registrations")
      .update({ confirmation_email_sent: false, confirmation_email_sent_at: null, confirmation_email_error: null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Marked for resend. Email will be sent once Lovable Emails is configured.");
    qc.invalidateQueries({ queryKey: ["admin-regs-section"] });
  };
  const exportCsv = () => {
    if (!regs?.length) return;
    const rows = regs.map(r => ({
      name: r.profile?.full_name ?? r.profile?.username, email: r.profile?.email, phone: r.profile?.phone,
      level: r.profile?.snowboard_level, status: r.status, needs_ride: r.needs_ride,
      offers_seats: r.offers_car_seats, seats: r.available_car_seats, needs_rental: r.needs_rental,
      has_equipment: r.has_equipment, notes: r.notes, created_at: r.created_at,
    }));
    download("registrations.csv", toCSV(rows, Object.keys(rows[0])));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-end">
        <TripPicker value={tripId} onChange={setTripId} />
        <div>
          <Label className="mb-1.5 block text-xs">Filter</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!regs?.length}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
      </div>

      <div className="mt-4 space-y-3">
        {!tripId && <p className="text-muted-foreground">Pick a trip to view registrations.</p>}
        {tripId && regs?.length === 0 && <p className="text-muted-foreground">No registrations match.</p>}
        {regs?.map(r => (
          <div key={r.id} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex gap-3 min-w-0">
                <UserAvatar url={r.profile?.profile_picture_url as string | undefined} name={r.profile?.full_name ?? undefined} size="md"
                  onClick={() => { setProfileUserId(r.user_id); setProfileOpen(true); }} />
                <div className="min-w-0">
                  <button onClick={() => { setProfileUserId(r.user_id); setProfileOpen(true); }} className="font-semibold hover:underline text-left">
                    {r.profile?.full_name || (r.profile as { username?: string } | undefined)?.username || "—"}
                  </button>
                  <div className="text-xs text-muted-foreground">{r.profile?.email} · {r.profile?.phone || "no phone"} · {r.profile?.snowboard_level ?? "level n/a"}</div>
                  <div className="mt-1 text-xs flex flex-wrap gap-1">
                    {r.needs_ride && <span className="px-1.5 py-0.5 rounded bg-secondary">Needs ride</span>}
                    {r.offers_car_seats && <span className="px-1.5 py-0.5 rounded bg-secondary">Offers {r.available_car_seats}</span>}
                    {r.needs_rental && <span className="px-1.5 py-0.5 rounded bg-secondary">Rental</span>}
                    {r.has_equipment && <span className="px-1.5 py-0.5 rounded bg-secondary">Has gear</span>}
                    {r.transport_status && <span className="px-1.5 py-0.5 rounded bg-secondary">{r.transport_status}</span>}
                  </div>
                  {r.notes && <div className="mt-1 text-xs italic text-muted-foreground">"{r.notes}"</div>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <Select value={r.status} onValueChange={(v: Database["public"]["Enums"]["registration_status"]) => update(r.id, v)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
                {r.status === "confirmed" && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => resendConfirmation(r.id)}>
                    Resend confirmation
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <PublicProfileDialog userId={profileUserId} open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

// ---------- Carpool ----------
function CarpoolSection() {
  const qc = useQueryClient();
  const [tripId, setTripId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-carpool", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const [cars, seekers, requests, regs] = await Promise.all([
        supabase.from("trip_cars").select("*").eq("event_id", tripId!),
        supabase.from("seat_seekers").select("*").eq("event_id", tripId!),
        supabase.from("seat_requests").select("*").eq("event_id", tripId!),
        supabase.from("event_registrations").select("user_id, status").eq("event_id", tripId!).in("status", ["confirmed", "pending"]),
      ]);
      const userIds = Array.from(new Set([
        ...(cars.data ?? []).map(c => c.driver_user_id),
        ...(seekers.data ?? []).map(s => s.user_id),
        ...(requests.data ?? []).map(r => r.passenger_user_id),
      ]));
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, username, profile_picture_url, phone").in("user_id", userIds)
        : { data: [] };
      return { cars: cars.data ?? [], seekers: seekers.data ?? [], requests: requests.data ?? [], regs: regs.data ?? [], profiles: profiles ?? [] };
    },
  });

  const findP = (uid: string) => data?.profiles.find(p => p.user_id === uid);
  const setReqStatus = async (id: string, status: "accepted" | "rejected" | "pending" | "cancelled") => {
    const { error } = await supabase.from("seat_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-carpool"] });
  };
  const removeSeeker = async (id: string) => {
    const { error } = await supabase.from("seat_seekers").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-carpool"] });
  };
  const removeCar = async (id: string) => {
    if (!confirm("Remove this car?")) return;
    const { error } = await supabase.from("trip_cars").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-carpool"] });
  };

  const totalSeats = (data?.cars ?? []).reduce((s, c) => s + (c.available_seats ?? 0), 0);
  const assignedCount = (data?.requests ?? []).filter(r => r.status === "accepted").length;
  const stillSeeking = (data?.seekers ?? []).length;

  return (
    <div>
      <TripPicker value={tripId} onChange={setTripId} />
      {!tripId && <p className="mt-4 text-muted-foreground">Pick a trip to manage carpooling.</p>}
      {tripId && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Available seats" value={totalSeats} />
            <Stat label="Assigned" value={assignedCount} />
            <Stat label="Still need seats" value={stillSeeking} warn={stillSeeking > Math.max(0, totalSeats - assignedCount)} />
          </div>
          {stillSeeking > Math.max(0, totalSeats - assignedCount) && (
            <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />Not enough free car seats for everyone who needs one — remember to leave space for gear and luggage.
            </div>
          )}

          <h3 className="mt-6 text-lg font-bold">Drivers ({data?.cars.length ?? 0})</h3>
          <div className="mt-2 space-y-3">
            {(data?.cars ?? []).map(c => {
              const p = findP(c.driver_user_id);
              const accepted = (data?.requests ?? []).filter(r => r.car_id === c.id && r.status === "accepted");
              const pending = (data?.requests ?? []).filter(r => r.car_id === c.id && r.status === "pending");
              return (
                <div key={c.id} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex gap-3">
                      <UserAvatar url={p?.profile_picture_url ?? undefined} name={p?.full_name ?? undefined} size="md" />
                      <div>
                        <div className="font-semibold">{p?.full_name ?? p?.username ?? "Driver"}</div>
                        <div className="text-xs text-muted-foreground">{c.departure_area} → {c.meeting_point ?? "meeting point"}</div>
                        <div className="text-xs mt-0.5">Seats: <b>{c.available_seats}</b> · Assigned: <b>{accepted.length}</b></div>
                        {c.notes && <div className="text-xs italic text-muted-foreground mt-1">"{c.notes}"</div>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeCar(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  {(accepted.length > 0 || pending.length > 0) && (
                    <div className="mt-3 space-y-1">
                      {[...accepted, ...pending].map(r => {
                        const pp = findP(r.passenger_user_id);
                        return (
                          <div key={r.id} className="flex items-center justify-between gap-2 text-sm rounded-lg px-2 py-1.5 bg-secondary/50">
                            <span>{pp?.full_name ?? pp?.username} · <span className="capitalize text-muted-foreground">{r.status}</span></span>
                            <div className="flex gap-1">
                              {r.status !== "accepted" && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setReqStatus(r.id, "accepted")}>Assign</Button>}
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setReqStatus(r.id, "rejected")}>Remove</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {data?.cars.length === 0 && <p className="text-sm text-muted-foreground">No drivers offering rides yet.</p>}
          </div>

          <h3 className="mt-6 text-lg font-bold">Passengers looking for a seat ({data?.seekers.length ?? 0})</h3>
          <div className="mt-2 space-y-2">
            {(data?.seekers ?? []).map(s => {
              const p = findP(s.user_id);
              return (
                <div key={s.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    <UserAvatar url={p?.profile_picture_url ?? undefined} name={p?.full_name ?? undefined} size="sm" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{p?.full_name ?? p?.username}</div>
                      <div className="text-xs text-muted-foreground">{s.departure_area} {s.can_reach_meeting_point ? "· can reach meeting point" : ""}</div>
                      {s.notes && <div className="text-xs italic text-muted-foreground">"{s.notes}"</div>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeSeeker(s.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              );
            })}
            {data?.seekers.length === 0 && <p className="text-sm text-muted-foreground">Nobody is waiting for a seat.</p>}
          </div>
        </>
      )}
    </div>
  );
}
function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

// ---------- Roll Call ----------
function RollCallSection() {
  const qc = useQueryClient();
  const [tripId, setTripId] = useState<string | null>(null);
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-rollcall", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const [regs, checkins, event] = await Promise.all([
        supabase.from("event_registrations").select("*").eq("event_id", tripId!).eq("status", "confirmed"),
        supabase.from("trip_checkins").select("*").eq("event_id", tripId!),
        supabase.from("events").select("title, date, status").eq("id", tripId!).maybeSingle(),
      ]);
      const userIds = (regs.data ?? []).map(r => r.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, username, phone, profile_picture_url").in("user_id", userIds)
        : { data: [] };
      return { regs: regs.data ?? [], checkins: checkins.data ?? [], profiles: profiles ?? [], event: event.data };
    },
  });

  const setStatusFor = async (uid: string, patch: Record<string, unknown>) => {
    if (!tripId || !user) return;
    const existing = data?.checkins.find(c => c.user_id === uid);
    if (existing) {
      const { error } = await supabase.from("trip_checkins").update({ ...patch, marked_by_admin: true, admin_marked_by: user.id }).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("trip_checkins").insert({ event_id: tripId, user_id: uid, marked_by_admin: true, admin_marked_by: user.id, ...patch });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["admin-rollcall"] });
  };
  const sendReminders = async () => {
    if (!tripId) return;
    const { data, error } = await supabase.rpc("send_checkin_reminders", { _event_id: tripId });
    if (error) return toast.error(error.message);
    toast.success(`Reminder sent to ${data ?? 0} members`);
  };

  const counts = useMemo(() => {
    const regs = data?.regs ?? [];
    const get = (uid: string) => data?.checkins.find(c => c.user_id === uid);
    let checkedIn = 0, missing = 0, absent = 0, returned = 0;
    for (const r of regs) {
      const c = get(r.user_id);
      if (!c || c.status === "not_checked_in") missing++;
      else if (c.status === "absent") absent++;
      else if (c.status === "returned") returned++;
      else checkedIn++;
    }
    return { total: regs.length, checkedIn, missing, absent, returned };
  }, [data]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <TripPicker value={tripId} onChange={setTripId} />
        {tripId && <Button variant="outline" onClick={sendReminders}><Send className="w-4 h-4 mr-1" />Send reminders</Button>}
      </div>
      {!tripId && <p className="mt-4 text-muted-foreground">Pick a trip to open roll call.</p>}
      {tripId && (
        <>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
            <Stat label="Confirmed" value={counts.total} />
            <Stat label="Checked in" value={counts.checkedIn} />
            <Stat label="Missing" value={counts.missing} warn={counts.missing > 0} />
            <Stat label="Absent" value={counts.absent} warn={counts.absent > 0} />
            <Stat label="Returned" value={counts.returned} />
          </div>
          {data?.event?.status !== "completed" && counts.missing + counts.absent > 0 && (
            <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
              Don't mark this trip as completed until every participant is accounted for.
            </div>
          )}

          <div className="mt-4 space-y-2">
            {(data?.regs ?? []).map(r => {
              const p = data?.profiles.find(x => x.user_id === r.user_id);
              const c = data?.checkins.find(x => x.user_id === r.user_id);
              const status = c?.status ?? "not_checked_in";
              return (
                <div key={r.user_id} className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-3 min-w-0">
                    <UserAvatar url={p?.profile_picture_url ?? undefined} name={p?.full_name ?? undefined} size="md" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{p?.full_name ?? p?.username}</div>
                      <div className="text-xs text-muted-foreground">{p?.phone ?? "no phone"} · <span className="capitalize">{CHECKIN_LABELS[status]}</span></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setStatusFor(r.user_id, { meeting_point_checked_in: true })}><CheckCircle2 className="w-3 h-3 mr-1" />Arrived</Button>
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setStatusFor(r.user_id, { destination_checked_in: true, meeting_point_checked_in: true })}>At resort</Button>
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setStatusFor(r.user_id, { return_checked_in: true, destination_checked_in: true, meeting_point_checked_in: true })}>Returned</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive" onClick={() => setStatusFor(r.user_id, { status: "absent" })}><XCircle className="w-3 h-3 mr-1" />Absent</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setStatusFor(r.user_id, { status: "not_checked_in", meeting_point_checked_in: false, destination_checked_in: false, return_checked_in: false })}><RotateCcw className="w-3 h-3" /></Button>
                  </div>
                </div>
              );
            })}
            {data?.regs.length === 0 && <p className="text-sm text-muted-foreground">No confirmed participants yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Gallery shortcut ----------
function GalleryShortcut() {
  const { data: pending } = useQuery({
    queryKey: ["admin-media-pending"],
    queryFn: async () => (await supabase.from("trip_media").select("*", { count: "exact", head: true }).eq("status", "pending")).count ?? 0,
  });
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <Camera className="w-6 h-6 text-primary" />
        <div className="flex-1">
          <h3 className="font-bold text-lg">Gallery moderation</h3>
          <p className="text-sm text-muted-foreground mt-1">Approve, reject, feature or set cover for every member upload.</p>
          <p className="text-sm mt-2"><b>{pending ?? 0}</b> uploads waiting for review.</p>
          <Link to="/admin/gallery" className="mt-3 inline-block"><Button>Open gallery moderation</Button></Link>
        </div>
      </div>
    </div>
  );
}

// ---------- Users ----------
function UsersSection() {
  const qc = useQueryClient();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profiles, roles, regs] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, username, email, phone, snowboard_level, created_at, profile_picture_url").order("created_at", { ascending: false }).limit(500),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("event_registrations").select("user_id, status, events!inner(status)").eq("status", "confirmed"),
      ]);
      const completed = new Map<string, number>();
      for (const r of (regs.data ?? []) as { user_id: string; events: { status: string } }[]) {
        if (r.events?.status === "completed") completed.set(r.user_id, (completed.get(r.user_id) ?? 0) + 1);
      }
      return (profiles.data ?? []).map(p => ({
        ...p,
        is_admin: (roles.data ?? []).some(r => r.user_id === p.user_id && r.role === "admin"),
        completed_trips: completed.get(p.user_id) ?? 0,
      }));
    },
  });

  const adminCount = (data ?? []).filter(u => u.is_admin).length;
  const filtered = (data ?? []).filter(u => {
    const s = search.toLowerCase();
    return !s || (u.full_name ?? "").toLowerCase().includes(s) || (u.username ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s);
  });

  const promote = async (uid: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (error) toast.error(error.message); else { toast.success("Promoted to admin"); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
  };
  const demote = async (uid: string) => {
    if (adminCount <= 1) return toast.error("Cannot demote the last admin");
    if (!confirm("Remove admin role from this user?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
    if (error) toast.error(error.message); else { toast.success("Admin role removed"); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Search by name, username, email…" value={search} onChange={e => setSearch(e.target.value)} className="md:w-96" />
        <span className="text-xs text-muted-foreground">{filtered.length} users · {adminCount} admins</span>
      </div>
      <div className="mt-4 space-y-2">
        {filtered.map(u => (
          <div key={u.user_id} className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-3 min-w-0">
              <UserAvatar url={u.profile_picture_url ?? undefined} name={u.full_name ?? undefined} size="md"
                onClick={() => { setProfileUserId(u.user_id); setProfileOpen(true); }} />
              <div className="min-w-0">
                <button onClick={() => { setProfileUserId(u.user_id); setProfileOpen(true); }} className="font-semibold text-sm hover:underline text-left">
                  {(u.full_name && u.full_name.trim()) || u.username || "Member"} {u.is_admin && <span className="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Admin</span>}
                </button>
                <div className="text-xs text-muted-foreground">{u.email} · {u.phone ?? "no phone"} · {u.snowboard_level ?? "level n/a"} · {u.completed_trips} trips</div>
              </div>
            </div>
            <div className="flex gap-1">
              {u.is_admin
                ? <Button size="sm" variant="ghost" onClick={() => demote(u.user_id)}>Demote</Button>
                : <Button size="sm" variant="outline" onClick={() => promote(u.user_id)}><ShieldCheck className="w-4 h-4 mr-1" />Make admin</Button>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground">No users match.</p>}
      </div>
      <PublicProfileDialog userId={profileUserId} open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

// ---------- Notifications ----------
type AdminNotif = { id: string; type: string; event_id: string | null; payload: Record<string, unknown>; read: boolean; created_at: string };
function NotificationsSection() {
  const qc = useQueryClient();
  const { data: notifs } = useQuery({
    queryKey: ["admin-notifs-full"],
    refetchInterval: 30000,
    queryFn: async () => ((await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(200)).data ?? []) as unknown as AdminNotif[],
  });
  const unread = (notifs ?? []).filter(n => !n.read).length;
  const markRead = async (id: string) => { await supabase.from("admin_notifications").update({ read: true }).eq("id", id); qc.invalidateQueries({ queryKey: ["admin-notifs-full"] }); };
  const markAll = async () => { await supabase.from("admin_notifications").update({ read: true }).eq("read", false); qc.invalidateQueries({ queryKey: ["admin-notifs-full"] }); };

  const summary = (n: AdminNotif) => {
    const p = n.payload;
    if (n.type === "trip_join") return `${p.user_name ?? "Member"} joined ${p.trip_title ?? "a trip"}`;
    if (n.type === "media_upload") return `New ${p.media_type ?? "media"} uploaded for ${p.trip_title ?? "a trip"}`;
    return n.type;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Notifications · {unread} unread</h2>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAll}>Mark all read</Button>}
      </div>
      <div className="mt-3 space-y-2">
        {(notifs ?? []).map(n => (
          <div key={n.id} className={`rounded-xl border p-3 flex items-start gap-3 ${n.read ? "bg-card border-border" : "bg-primary/5 border-primary/30"}`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm">{summary(n)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {n.event_id && <Link to="/admin/events/$id" params={{ id: n.event_id }} onClick={() => !n.read && markRead(n.id)}><Button size="sm" variant="outline">Open</Button></Link>}
            {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
          </div>
        ))}
        {(notifs ?? []).length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}
      </div>
    </div>
  );
}

// ---------- Exports ----------
function ExportsSection() {
  const [tripId, setTripId] = useState<string | null>(null);

  const exportUsers = async () => {
    const { data } = await supabase.from("profiles").select("full_name, username, email, phone, city, snowboard_level, created_at").limit(2000);
    if (!data?.length) return toast.error("No users to export");
    download("users.csv", toCSV(data, Object.keys(data[0])));
  };
  const exportParticipants = async () => {
    if (!tripId) return toast.error("Pick a trip first");
    const { data: regs } = await supabase.from("event_registrations").select("*").eq("event_id", tripId);
    if (!regs?.length) return toast.error("No participants");
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, username, email, phone, city, snowboard_level").in("user_id", regs.map(r => r.user_id));
    const rows = regs.map(r => {
      const p = profiles?.find(x => x.user_id === r.user_id);
      return { name: p?.full_name ?? p?.username, email: p?.email, phone: p?.phone, city: p?.city, level: p?.snowboard_level, status: r.status, needs_ride: r.needs_ride, offers_seats: r.offers_car_seats, available_seats: r.available_car_seats, needs_rental: r.needs_rental, has_equipment: r.has_equipment };
    });
    download(`participants-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };
  const exportCarpool = async () => {
    if (!tripId) return toast.error("Pick a trip first");
    const [cars, requests] = await Promise.all([
      supabase.from("trip_cars").select("*").eq("event_id", tripId),
      supabase.from("seat_requests").select("*").eq("event_id", tripId).eq("status", "accepted"),
    ]);
    const userIds = Array.from(new Set([...(cars.data ?? []).map(c => c.driver_user_id), ...(requests.data ?? []).map(r => r.passenger_user_id)]));
    const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, full_name, username").in("user_id", userIds) : { data: [] };
    const rows: Record<string, unknown>[] = [];
    for (const c of cars.data ?? []) {
      const driver = profiles?.find(p => p.user_id === c.driver_user_id);
      rows.push({ role: "driver", name: driver?.full_name ?? driver?.username, departure_area: c.departure_area, seats: c.available_seats, car_id: c.id });
      for (const r of (requests.data ?? []).filter(r => r.car_id === c.id)) {
        const pp = profiles?.find(p => p.user_id === r.passenger_user_id);
        rows.push({ role: "passenger", name: pp?.full_name ?? pp?.username, departure_area: "", seats: 1, car_id: c.id });
      }
    }
    if (!rows.length) return toast.error("No carpool data");
    download(`carpool-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };
  const exportCheckins = async () => {
    if (!tripId) return toast.error("Pick a trip first");
    const [regs, chk] = await Promise.all([
      supabase.from("event_registrations").select("user_id").eq("event_id", tripId).eq("status", "confirmed"),
      supabase.from("trip_checkins").select("*").eq("event_id", tripId),
    ]);
    const { data: profiles } = (regs.data ?? []).length
      ? await supabase.from("profiles").select("user_id, full_name, username, phone").in("user_id", (regs.data ?? []).map(r => r.user_id))
      : { data: [] };
    const rows = (regs.data ?? []).map(r => {
      const p = profiles?.find(x => x.user_id === r.user_id);
      const c = chk.data?.find(x => x.user_id === r.user_id);
      return { name: p?.full_name ?? p?.username, phone: p?.phone, status: c?.status ?? "not_checked_in", meeting_point_at: c?.meeting_point_checked_in_at ?? "", destination_at: c?.destination_checked_in_at ?? "", returned_at: c?.return_checked_in_at ?? "" };
    });
    if (!rows.length) return toast.error("No confirmed participants");
    download(`checkin-${tripId}.csv`, toCSV(rows, Object.keys(rows[0])));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold">Global exports</h3>
        <Button variant="outline" className="mt-2" onClick={exportUsers}><Download className="w-4 h-4 mr-1" />Users (CSV)</Button>
      </div>
      <div>
        <h3 className="font-bold">Trip exports</h3>
        <div className="mt-2"><TripPicker value={tripId} onChange={setTripId} label="Pick a trip" /></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportParticipants} disabled={!tripId}><Download className="w-4 h-4 mr-1" />Participants</Button>
          <Button variant="outline" onClick={exportCarpool} disabled={!tripId}><Download className="w-4 h-4 mr-1" />Carpool</Button>
          <Button variant="outline" onClick={exportCheckins} disabled={!tripId}><Download className="w-4 h-4 mr-1" />Check-in list</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">CSV files include operational fields only — emergency contacts are kept inside the trip details view.</p>
      </div>
    </div>
  );
}
