import { createFileRoute } from "@tanstack/react-router";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { FileImage, Smartphone, Globe } from "lucide-react";

export const Route = createFileRoute("/admin_/brand")({ component: AdminBrand });

type Asset = { file: string; purpose: string; size: string };

const ASSETS: Asset[] = [
  { file: "/brand/logo.png", purpose: "Navbar logo (light mode)", size: "256×256 PNG" },
  { file: "/brand/logo-dark.png", purpose: "Navbar logo (dark mode)", size: "256×256 PNG" },
  { file: "/brand/favicon.ico", purpose: "Browser tab favicon", size: "multi-size .ico" },
  { file: "/brand/apple-touch-icon.png", purpose: "iOS home-screen icon", size: "180×180 PNG" },
  { file: "/brand/icon-192.png", purpose: "PWA / Android install icon", size: "192×192 PNG" },
  { file: "/brand/icon-512.png", purpose: "PWA splash / high-res icon", size: "512×512 PNG" },
];

function AdminBrand() {
  const { ready, loading } = useAdminGuard();
  if (loading || !ready) return <div className="max-w-6xl mx-auto px-4 py-12">Loading...</div>;

  return (
    <AdminShell
      title="Brand settings"
      description="Read-only overview of the branding assets currently used by the app. To rebrand, replace the files inside /public/brand/ with the same filenames — no code changes required."
    >
      <section>
        <h2 className="font-display font-bold text-xl inline-flex items-center gap-2"><FileImage className="w-5 h-5 text-primary" />Current assets</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {ASSETS.map(a => (
            <div key={a.file} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-secondary grid place-items-center overflow-hidden shrink-0">
                {a.file.endsWith(".ico") ? (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ICO</span>
                ) : (
                  <img src={a.file} alt="" loading="lazy" className="w-full h-full object-contain" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{a.purpose}</div>
                <code className="text-[11px] text-muted-foreground break-all">{a.file}</code>
                <div className="text-[11px] text-muted-foreground mt-0.5">{a.size}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-bold text-xl inline-flex items-center gap-2"><Smartphone className="w-5 h-5 text-primary" />PWA / Mobile</h2>
        <div className="mt-3 rounded-2xl border border-border bg-card p-5 space-y-2 text-sm">
          <Row k="Manifest" v="/manifest.json" />
          <Row k="App name" v="Nakama" />
          <Row k="Short name" v="Nakama" />
          <Row k="Display mode" v="standalone" />
          <Row k="Theme color" v="#0c2340" />
          <Row k="Background color" v="#ffffff" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display font-bold text-xl inline-flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />How to rebrand</h2>
        <ol className="mt-3 list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Prepare the 6 files above at the recommended sizes.</li>
          <li>Replace them inside <code className="px-1 py-0.5 rounded bg-secondary text-xs">/public/brand/</code> keeping the same filenames.</li>
          <li>Edit <code className="px-1 py-0.5 rounded bg-secondary text-xs">/public/manifest.json</code> if you need to change app name or theme color.</li>
          <li>Hard-refresh the browser (icons are cached aggressively).</li>
        </ol>
      </section>
    </AdminShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <code className="text-xs">{v}</code>
    </div>
  );
}
