import { useEffect, useRef, useState } from "react";

export type PassportMapPlace = {
  name: string;
  count: number;
  last: string;
  lat: number;
  lng: number;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// Leaflet touches `document`/`navigator` at module scope, so it can only ever
// be imported on the client — never as a static import (that would crash SSR).
export function PassportMap({
  places,
  heightClassName = "h-[280px] sm:h-[380px]",
}: {
  places: PassportMapPlace[];
  heightClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (places.length === 0) return;
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    (async () => {
      const [leafletModule] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      const L = ((leafletModule as unknown as { default?: typeof import("leaflet") }).default ??
        leafletModule) as typeof import("leaflet");
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: false });
      L.control.attribution({ prefix: false }).addTo(map);

      // OpenTopoMap: free, no API key required, and a colorful, illustrated
      // terrain style (green/brown shading, contour lines) that fits a
      // mountain app better than a flat street map — and unlike CARTO's
      // basemaps, which now require a key and render as an "API key
      // required" placeholder.
      L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        attribution:
          'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (CC-BY-SA)',
        subdomains: "abc",
        maxZoom: 17,
      }).addTo(map);

      const icon = L.divIcon({
        className: "nakama-pin",
        html: '<span class="nakama-pin-dot"></span>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
      });

      const points: [number, number][] = places.map((p) => [p.lat, p.lng]);
      for (const p of places) {
        L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div><strong>${escapeHtml(p.name)}</strong><br/>${p.count} ${p.count === 1 ? "visit" : "visits"} · last ${escapeHtml(p.last)}</div>`,
          );
      }

      if (points.length === 1) {
        map.setView(points[0], 8);
      } else {
        map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [places]);

  if (places.length === 0) return null;

  return (
    // `isolate` confines Leaflet's internal panes/controls (which use
    // z-index up to 800) to this element's own stacking context, so they
    // can never paint over the app's fixed header/bottom nav (z-40)
    // elsewhere on the page while scrolling.
    <div className="relative isolate">
      <div
        ref={containerRef}
        className={`nakama-passport-map ${heightClassName} w-full rounded-2xl overflow-hidden border border-border`}
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-secondary text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
    </div>
  );
}
