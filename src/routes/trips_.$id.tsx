import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, CheckCircle2, Mountain, Car, Backpack, Clock, ShieldCheck, Bell } from "lucide-react";
import { toast } from "sonner";
import { OverviewPanel } from "@/components/trip/OverviewPanel";
import { WhosGoingPanel } from "@/components/trip/WhosGoingPanel";
import { CarpoolPanel } from "@/components/trip/CarpoolPanel";
import { TripChatPanel } from "@/components/trip/TripChatPanel";
import { SafetyPanel } from "@/components/trip/SafetyPanel";
import { CheckinPanel } from "@/components/trip/CheckinPanel";
import { GalleryPanel } from "@/components/trip/GalleryPanel";
import { BeginnerChecklistPanel } from "@/components/trip/BeginnerChecklistPanel";
import { EventTag } from "@/components/EventTag";
import { SEATS_DISCLAIMER } from "@/lib/levels";
import { BEGINNER_TAGS } from "@/lib/checklist";
import { Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/trips_/$id")({ component: TripDetail });

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function TripDetail() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const t = useT();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => (await supabase.from("events").select("*").eq("id", id).maybeSingle()).data,
  });

  const { data: myReg } = useQuery({
    queryKey: ["my-reg", id, user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("event_registrations").select("*").eq("event_id", id).eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: regCount } = useQuery({
    queryKey: ["event-reg-count", id],
    queryFn: async () => {
      const { count } = await supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("event_id", id).in("status", ["pending","confirmed"]);
      return count ?? 0;
    },
  });

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-level", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("snowboard_level").eq("user_id", user!.id).maybeSingle()).data,
  });


  const [showForm, setShowForm] = useState(false);
  const [transport, setTransport] = useState<"have_car_will_drive"|"have_car_no_drive"|"no_car_can_drive"|"no_car_need_seat">("no_car_need_seat");
  const [seats, setSeats] = useState(2);
  const [departureArea, setDepartureArea] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [canReachMeeting, setCanReachMeeting] = useState(true);
  const [transportNotes, setTransportNotes] = useState("");
  const [form, setForm] = useState({ needs_rental: false, has_equipment: false, notes: "", accepted_liability_for_event: false, accepted_rules_for_event: false });
  const [busy, setBusy] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-12">Loading...</div>;
  if (!event) return <div className="max-w-3xl mx-auto px-4 py-12"><h1 className="text-2xl font-bold">Trip not found</h1></div>;

  const ACTIVE_STATUSES = ["pending", "confirmed", "waitlisted"] as const;
  const spotsLeft = Math.max(0, event.max_participants - (regCount ?? 0));
  const isActiveReg = !!myReg && (ACTIVE_STATUSES as readonly string[]).includes(myReg.status);
  const isParticipant = !!myReg && (myReg.status === "pending" || myReg.status === "confirmed");
  const canChat = isParticipant;
  const hasCar = transport === "have_car_will_drive" || transport === "have_car_no_drive";
  const needsSeat = transport === "no_car_need_seat";
  const eventTags: string[] = event.tags ?? [];
  const isBeginnerEvent = eventTags.some(t => BEGINNER_TAGS.includes(t));
  const userIsBeginner = myProfile?.snowboard_level === "beginner";
  const showAssistTab = isParticipant && (userIsBeginner || isBeginnerEvent);

  const cancelMyReg = async () => {
    if (!myReg || !user) return;
    if (!confirm("Cancel your participation in this trip?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("event_registrations")
        .update({ status: "cancelled" }).eq("id", myReg.id);
      if (error) throw error;
      // Deactivate carpool side-effects
      await supabase.from("trip_cars").delete().eq("event_id", id).eq("driver_user_id", user.id);
      await supabase.from("seat_seekers").delete().eq("event_id", id).eq("user_id", user.id);
      toast.success("You cancelled this trip.");
      qc.invalidateQueries({ queryKey: ["my-reg", id] });
      qc.invalidateQueries({ queryKey: ["event-reg-count", id] });
      qc.invalidateQueries({ queryKey: ["whos-going", id] });
      qc.invalidateQueries({ queryKey: ["trip-cars", id] });
      qc.invalidateQueries({ queryKey: ["seat-seekers", id] });
      qc.invalidateQueries({ queryKey: ["my-trips"] });
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  const join = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!form.accepted_liability_for_event || !form.accepted_rules_for_event) { toast.error("Please accept the disclaimer and rules"); return; }
    if ((hasCar || needsSeat) && !departureArea.trim()) { toast.error("Please add your departure area"); return; }
    setBusy(true);
    try {
      const payload = {
        event_id: id, user_id: user.id,
        status: (spotsLeft > 0 ? "pending" : "waitlisted") as "pending" | "waitlisted",
        transport_status: transport,
        needs_ride: needsSeat,
        offers_car_seats: transport === "have_car_will_drive",
        available_car_seats: transport === "have_car_will_drive" ? seats : 0,
        needs_rental: form.needs_rental, has_equipment: form.has_equipment,
        notes: form.notes,
        accepted_liability_for_event: form.accepted_liability_for_event,
        accepted_rules_for_event: form.accepted_rules_for_event,
      };
      // Reactivate existing row (any status) if present; otherwise insert.
      if (myReg) {
        if (isActiveReg) { toast.info("You're already in this trip."); setShowForm(false); return; }
        const { error } = await supabase.from("event_registrations").update(payload).eq("id", myReg.id);
        if (error) throw error;
        // Clean any stale carpool rows from previous attempt
        await supabase.from("trip_cars").delete().eq("event_id", id).eq("driver_user_id", user.id);
        await supabase.from("seat_seekers").delete().eq("event_id", id).eq("user_id", user.id);
        toast.success("Your request to join this trip has been sent again.");
      } else {
        const { error } = await supabase.from("event_registrations").insert(payload);
        if (error) throw error;
      }
      // Auto-create carpool entries
      if (transport === "have_car_will_drive" && departureArea.trim()) {
        await supabase.from("trip_cars").insert({ event_id: id, driver_user_id: user.id, departure_area: departureArea, meeting_point: meetingPoint || null, available_seats: seats, notes: transportNotes || null });
      }
      if (needsSeat && departureArea.trim()) {
        await supabase.from("seat_seekers").insert({ event_id: id, user_id: user.id, departure_area: departureArea, can_reach_meeting_point: canReachMeeting, notes: transportNotes || null });
      }
      qc.invalidateQueries({ queryKey: ["my-reg", id] });
      qc.invalidateQueries({ queryKey: ["event-reg-count", id] });
      qc.invalidateQueries({ queryKey: ["whos-going", id] });
      qc.invalidateQueries({ queryKey: ["trip-cars", id] });
      qc.invalidateQueries({ queryKey: ["seat-seekers", id] });
      setShowForm(false);
      setRecapOpen(true);
      // Beginner Assist prompt
      const willOfferAssist = (myProfile?.snowboard_level === "beginner") || (event.tags ?? []).some((t: string) => BEGINNER_TAGS.includes(t));
      if (willOfferAssist) setTimeout(() => setAssistOpen(true), 600);
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-44 md:pb-32">
      <Link to="/trips" className="text-sm text-muted-foreground hover:text-foreground">{t("trip.all_trips")}</Link>
      <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
        <span className="px-2 py-1 rounded-full bg-ice text-ice-foreground font-medium capitalize">{event.type.replace("_"," ")}</span>
        <span className="px-2 py-1 rounded-full bg-secondary capitalize">{event.difficulty}</span>
        {(event.tags ?? []).map((t: string) => <EventTag key={t} tag={t} />)}
      </div>
      <h1 className="mt-2 text-3xl md:text-4xl font-bold">{event.title}</h1>
      <div className="mt-1 text-muted-foreground inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{event.destination} · {new Date(event.date).toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"})}</div>

      {/* Trip-day check-in priority card */}
      {isParticipant && isToday(event.date) && (
        <button
          onClick={() => setActiveTab("checkin")}
          className="mt-5 w-full text-left rounded-2xl bg-gradient-to-br from-primary via-summit to-ice text-primary-foreground p-5 shadow-lg hover:scale-[1.01] transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-background/20 backdrop-blur grid place-items-center">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-80">{t("trip.today_checkin_title")}</div>
              <div className="font-display font-bold text-xl mt-0.5">{t("trip.today_checkin_open")} →</div>
              <div className="text-sm opacity-90 mt-1">{t("trip.today_checkin_cta")}</div>
            </div>
          </div>
        </button>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="w-full overflow-x-auto justify-start flex-nowrap">
          <TabsTrigger value="overview">{t("tab.overview")}</TabsTrigger>
          <TabsTrigger value="checkin">{t("tab.checkin")}</TabsTrigger>
          <TabsTrigger value="who">{t("tab.who")}</TabsTrigger>
          <TabsTrigger value="carpool">{t("tab.carpool")}</TabsTrigger>
          <TabsTrigger value="chat">{t("tab.chat")}</TabsTrigger>
          <TabsTrigger value="gallery">{t("tab.gallery")}</TabsTrigger>
          <TabsTrigger value="safety">{t("tab.safety")}</TabsTrigger>
          {showAssistTab && <TabsTrigger value="assist">{t("tab.assist")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="mt-6"><OverviewPanel event={event} spotsLeft={spotsLeft} /></TabsContent>
        <TabsContent value="checkin" className="mt-6"><CheckinPanel event={event} isAdmin={isAdmin} isParticipant={isParticipant} /></TabsContent>
        <TabsContent value="who" className="mt-6"><WhosGoingPanel eventId={id} isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="carpool" className="mt-6"><CarpoolPanel eventId={id} isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="chat" className="mt-6"><TripChatPanel eventId={id} canPost={canChat} isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="gallery" className="mt-6"><GalleryPanel event={event} isAdmin={isAdmin} isParticipant={isParticipant && myReg?.status === "confirmed"} /></TabsContent>
        <TabsContent value="safety" className="mt-6"><SafetyPanel event={event} isAdmin={isAdmin} isParticipant={isParticipant} /></TabsContent>
        {showAssistTab && <TabsContent value="assist" className="mt-6"><BeginnerChecklistPanel eventId={id} /></TabsContent>}
      </Tabs>

      {/* Sticky join bar */}
      <div
        className="fixed inset-x-0 z-50 bg-background/95 backdrop-blur border-t border-border p-3 bottom-16 md:bottom-0"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >

        <div className="max-w-4xl mx-auto">
          {isActiveReg ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm"><span className="font-semibold">{t("trip.you_are_in")}</span> · <span className="capitalize text-muted-foreground">{t(`status.${myReg!.status}`)}</span></div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelMyReg} disabled={busy}>{t("trip.cancel")}</Button>
                <Button variant="outline" size="sm" onClick={() => setRecapOpen(true)}>{t("trip.recap")}</Button>
                <Link to="/my-trips"><Button size="sm">{t("nav.my_trips")}</Button></Link>
              </div>
            </div>
          ) : myReg && myReg.status === "cancelled" ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">{t("trip.cancelled_msg")}</div>
              <Button size="sm" onClick={() => setShowForm(true)}>
                {spotsLeft > 0 ? t("trip.join_again") : t("trip.join_waitlist")}
              </Button>
            </div>
          ) : myReg && myReg.status === "rejected" ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">Your request was not accepted.</div>
            </div>
          ) : (
            <Button size="lg" className="w-full" onClick={() => user ? setShowForm(true) : navigate({ to: "/auth" })}>
              {user ? (spotsLeft > 0 ? t("trip.join") : t("trip.join_waitlist")) : t("trip.signin_to_join")}
            </Button>
          )}
        </div>
      </div>

      {/* Join dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Join this trip</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Transport</Label>
              <RadioGroup value={transport} onValueChange={(v) => setTransport(v as typeof transport)} className="space-y-1.5">
                <RadioRow value="have_car_will_drive" label="I have a car and I can drive" />
                <RadioRow value="have_car_no_drive" label="I have a car but I can't drive" />
                <RadioRow value="no_car_can_drive" label="I don't have a car but I can drive if needed" />
                <RadioRow value="no_car_need_seat" label="I don't have a car and I need a seat" />
              </RadioGroup>
              <p className="text-[11px] text-muted-foreground mt-2">{SEATS_DISCLAIMER}</p>
            </div>

            {hasCar && (
              <div className="space-y-2 rounded-xl bg-secondary/30 p-3">
                <div><Label>Departure area</Label><Input value={departureArea} onChange={e => setDepartureArea(e.target.value)} placeholder="e.g. Milan" /></div>
                {transport === "have_car_will_drive" && (
                  <>
                    <div><Label>Available passenger seats (after gear)</Label><Input type="number" min={0} max={8} value={seats} onChange={e => setSeats(+e.target.value)} /></div>
                    <div><Label>Meeting point (optional)</Label><Input value={meetingPoint} onChange={e => setMeetingPoint(e.target.value)} placeholder="e.g. Lambrate station 6:00" /></div>
                    <div><Label>Notes for passengers</Label><Textarea value={transportNotes} onChange={e => setTransportNotes(e.target.value)} /></div>
                  </>
                )}
              </div>
            )}
            {needsSeat && (
              <div className="space-y-2 rounded-xl bg-secondary/30 p-3">
                <div><Label>Departure area</Label><Input value={departureArea} onChange={e => setDepartureArea(e.target.value)} placeholder="e.g. Milan" /></div>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={canReachMeeting} onCheckedChange={v => setCanReachMeeting(!!v)} />I can reach the main meeting point</label>
                <div><Label>Notes for drivers</Label><Textarea value={transportNotes} onChange={e => setTransportNotes(e.target.value)} /></div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.has_equipment} onCheckedChange={v => setForm({...form, has_equipment: !!v})} />I have my own snowboard equipment</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.needs_rental} onCheckedChange={v => setForm({...form, needs_rental: !!v})} />I need rental</label>
            <div><Label>Notes for the organizer</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>

            <div className="border-t border-border pt-3 space-y-2">
              <label className="flex items-start gap-2 text-sm"><Checkbox checked={form.accepted_liability_for_event} onCheckedChange={v => setForm({...form, accepted_liability_for_event: !!v})} className="mt-0.5" />I accept the liability disclaimer and acknowledge mountain sports involve risk</label>
              <label className="flex items-start gap-2 text-sm"><Checkbox checked={form.accepted_rules_for_event} onCheckedChange={v => setForm({...form, accepted_rules_for_event: !!v})} className="mt-0.5" />I accept the community rules</label>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={join} disabled={busy} className="flex-1">{busy ? "..." : "Confirm"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recap */}
      <Dialog open={recapOpen} onOpenChange={setRecapOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="sr-only">Trip recap</DialogTitle></DialogHeader>
          <div>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-summit grid place-items-center text-primary-foreground"><CheckCircle2 className="w-7 h-7" /></div>
              <h2 className="mt-3 font-display font-bold text-2xl">Your spot request has been sent</h2>
              <p className="text-sm text-muted-foreground mt-1">See you on the mountain. Please arrive on time and make sure your equipment is ready.</p>
            </div>
            <div className="mt-5 space-y-2">
              <Row icon={Mountain} label="Trip" value={event.title} />
              <Row icon={MapPin} label="Destination" value={event.destination} />
              <Row icon={Calendar} label="Date" value={new Date(event.date).toLocaleDateString(undefined,{ weekday: "long", day: "numeric", month: "long" })} />
              <Row icon={MapPin} label="Meeting point" value={event.meeting_point} />
              <Row icon={Clock} label="Departure" value={event.departure_time ?? "TBA"} />
              <Row icon={Clock} label="Return" value={event.return_time ?? "TBA"} />
              <Row icon={Car} label="Transport" value={transport.replaceAll("_"," ")} />
              <Row icon={Backpack} label="Gear" value={form.needs_rental ? "Renting on site" : form.has_equipment ? "Bringing own gear" : "—"} />
              {event.safety_notes && <Row icon={ShieldCheck} label="Organizer notes" value={event.safety_notes} />}
            </div>
            <div className="mt-4 rounded-xl bg-ice/30 border border-ice p-3 text-xs space-y-1">
              <p>⏰ Be on time at the meeting point — the crew waits 10 minutes max.</p>
              <p>🏔️ Mountain weather changes fast. Pack warm layers and water.</p>
              <p>🎿 Double-check your gear the night before.</p>
              <p><Users className="w-3 h-3 inline" /> Nobody gets left behind — check in on the Safety tab.</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setRecapOpen(false)} variant="outline" className="flex-1">Close</Button>
              <Link to="/my-trips" className="flex-1"><Button className="w-full">My trips</Button></Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Beginner Assist prompt */}
      <Dialog open={assistOpen} onOpenChange={setAssistOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="sr-only">Beginner Assist</DialogTitle></DialogHeader>
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-ice grid place-items-center text-ice-foreground"><Sparkles className="w-7 h-7" /></div>
            <h2 className="mt-3 font-display font-bold text-xl">Ready for the mountain?</h2>
            <p className="text-sm text-muted-foreground mt-1">We prepared a simple checklist to help you get ready for the trip. The community is here to help.</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAssistOpen(false)}>Maybe later</Button>
            <Button className="flex-1" onClick={() => { setAssistOpen(false); setActiveTab("assist"); }}>Open checklist</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RadioRow({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-1.5 hover:bg-secondary/40">
      <RadioGroupItem value={value} />
      <span>{label}</span>
    </label>
  );
}
function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{className?:string}>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
      <div className="flex-1 capitalize"><div className="text-xs text-muted-foreground">{label}</div><div>{value}</div></div>
    </div>
  );
}
