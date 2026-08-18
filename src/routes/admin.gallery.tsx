import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trash2, Star, ImageIcon, Play, Shield } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/admin/gallery")({ component: AdminGallery });

type Media = {
  id: string; event_id: string; user_id: string; media_url: string; storage_path: string | null;
  media_type: "image" | "video"; caption: string | null;
  status: "pending" | "approved" | "rejected"; is_featured: boolean; is_trip_cover: boolean;
  created_at: string;
  events?: { id: string; title: string; destination: string; date: string } | null;
  profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null };
};

function AdminGallery() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && user && !isAdmin) toast.error("Admin access required");
  }, [user, isAdmin, loading, navigate]);

  const { data: media } = useQuery({
    queryKey: ["admin-gallery", tab],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_media")
        .select("*, events(id, title, destination, date)")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(200);
      const list = ((data ?? []) as unknown as Media[]);
      if (list.length === 0) return list;
      const ids = Array.from(new Set(list.map(m => m.user_id)));
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, username, profile_picture_url").in("user_id", ids);
      return list.map(m => ({ ...m, profile: profs?.find((p: { user_id: string }) => p.user_id === m.user_id) as Media["profile"] }));
    },
  });

  const moderate = async (m: Media, status: "approved" | "rejected") => {
    const { error } = await supabase.from("trip_media").update({ status }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
  };
  const remove = async (m: Media) => {
    if (!confirm("Delete this upload?")) return;
    if (m.storage_path) await supabase.storage.from("trip-media").remove([m.storage_path]);
    await supabase.from("trip_media").delete().eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
  };
  const toggleFeatured = async (m: Media) => {
    await supabase.from("trip_media").update({ is_featured: !m.is_featured }).eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
  };
  const setCover = async (m: Media) => {
    await supabase.from("trip_media").update({ is_trip_cover: false }).eq("event_id", m.event_id);
    await supabase.from("trip_media").update({ is_trip_cover: true }).eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-12">Loading...</div>;
  if (!isAdmin) return <div className="max-w-5xl mx-auto px-4 py-12"><h1 className="text-2xl font-bold">Admin only</h1></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"><Shield className="w-3.5 h-3.5" />Moderation</div>
          <h1 className="text-3xl font-bold mt-1">Gallery moderation</h1>
        </div>
        <Link to="/admin"><Button variant="outline" size="sm">← Admin</Button></Link>
      </div>

      <div className="mt-6 flex gap-2">
        {(["pending", "approved", "rejected"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{t}</button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {(media ?? []).map(m => (
          <div key={m.id} className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="relative aspect-square bg-secondary">
              {m.media_type === "image" ? (
                <img src={m.media_url} alt={m.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <>
                  <video src={m.media_url} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 grid place-items-center bg-black/30"><Play className="w-8 h-8 text-white" /></div>
                </>
              )}
              {m.is_trip_cover && <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Cover</span>}
              {m.is_featured && <Star className="absolute top-1 right-1 w-4 h-4 fill-yellow-300 text-yellow-300" />}
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <UserAvatar url={m.profile?.profile_picture_url} name={m.profile?.full_name ?? m.profile?.username} size="sm" />
                <div className="text-xs min-w-0">
                  <div className="font-semibold truncate">{m.profile?.username ? `@${m.profile.username}` : (m.profile?.full_name ?? "Member")}</div>
                  <div className="text-muted-foreground">{new Date(m.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
                </div>
              </div>
              {m.events && (
                <Link to="/trips/$id" params={{ id: m.events.id }} className="block text-xs text-accent hover:underline truncate">
                  {m.events.title} · {m.events.destination}
                </Link>
              )}
              {m.caption && <p className="text-xs text-muted-foreground line-clamp-2">{m.caption}</p>}
              <div className="flex flex-wrap gap-1">
                {tab !== "approved" && <Button size="sm" onClick={() => moderate(m, "approved")} className="h-7 px-2 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>}
                {tab !== "rejected" && <Button size="sm" variant="outline" onClick={() => moderate(m, "rejected")} className="h-7 px-2 text-xs"><XCircle className="w-3 h-3 mr-1" />Reject</Button>}
                {tab === "approved" && <Button size="sm" variant="outline" onClick={() => toggleFeatured(m)} className="h-7 px-2 text-xs"><Star className="w-3 h-3 mr-1" />{m.is_featured ? "Unfeature" : "Feature"}</Button>}
                {tab === "approved" && m.media_type === "image" && <Button size="sm" variant="outline" onClick={() => setCover(m)} className="h-7 px-2 text-xs"><ImageIcon className="w-3 h-3 mr-1" />Cover</Button>}
                <Button size="sm" variant="ghost" onClick={() => remove(m)} className="h-7 px-2 text-xs"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>
        ))}
        {(media ?? []).length === 0 && <p className="text-muted-foreground col-span-full">Nothing to show in "{tab}".</p>}
      </div>
    </div>
  );
}
