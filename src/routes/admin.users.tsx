import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { PublicProfileDialog } from "@/components/PublicProfileDialog";

export const Route = createFileRoute("/admin/users")({ component: AdminUsersPage });

function AdminUsersPage() {
  const { ready, loading } = useAdminGuard();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;
  return (
    <AdminShell title="Users" description="Search members and manage admin access.">
      <UsersSection />
    </AdminShell>
  );
}

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
