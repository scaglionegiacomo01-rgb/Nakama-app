import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { TripPicker, Stat } from "@/lib/admin-shared";

export const Route = createFileRoute("/admin_/carpool")({ component: AdminCarpoolPage });

function AdminCarpoolPage() {
  const { ready, loading } = useAdminGuard();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;
  return (
    <AdminShell title="Carpool" description="Match drivers with passengers looking for a seat.">
      <CarpoolSection />
    </AdminShell>
  );
}

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
