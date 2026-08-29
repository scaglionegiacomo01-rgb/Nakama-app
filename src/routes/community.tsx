import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Send, Trash2, MessagesSquare } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { RankBadge } from "@/components/RankBadge";
import { PublicProfileDialog } from "@/components/PublicProfileDialog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/community")({ component: Community });

type Msg = { id: string; user_id: string; message: string; created_at: string };
type ProfileLite = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  profile_picture_url: string | null;
};

const MAX = 500;

function Community() {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

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

  const userIds = useMemo(
    () => Array.from(new Set((messages ?? []).map((m) => m.user_id))),
    [messages],
  );

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

  const { data: riderCount } = useQuery({
    queryKey: ["community-rider-count"],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const [onlineCount, setOnlineCount] = useState(1);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("community-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["community-messages"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  // Presence — live "online" count for the LIVE chip
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("community-presence", {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ online_at: new Date().toISOString() });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || msg.length > MAX) return;
    setSending(true);
    const { error } = await supabase
      .from("community_messages")
      .insert({ user_id: user!.id, message: msg });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("community_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const openProfile = (uid: string) => {
    setProfileUserId(uid);
    setProfileOpen(true);
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12">{t("common.loading")}</div>;
  if (!user) return null;

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const fmt = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 60000;
    if (diff < 1) return t("community.time_now");
    if (diff < 60) return t("community.time_min_ago", { n: Math.floor(diff) });
    if (diff < 60 * 24) return t("community.time_hour_ago", { n: Math.floor(diff / 60) });
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-9rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-0 py-4 border-b border-border">
        <span className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-primary to-nakama-pink grid place-items-center shrink-0">
          <MessagesSquare className="w-[19px] h-[19px]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[22px] leading-[1.1] tracking-[-0.04em]">
            {t("nav.community")}
          </div>
          <div className="mt-[3px] text-[11px] text-muted-foreground">
            {t("community.stats", { riders: riderCount ?? "—", online: onlineCount })}
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-[6px] px-2.5 py-[5px] rounded-full bg-secondary text-[10px] font-bold tracking-[0.1em] whitespace-nowrap">
          <span className="w-[6px] h-[6px] rounded-full bg-nakama-coral nk-pulse" />
          LIVE
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-0 py-4 flex flex-col gap-4">
        {!messages ? (
          <div className="text-muted-foreground text-sm text-center py-12">
            {t("community.loading_messages")}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-ice grid place-items-center text-ice-foreground">
              <MessagesSquare className="w-7 h-7" />
            </div>
            <p className="mt-4 font-display font-bold text-lg">{t("community.empty_title")}</p>
            <p className="text-sm text-muted-foreground">{t("community.empty_body")}</p>
          </div>
        ) : (
          messages.map((m) => {
            const p = profileMap.get(m.user_id);
            const name = p?.username ? `@${p.username}` : (p?.full_name ?? t("common.member"));
            const canDelete = isAdmin || m.user_id === user.id;
            const completed = completedCounts?.[m.user_id] ?? 0;
            const isMine = m.user_id === user.id;

            return (
              <div key={m.id} className={cn("flex gap-[11px] group", isMine && "flex-row-reverse")}>
                <UserAvatar
                  url={p?.profile_picture_url}
                  name={p?.full_name ?? p?.username}
                  onClick={() => openProfile(m.user_id)}
                  className="h-[38px] w-[38px] text-xs shrink-0"
                />
                <div className={cn("min-w-0 flex-1", isMine && "flex flex-col items-end")}>
                  <div
                    className={cn(
                      "flex items-center gap-[7px] flex-wrap",
                      isMine && "flex-row-reverse",
                    )}
                  >
                    {isMine ? (
                      <span className="text-[13px] font-semibold">{t("community.you")}</span>
                    ) : (
                      <button
                        onClick={() => openProfile(m.user_id)}
                        className="truncate text-[13px] font-semibold hover:underline"
                      >
                        {name}
                      </button>
                    )}
                    {!isMine && <RankBadge completed={completed} size="xs" interactive={false} />}
                    <span className="text-[11px] text-muted-foreground">{fmt(m.created_at)}</span>
                    {canDelete && (
                      <button
                        onClick={() => remove(m.id)}
                        className={cn(
                          "text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive",
                          !isMine && "ml-auto",
                        )}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mt-[6px] max-w-[82%] whitespace-pre-wrap break-words px-[13px] py-[11px] text-[13.5px] leading-[1.45]",
                      isMine
                        ? "rounded-[16px_16px_5px_16px] bg-gradient-to-br from-primary to-[oklch(0.34_0.13_350)] text-primary-foreground"
                        : "rounded-[16px_16px_16px_5px] bg-[oklch(0.22_0.026_290)]",
                    )}
                  >
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border px-4 md:px-0 pt-3 pb-4">
        <div className="flex items-center gap-[9px]">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("community.composer_placeholder")}
            className="h-[46px] flex-1 min-w-0 rounded-[16px] border border-border bg-[oklch(0.24_0.028_290)] px-[15px] text-base md:text-[13.5px] placeholder:text-muted-foreground focus:outline-none focus:border-nakama-pink"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            aria-label={t("common.send")}
            className="h-[46px] w-[46px] shrink-0 rounded-[16px] bg-gradient-to-br from-[oklch(0.45_0.19_5)] to-[oklch(0.36_0.15_355)] text-white grid place-items-center shadow-[0_8px_22px_-10px_oklch(0.40_0.17_5)] disabled:opacity-50 transition"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className="mt-[9px] flex justify-between text-[11px] text-muted-foreground">
          <span>{t("community.footer_note")}</span>
          <span>
            {text.length}/{MAX}
          </span>
        </div>
      </div>

      <PublicProfileDialog
        userId={profileUserId}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </div>
  );
}
