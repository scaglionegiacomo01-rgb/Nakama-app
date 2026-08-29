import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, UserPlus, Info } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { useI18n } from "@/lib/i18n";

type Car = { id: string; event_id: string; driver_user_id: string; departure_area: string; meeting_point: string | null; available_seats: number; notes: string | null; profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null } };
type Seeker = { id: string; user_id: string; departure_area: string; can_reach_meeting_point: boolean; notes: string | null; profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null } };
type Req = { id: string; car_id: string; passenger_user_id: string; status: string; notes: string | null; profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null } };

export function CarpoolPanel({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showCarForm, setShowCarForm] = useState(false);
  const [showSeekerForm, setShowSeekerForm] = useState(false);
  const [carForm, setCarForm] = useState({ departure_area: "", meeting_point: "", available_seats: 1, notes: "" });
  const [seekerForm, setSeekerForm] = useState({ departure_area: "", can_reach_meeting_point: true, notes: "" });

  const attachProfiles = async <T extends { user_id?: string; driver_user_id?: string; passenger_user_id?: string }>(rows: T[], key: keyof T) => {
    if (rows.length === 0) return rows as (T & { profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null } })[];
    const ids = Array.from(new Set(rows.map(r => r[key] as unknown as string)));
    const { data: profs } = await supabase.from("profiles").select("user_id, full_name, username, profile_picture_url").in("user_id", ids);
    return rows.map(r => ({ ...r, profile: profs?.find((p: { user_id: string }) => p.user_id === (r[key] as unknown as string)) }));
  };

  const { data: cars } = useQuery({
    queryKey: ["trip-cars", eventId],
    queryFn: async () => {
      const { data } = await supabase.from("trip_cars").select("*").eq("event_id", eventId);
      return attachProfiles((data ?? []) as unknown as Car[], "driver_user_id");
    },
  });

  const { data: seekers } = useQuery({
    queryKey: ["seat-seekers", eventId],
    queryFn: async () => {
      const { data } = await supabase.from("seat_seekers").select("*").eq("event_id", eventId);
      return attachProfiles((data ?? []) as unknown as Seeker[], "user_id");
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["seat-requests", eventId],
    queryFn: async () => {
      const { data } = await supabase.from("seat_requests").select("*").eq("event_id", eventId);
      return attachProfiles((data ?? []) as unknown as Req[], "passenger_user_id");
    },
  });

  const myCar = (cars ?? []).find(c => c.driver_user_id === user?.id);
  const mySeeker = (seekers ?? []).find(s => s.user_id === user?.id);
  const acceptedByCar = (carId: string) => (requests ?? []).filter(r => r.car_id === carId && r.status === "accepted");
  const requestsByCar = (carId: string) => (requests ?? []).filter(r => r.car_id === carId);

  const totalSeats = (cars ?? []).reduce((s, c) => s + c.available_seats, 0);
  const totalAccepted = (requests ?? []).filter(r => r.status === "accepted").length;
  const stillNeed = (seekers ?? []).filter(s => !(requests ?? []).some(r => r.passenger_user_id === s.user_id && r.status === "accepted")).length;

  const offerCar = async () => {
    if (!user) return;
    const { error } = await supabase.from("trip_cars").insert({ event_id: eventId, driver_user_id: user.id, ...carForm });
    if (error) { toast.error(error.message); return; }
    toast.success(t("carpool.toast_car_posted"));
    setShowCarForm(false);
    qc.invalidateQueries({ queryKey: ["trip-cars", eventId] });
  };

  const removeCar = async (id: string) => {
    await supabase.from("trip_cars").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["trip-cars", eventId] });
    qc.invalidateQueries({ queryKey: ["seat-requests", eventId] });
  };

  const postSeeker = async () => {
    if (!user) return;
    const { error } = await supabase.from("seat_seekers").insert({ event_id: eventId, user_id: user.id, ...seekerForm });
    if (error) { toast.error(error.message); return; }
    toast.success(t("carpool.toast_seeker_posted"));
    setShowSeekerForm(false);
    qc.invalidateQueries({ queryKey: ["seat-seekers", eventId] });
  };

  const removeSeeker = async (id: string) => {
    await supabase.from("seat_seekers").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["seat-seekers", eventId] });
  };

  const requestSeat = async (car: Car) => {
    if (!user) return;
    const { error } = await supabase.from("seat_requests").insert({ event_id: eventId, car_id: car.id, passenger_user_id: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success(t("carpool.toast_seat_requested"));
    qc.invalidateQueries({ queryKey: ["seat-requests", eventId] });
  };

  const updateRequest = async (id: string, status: "accepted" | "rejected") => {
    await supabase.from("seat_requests").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["seat-requests", eventId] });
  };

  const myRequestFor = (carId: string) => (requests ?? []).find(r => r.car_id === carId && r.passenger_user_id === user?.id);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-ice/20 border border-ice p-4 text-xs flex gap-2 items-start">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{t("level.seats_disclaimer")}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label={t("carpool.total_seats")} value={totalSeats} />
        <Stat label={t("carpool.drivers")} value={(cars ?? []).length} />
        <Stat label={t("carpool.assigned")} value={totalAccepted} />
        <Stat label={t("carpool.still_need_seat")} value={stillNeed} />
      </div>

      {/* My role */}
      {user && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="font-semibold text-sm">{t("carpool.your_role")}</div>
          <div className="flex flex-wrap gap-2">
            {!myCar && <Button size="sm" variant="outline" onClick={() => setShowCarForm(s => !s)}><Car className="w-4 h-4 mr-1" />{t("carpool.offer_car")}</Button>}
            {!mySeeker && <Button size="sm" variant="outline" onClick={() => setShowSeekerForm(s => !s)}><UserPlus className="w-4 h-4 mr-1" />{t("carpool.need_seat")}</Button>}
            {myCar && <Button size="sm" variant="ghost" onClick={() => removeCar(myCar.id)}>{t("carpool.remove_car_offer")}</Button>}
            {mySeeker && <Button size="sm" variant="ghost" onClick={() => removeSeeker(mySeeker.id)}>{t("carpool.cancel_seat_request")}</Button>}
          </div>

          {showCarForm && !myCar && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <div><Label>{t("carpool.departure_area")}</Label><Input value={carForm.departure_area} onChange={e => setCarForm({...carForm, departure_area: e.target.value})} placeholder={t("carpool.departure_area_placeholder")} /></div>
              <div><Label>{t("carpool.meeting_point_optional")}</Label><Input value={carForm.meeting_point} onChange={e => setCarForm({...carForm, meeting_point: e.target.value})} placeholder={t("carpool.meeting_point_placeholder")} /></div>
              <div><Label>{t("carpool.seats_after_gear")}</Label><Input type="number" min={0} max={8} value={carForm.available_seats} onChange={e => setCarForm({...carForm, available_seats: +e.target.value})} /></div>
              <div><Label>{t("carpool.notes_passengers")}</Label><Textarea value={carForm.notes} onChange={e => setCarForm({...carForm, notes: e.target.value})} /></div>
              <Button onClick={offerCar} className="w-full" disabled={!carForm.departure_area}>{t("carpool.post_offer")}</Button>
            </div>
          )}
          {showSeekerForm && !mySeeker && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <div><Label>{t("carpool.departure_area")}</Label><Input value={seekerForm.departure_area} onChange={e => setSeekerForm({...seekerForm, departure_area: e.target.value})} placeholder={t("carpool.departure_area_placeholder")} /></div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={seekerForm.can_reach_meeting_point} onCheckedChange={v => setSeekerForm({...seekerForm, can_reach_meeting_point: !!v})} />{t("carpool.can_reach_meeting")}</label>
              <div><Label>{t("carpool.notes_drivers")}</Label><Textarea value={seekerForm.notes} onChange={e => setSeekerForm({...seekerForm, notes: e.target.value})} /></div>
              <Button onClick={postSeeker} className="w-full" disabled={!seekerForm.departure_area}>{t("carpool.post_seat_request")}</Button>
            </div>
          )}
        </div>
      )}

      {/* Drivers */}
      <div>
        <h3 className="font-display font-bold text-lg mb-3">{t("carpool.drivers")}</h3>
        {(cars ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{t("carpool.no_drivers")}</p> : (
          <div className="space-y-3">
            {(cars ?? []).map(c => {
              const accepted = acceptedByCar(c.id);
              const seatsLeft = c.available_seats - accepted.length;
              const isMine = c.driver_user_id === user?.id;
              const myReq = myRequestFor(c.id);
              return (
                <div key={c.id} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex gap-3 items-start">
                    <UserAvatar url={c.profile?.profile_picture_url} name={c.profile?.full_name ?? c.profile?.username} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{c.profile?.username ? `@${c.profile.username}` : (c.profile?.full_name ?? t("common.member"))}</div>
                      <div className="text-xs text-muted-foreground">{t("carpool.from", { area: c.departure_area })}{c.meeting_point ? t("carpool.meet_at", { point: c.meeting_point }) : ""}</div>
                      <div className="mt-1 text-xs">{t("carpool.seats_free", { left: seatsLeft, total: c.available_seats })}</div>
                      {c.notes && <div className="mt-1 text-xs italic text-muted-foreground">"{c.notes}"</div>}
                    </div>
                    {!isMine && user && (
                      myReq ? <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize">{myReq.status}</span>
                       : seatsLeft > 0 && <Button size="sm" onClick={() => requestSeat(c)}>{t("carpool.request_seat")}</Button>
                    )}
                  </div>

                  {/* Passenger requests for this car */}
                  {(isMine || isAdmin) && requestsByCar(c.id).length > 0 && (
                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("carpool.requests")}</div>
                      {requestsByCar(c.id).map(r => (
                        <div key={r.id} className="flex items-center gap-2">
                          <UserAvatar url={r.profile?.profile_picture_url} name={r.profile?.full_name ?? r.profile?.username} size="sm" />
                          <div className="flex-1 min-w-0 text-sm">
                            <div className="truncate">{r.profile?.username ? `@${r.profile.username}` : (r.profile?.full_name ?? t("common.member"))}</div>
                            <div className="text-xs text-muted-foreground capitalize">{r.status}</div>
                          </div>
                          {r.status === "pending" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => updateRequest(r.id, "accepted")}>{t("carpool.accept")}</Button>
                              <Button size="sm" variant="ghost" onClick={() => updateRequest(r.id, "rejected")}>{t("carpool.reject")}</Button>
                            </div>
                          )}
                          {r.status === "accepted" && isMine && <Button size="sm" variant="ghost" onClick={() => updateRequest(r.id, "rejected")}>{t("carpool.remove")}</Button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seat seekers */}
      <div>
        <h3 className="font-display font-bold text-lg mb-3">{t("carpool.looking_for_seat")}</h3>
        {(seekers ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{t("carpool.nobody_looking")}</p> : (
          <div className="space-y-2">
            {(seekers ?? []).map(s => {
              const assigned = (requests ?? []).some(r => r.passenger_user_id === s.user_id && r.status === "accepted");
              return (
                <div key={s.id} className="rounded-xl bg-card border border-border p-3 flex gap-3 items-center">
                  <UserAvatar url={s.profile?.profile_picture_url} name={s.profile?.full_name ?? s.profile?.username} size="sm" />
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="truncate font-medium">{s.profile?.username ? `@${s.profile.username}` : (s.profile?.full_name ?? t("common.member"))}</div>
                    <div className="text-xs text-muted-foreground">{t("carpool.from", { area: s.departure_area })} · {s.can_reach_meeting_point ? t("carpool.can_reach_meeting_short") : t("carpool.needs_pickup")}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${assigned ? "bg-summit text-primary-foreground" : "bg-secondary"}`}>{assigned ? t("carpool.assigned_badge") : t("carpool.needs_seat_badge")}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-display font-bold">{value}</div>
    </div>
  );
}
