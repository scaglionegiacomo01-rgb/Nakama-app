import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "./UserAvatar";
import { RankBadge } from "./RankBadge";
import { Calendar, Mountain } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Row = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  snowboard_level: string | null;
  favorite_brands: string[] | null;
  profile_picture_url: string | null;
  created_at: string;
  completed_trips: number;
};

export function PublicProfileDialog({ userId, open, onOpenChange }: { userId: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["public-profile", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_profile", { _user_id: userId! });
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      return rows[0] ?? null;
    },
  });

  const display = data?.username ? `@${data.username}` : (data?.full_name ?? t("common.member"));
  const joined = data ? new Date(data.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="sr-only">{t("pubprofile.title")}</DialogTitle></DialogHeader>
        {isLoading || !data ? (
          <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div>
            <div className="flex flex-col items-center text-center">
              <UserAvatar url={data.profile_picture_url} name={data.full_name ?? data.username} size="xl" />
              <h2 className="mt-3 font-display font-bold text-2xl">{display}</h2>
              {data.username && data.full_name && <p className="text-sm text-muted-foreground">{data.full_name}</p>}
              <div className="mt-3"><RankBadge completed={Number(data.completed_trips)} size="md" /></div>
            </div>

            {data.bio && (
              <div className="mt-5 rounded-xl bg-secondary/50 p-3 text-sm italic text-center">"{data.bio}"</div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat icon={Mountain} label={t("pubprofile.completed_trips")} value={String(data.completed_trips)} />
              <Stat icon={Calendar} label={t("pubprofile.joined")} value={joined} />
            </div>

            {data.snowboard_level && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("pubprofile.snowboard_level")}</div>
                <span className="inline-block text-sm px-2.5 py-1 rounded-full bg-ice text-ice-foreground capitalize">{data.snowboard_level}</span>
              </div>
            )}

            {data.favorite_brands && data.favorite_brands.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{t("pubprofile.favorite_brands")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.favorite_brands.map(b => (
                    <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{b}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3 text-center">
      <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Icon className="w-3 h-3" />{label}</div>
      <div className="font-display font-bold mt-0.5">{value}</div>
    </div>
  );
}
