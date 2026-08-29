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
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin_/users")({ component: AdminUsersPage });

function AdminUsersPage() {
  const { ready, loading } = useAdminGuard();
  const { t } = useI18n();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">{t("common.loading")}</div>;
  return (
    <AdminShell title={t("admin.nav_users")} description={t("admin.users_desc")}>
      <UsersSection />
    </AdminShell>
  );
}

function UsersSection() {
  const { t } = useI18n();
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
    if (error) toast.error(error.message); else { toast.success(t("admin.toast_promoted")); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
  };
  const demote = async (uid: string) => {
    if (adminCount <= 1) return toast.error(t("admin.toast_cannot_demote_last"));
    if (!confirm(t("admin.confirm_demote"))) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
    if (error) toast.error(error.message); else { toast.success(t("admin.toast_demoted")); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder={t("admin.search_users_placeholder")} value={search} onChange={e => setSearch(e.target.value)} className="md:w-96" />
        <span className="text-xs text-muted-foreground">{t("admin.n_users_n_admins", { users: filtered.length, admins: adminCount })}</span>
      </div>
      <div className="mt-4 space-y-2">
        {filtered.map(u => (
          <div key={u.user_id} className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-3 min-w-0">
              <UserAvatar url={u.profile_picture_url ?? undefined} name={u.full_name ?? undefined} size="md"
                onClick={() => { setProfileUserId(u.user_id); setProfileOpen(true); }} />
              <div className="min-w-0">
                <button onClick={() => { setProfileUserId(u.user_id); setProfileOpen(true); }} className="font-semibold text-sm hover:underline text-left">
                  {(u.full_name && u.full_name.trim()) || u.username || t("common.member")} {u.is_admin && <span className="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">{t("nav.admin")}</span>}
                </button>
                <div className="text-xs text-muted-foreground">{u.email} · {u.phone ?? t("admin.no_phone")} · {u.snowboard_level ?? t("admin.level_na")} · {t("admin.n_trips", { n: u.completed_trips })}</div>
              </div>
            </div>
            <div className="flex gap-1">
              {u.is_admin
                ? <Button size="sm" variant="ghost" onClick={() => demote(u.user_id)}>{t("admin.demote")}</Button>
                : <Button size="sm" variant="outline" onClick={() => promote(u.user_id)}><ShieldCheck className="w-4 h-4 mr-1" />{t("admin.make_admin")}</Button>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground">{t("admin.no_users_match")}</p>}
      </div>
      <PublicProfileDialog userId={profileUserId} open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
