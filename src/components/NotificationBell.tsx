import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  related_event_id: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useI18n();

  const { data: notifs } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as unknown as Notif[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notif-${user.id}-${Math.random().toString(36).slice(2)}`);
    ch.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      },
      () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
    ).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  if (!user) return null;
  const unread = (notifs ?? []).filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };
  const markAll = async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };
  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] grid place-items-center font-bold">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="font-display font-bold text-sm">{t("notif.title")}</div>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">
              {t("notif.mark_all_read")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!notifs || notifs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("notif.empty")}</div>
          ) : (
            notifs.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`w-full text-left px-3 py-3 border-b border-border last:border-0 hover:bg-secondary transition ${!n.read ? "bg-ice/20" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{n.title}</div>
                    {n.message && (
                      <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {fmt(n.created_at)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
