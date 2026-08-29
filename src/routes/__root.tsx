import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

// These two fall back in place of RootComponent itself (not inside its
// <Outlet />), so they can't rely on I18nProvider being mounted — detect the
// language the same way i18n.tsx does, independently.
function detectFallbackLang(): "en" | "it" {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem("lang");
    if (stored === "en" || stored === "it") return stored;
  } catch {
    /* ignore */
  }
  const nav = (window.navigator.language || "en").toLowerCase();
  return nav.startsWith("it") ? "it" : "en";
}

function NotFoundComponent() {
  const it = detectFallbackLang() === "it";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {it ? "Pagina non trovata" : "Page not found"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {it
            ? "La pagina che cerchi non esiste o è stata spostata."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {it ? "Torna alla home" : "Go home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const it = detectFallbackLang() === "it";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {it ? "Questa pagina non si è caricata" : "This page didn't load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {it
            ? "Qualcosa è andato storto da parte nostra. Puoi provare ad aggiornare o tornare alla home."
            : "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {it ? "Riprova" : "Try again"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {it ? "Torna alla home" : "Go home"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0b0f12" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Nakama" },
      { title: "Nakama — Nobody gets left behind." },
      {
        name: "description",
        content:
          "Find your people in the mountains. Join official snowboard and mountain trips, share rides, check in safely, and never ride alone.",
      },
      { property: "og:title", content: "Nakama — Nobody gets left behind." },
      {
        property: "og:description",
        content:
          "Find your people in the mountains. Join official snowboard and mountain trips, share rides, check in safely, and never ride alone.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Nakama" },
      { property: "og:image", content: "/brand/nakama-logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/brand/nakama-logo.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/brand/nakama-logo.png", type: "image/png" },
      { rel: "icon", type: "image/png", href: "/brand/icon-192.png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { AuthProvider } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Layout>
            <Outlet />
          </Layout>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
