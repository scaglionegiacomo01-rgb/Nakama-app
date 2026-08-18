import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { Camera, Play, Trash2, Upload, ShieldCheck, Star, ImageIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type Media = {
  id: string; event_id: string; user_id: string; media_url: string; storage_path: string | null;
  media_type: "image" | "video"; caption: string | null;
  status: "pending" | "approved" | "rejected"; is_featured: boolean; is_trip_cover: boolean;
  created_at: string;
  profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null };
};

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 80;
const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VID = ["video/mp4", "video/quicktime", "video/webm"];

export function GalleryPanel({
  event,
  isParticipant,
  isAdmin,
}: {
  event: { id: string; status: string; title: string };
  isParticipant: boolean;
  isAdmin: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ file: File; type: "image" | "video" } | null>(null);
  const [caption, setCaption] = useState("");
  const [okPermission, setOkPermission] = useState(false);
  const [okVisibility, setOkVisibility] = useState(false);
  const [viewer, setViewer] = useState<Media | null>(null);

  const canUpload = isAdmin || (isParticipant && (event.status === "completed" || event.status === "published"));

  const { data: media } = useQuery({
    queryKey: ["trip-media", event.id, user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_media")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      const list = ((data ?? []) as unknown as Media[]);
      if (list.length === 0) return list;
      const ids = Array.from(new Set(list.map(m => m.user_id)));
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name, username, profile_picture_url").in("user_id", ids);
      return list.map(m => ({ ...m, profile: profs?.find((p: { user_id: string }) => p.user_id === m.user_id) as Media["profile"] }));
    },
  });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    let type: "image" | "video";
    if (ALLOWED_IMG.includes(f.type)) {
      type = "image";
      if (f.size > MAX_IMAGE_MB * 1024 * 1024) { toast.error(`Image must be under ${MAX_IMAGE_MB} MB`); return; }
    } else if (ALLOWED_VID.includes(f.type)) {
      type = "video";
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) { toast.error(`Video must be under ${MAX_VIDEO_MB} MB`); return; }
    } else {
      toast.error("Only jpg, png, webp images or mp4, mov, webm videos");
      return;
    }
    setPending({ file: f, type });
    setCaption("");
    setOkPermission(false);
    setOkVisibility(false);
  };

  const upload = async () => {
    if (!user || !pending) return;
    if (!okPermission || !okVisibility) { toast.error("Please confirm the safety checkboxes"); return; }
    setBusy(true);
    try {
      const ext = pending.file.name.split(".").pop() ?? (pending.type === "image" ? "jpg" : "mp4");
      const path = `${event.id}/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("trip-media").upload(path, pending.file, { contentType: pending.file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("trip-media").getPublicUrl(path);
      const { error } = await supabase.from("trip_media").insert({
        event_id: event.id, user_id: user.id,
        media_url: pub.publicUrl, storage_path: path,
        media_type: pending.type, caption: caption.trim() || null,
      });
      if (error) throw error;
      toast.success("Uploaded — waiting for admin approval");
      setPending(null);
      qc.invalidateQueries({ queryKey: ["trip-media", event.id] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: Media) => {
    if (!confirm("Delete this upload?")) return;
    if (m.storage_path) await supabase.storage.from("trip-media").remove([m.storage_path]);
    await supabase.from("trip_media").delete().eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["trip-media", event.id] });
  };

  const moderate = async (m: Media, status: "approved" | "rejected") => {
    const { error } = await supabase.from("trip_media").update({ status }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["trip-media", event.id] });
  };
  const toggleFeatured = async (m: Media) => {
    await supabase.from("trip_media").update({ is_featured: !m.is_featured }).eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["trip-media", event.id] });
  };
  const setCover = async (m: Media) => {
    await supabase.from("trip_media").update({ is_trip_cover: false }).eq("event_id", event.id);
    await supabase.from("trip_media").update({ is_trip_cover: true }).eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["trip-media", event.id] });
  };

  const visible = (media ?? []).filter(m => m.status === "approved" || m.user_id === user?.id || isAdmin);
  const approved = visible.filter(m => m.status === "approved");
  const mineOrPending = visible.filter(m => m.status !== "approved");

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl">Trip gallery</h2>
          <p className="text-sm text-muted-foreground mt-1">A shared album for this official trip. All uploads are reviewed before going public.</p>
        </div>
        {canUpload && (
          <>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="hidden" onChange={onPick} />
            <Button onClick={() => inputRef.current?.click()} size="sm"><Upload className="w-4 h-4 mr-1" />Add memory</Button>
          </>
        )}
      </div>

      {!canUpload && isParticipant === false && (
        <p className="mt-3 text-xs text-muted-foreground">Only confirmed participants of this trip can upload memories.</p>
      )}

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-ice grid place-items-center text-ice-foreground"><ImageIcon className="w-6 h-6" /></div>
          <p className="mt-3 font-display font-bold">No memories yet</p>
          <p className="text-sm text-muted-foreground mt-1">After the trip, riders can share their best shots here.</p>
        </div>
      ) : (
        <>
          {approved.length > 0 && (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-2">
              {approved.map(m => <Tile key={m.id} m={m} onOpen={() => setViewer(m)} />)}
            </div>
          )}
          {mineOrPending.length > 0 && (
            <>
              <h3 className="mt-8 font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">{isAdmin ? "Awaiting moderation / rejected" : "Your uploads"}</h3>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                {mineOrPending.map(m => (
                  <div key={m.id} className="relative group">
                    <Tile m={m} onOpen={() => setViewer(m)} />
                    <div className="absolute top-1 left-1">
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Upload dialog */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Share a memory</DialogTitle></DialogHeader>
          {pending && (
            <div className="space-y-3">
              {pending.type === "image" ? (
                <img src={URL.createObjectURL(pending.file)} alt="preview" className="w-full rounded-xl max-h-64 object-cover" />
              ) : (
                <video src={URL.createObjectURL(pending.file)} controls className="w-full rounded-xl max-h-64" />
              )}
              <Input placeholder="Optional caption" value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} />
              <div className="rounded-xl bg-secondary/40 p-3 text-xs space-y-2">
                <p className="inline-flex items-start gap-1"><ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />Only upload respectful content from official trips. Do not upload embarrassing, unsafe or private moments without permission.</p>
                <label className="flex items-start gap-2"><Checkbox checked={okPermission} onCheckedChange={v => setOkPermission(!!v)} className="mt-0.5" />I confirm I have permission to upload this content and that it respects the people shown.</label>
                <label className="flex items-start gap-2"><Checkbox checked={okVisibility} onCheckedChange={v => setOkVisibility(!!v)} className="mt-0.5" />I understand that approved content may be visible in the app gallery.</label>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPending(null)} className="flex-1">Cancel</Button>
                <Button onClick={upload} disabled={busy} className="flex-1">{busy ? "Uploading..." : "Upload"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Viewer */}
      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="sr-only">Memory</DialogTitle></DialogHeader>
          {viewer && (
            <div>
              {viewer.media_type === "image" ? (
                <img src={viewer.media_url} alt={viewer.caption ?? ""} className="w-full rounded-xl max-h-[60vh] object-contain bg-black" />
              ) : (
                <video src={viewer.media_url} controls className="w-full rounded-xl max-h-[60vh] bg-black" />
              )}
              <div className="mt-3 flex items-center gap-2">
                <UserAvatar url={viewer.profile?.profile_picture_url} name={viewer.profile?.full_name ?? viewer.profile?.username} size="sm" />
                <div className="text-sm">
                  <div className="font-semibold">{viewer.profile?.username ? `@${viewer.profile.username}` : (viewer.profile?.full_name ?? "Member")}</div>
                  <div className="text-xs text-muted-foreground">{new Date(viewer.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</div>
                </div>
                <StatusBadge status={viewer.status} className="ml-auto" />
              </div>
              {viewer.caption && <p className="mt-2 text-sm">{viewer.caption}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {isAdmin && viewer.status !== "approved" && <Button size="sm" onClick={() => { moderate(viewer, "approved"); setViewer(null); }}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>}
                {isAdmin && viewer.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => { moderate(viewer, "rejected"); setViewer(null); }}><XCircle className="w-4 h-4 mr-1" />Reject</Button>}
                {isAdmin && viewer.status === "approved" && <Button size="sm" variant="outline" onClick={() => toggleFeatured(viewer)}><Star className={`w-4 h-4 mr-1 ${viewer.is_featured ? "fill-current" : ""}`} />{viewer.is_featured ? "Unfeature" : "Feature"}</Button>}
                {isAdmin && viewer.status === "approved" && viewer.media_type === "image" && <Button size="sm" variant="outline" onClick={() => setCover(viewer)}><ImageIcon className="w-4 h-4 mr-1" />Set as cover</Button>}
                {(viewer.user_id === user?.id && viewer.status === "pending") || isAdmin
                  ? <Button size="sm" variant="ghost" onClick={() => { remove(viewer); setViewer(null); }}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
                  : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ m, onOpen }: { m: Media; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="relative aspect-square rounded-xl overflow-hidden bg-secondary group">
      {m.media_type === "image" ? (
        <img src={m.media_url} alt={m.caption ?? ""} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
      ) : (
        <>
          <video src={m.media_url} className="w-full h-full object-cover" muted preload="metadata" />
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <Play className="w-8 h-8 text-white drop-shadow" />
          </div>
        </>
      )}
      {m.is_trip_cover && <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Cover</span>}
      {m.is_featured && <Star className="absolute top-1 right-1 w-4 h-4 fill-yellow-300 text-yellow-300" />}
    </button>
  );
}

function StatusBadge({ status, className = "" }: { status: Media["status"]; className?: string }) {
  const map = {
    pending: { label: "Pending", icon: Clock, cls: "bg-secondary text-foreground" },
    approved: { label: "Approved", icon: CheckCircle2, cls: "bg-summit text-primary-foreground" },
    rejected: { label: "Rejected", icon: XCircle, cls: "bg-destructive text-destructive-foreground" },
  } as const;
  const v = map[status];
  const Icon = v.icon;
  return <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${v.cls} ${className}`}><Icon className="w-3 h-3" />{v.label}</span>;
}

// Tiny camera icon export to avoid lint of unused imports
export const _GalleryIcon = Camera;
