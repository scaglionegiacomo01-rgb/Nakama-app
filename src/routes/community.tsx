import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Trash2, MessagesSquare } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { RankBadge } from "@/components/RankBadge";
import { PublicProfileDialog } from "@/components/PublicProfileDialog";

export const Route = createFileRoute("/community")({ component: Community });

type Msg = { id: string; user_id: string; message: string; created_at: string };
type ProfileLite = { user_id: string; full_name: string | null; username: string | null; profile_picture_url: string | null };

const MAX = 500;

function Community() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const { data: messages } = useQuery({
    queryKey: ["community-messages"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_messages")
        .select("id, user_id, message, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return ((data ?? []) as unknown as Msg[]).reverse();
    },
  });

  const userIds = useMemo(() => Array.from(new Set((messages ?? []).map(m => m.user_id))), [messages]);

  const { data: profiles } = useQuery({
    queryKey: ["community-profiles", userIds.sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, profile_picture_url")
        .in("user_id", userIds);
      return (data ?? []) as unknown as ProfileLite[];
    },
  });

  const { data: completedCounts } = useQuery({
    queryKey: ["community-completed", userIds.sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("user_id, events!inner(status)")
        .in("user_id", userIds)
        .eq("status", "confirmed")
        .eq("events.status", "completed");
      const counts: Record<string, number> = {};
      for (const r of (data ?? []) as unknown as { user_id: string }[]) {
        counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("community-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["community-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || msg.length > MAX) return;
    setSending(true);
    const { error } = await supabase.from("community_messages").insert({ user_id: user!.id, message: msg });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setText("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("community_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const openProfile = (uid: string) => { setProfileUserId(uid); setProfileOpen(true); };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12">Loading...</div>;
  if (!user) return null;

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
  const fmt = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 60000;
    if (diff < 1) return "just now";
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 60 * 24) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 flex flex-col h-[calc(100vh-9rem)]">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-summit grid place-items-center text-primary-foreground">
          <MessagesSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl">Community</h1>
          <p className="text-xs text-muted-foreground">Crew chat — share stoke, plans, mountain talk.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {!messages ? (
          <div className="text-muted-foreground text-sm text-center py-12">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-ice grid place-items-center text-ice-foreground">
              <MessagesSquare className="w-7 h-7" />
            </div>
            <p className="mt-4 font-display font-bold text-lg">No messages yet</p>
            <p className="text-sm text-muted-foreground">Be the first to say hi to the crew.</p>
          </div>
        ) : messages.map(m => {
          const p = profileMap.get(m.user_id);
          const name = p?.username ? `@${p.username}` : (p?.full_name ?? "Member");
          const canDelete = isAdmin || m.user_id === user.id;
          const completed = completedCounts?.[m.user_id] ?? 0;
          return (
            <div key={m.id} className="flex gap-3 group">
              <UserAvatar url={p?.profile_picture_url} name={p?.full_name ?? p?.username} size="md" onClick={() => openProfile(m.user_id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => openProfile(m.user_id)} className="font-semibold text-sm hover:underline truncate">{name}</button>
                  <RankBadge completed={completed} size="xs" />
                  <span className="text-xs text-muted-foreground">{fmt(m.created_at)}</span>
                  {canDelete && (
                    <button onClick={() => remove(m.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition" aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-0.5 text-sm whitespace-pre-wrap break-words">{m.message}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border pt-3">
        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Say something to the crew…"
            rows={1}
            className="resize-none min-h-[44px]"
          />
          <Button onClick={send} disabled={sending || !text.trim()} size="icon"><Send className="w-4 h-4" /></Button>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Be kind. Nobody gets left behind.</span>
          <span>{text.length}/{MAX}</span>
        </div>
      </div>

      <PublicProfileDialog userId={profileUserId} open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
