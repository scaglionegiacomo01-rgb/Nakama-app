import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Send } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { RankBadge } from "@/components/RankBadge";
import { toast } from "sonner";

type Msg = { id: string; user_id: string; message: string; created_at: string;
  profile?: { full_name: string | null; username: string | null; profile_picture_url: string | null };
  completed?: number; };

export function TripChatPanel({ eventId, canPost, isAdmin }: { eventId: string; canPost: boolean; isAdmin: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["trip-chat", eventId],
    queryFn: async () => {
      const { data } = await supabase.from("trip_chat_messages").select("*").eq("event_id", eventId).order("created_at", { ascending: true }).limit(200);
      const list = (data ?? []) as unknown as Msg[];
      if (list.length === 0) return list;
      const ids = Array.from(new Set(list.map(m => m.user_id)));
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, username, profile_picture_url").in("user_id", ids);
      const { data: completed } = await supabase.from("event_registrations").select("user_id, events!inner(status)").in("user_id", ids).eq("status","confirmed").eq("events.status","completed");
      const completedByUser = new Map<string, number>();
      for (const r of (completed ?? []) as { user_id: string }[]) completedByUser.set(r.user_id, (completedByUser.get(r.user_id) ?? 0) + 1);
      return list.map(m => ({
        ...m,
        profile: profs?.find((p: { user_id: string }) => p.user_id === m.user_id) as Msg["profile"],
        completed: completedByUser.get(m.user_id) ?? 0,
      }));
    },
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const ch = supabase.channel(`trip-chat-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_chat_messages", filter: `event_id=eq.${eventId}` },
        () => qc.invalidateQueries({ queryKey: ["trip-chat", eventId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, qc]);

  const send = async () => {
    if (!user) return;
    const m = text.trim();
    if (!m) return;
    if (m.length > 500) { toast.error("500 chars max"); return; }
    const { error } = await supabase.from("trip_chat_messages").insert({ event_id: eventId, user_id: user.id, message: m });
    if (error) { toast.error(error.message); return; }
    setText("");
  };

  const remove = async (id: string) => {
    await supabase.from("trip_chat_messages").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["trip-chat", eventId] });
  };

  if (!canPost && !isAdmin) {
    return <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">Join this trip to access the group chat.</div>;
  }

  return (
    <div className="flex flex-col h-[60vh] rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(messages ?? []).length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hi 👋</p>}
        {(messages ?? []).map(m => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className="flex gap-2 items-start group">
              <UserAvatar url={m.profile?.profile_picture_url} name={m.profile?.full_name ?? m.profile?.username} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{m.profile?.username ? `@${m.profile.username}` : (m.profile?.full_name ?? "Member")}</span>
                  <RankBadge completed={m.completed ?? 0} size="xs" />
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString(undefined,{ hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
                  {(mine || isAdmin) && (
                    <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"><Trash2 className="w-3 h-3" /></button>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words mt-0.5">{m.message}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3 flex gap-2 items-end">
        <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Message the crew..." rows={1} maxLength={500} className="resize-none min-h-[40px]" />
        <div className="flex flex-col items-end gap-1">
          <Button onClick={send} disabled={!text.trim()} size="sm"><Send className="w-4 h-4" /></Button>
          <span className="text-[10px] text-muted-foreground">{text.length}/500</span>
        </div>
      </div>
    </div>
  );
}
