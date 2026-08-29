import { useEffect, useRef } from "react";

export type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 46.4, lng: 10.8 }; // roughly the Alps

// Leaflet touches `document`/`navigator` at module scope, so it can only ever
// be imported on the client — never as a static import (that would crash SSR).
// Same pattern as PassportMap.tsx, but this map is interactive: click or
// drag the pin to place it.
export function LocationPickerMap({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [leafletModule] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      const L = ((leafletModule as unknown as { default?: typeof import("leaflet") }).default ??
        leafletModule) as typeof import("leaflet");
      if (cancelled || !containerRef.current) return;

      const start = value ?? DEFAULT_CENTER;
      const map = L.map(containerRef.current, { attributionControl: false }).setView(
        [start.lat, start.lng],
        value ? 11 : 6,
      );
      mapRef.current = map;
      L.control.attribution({ prefix: false }).addTo(map);

      // OpenTopoMap: free, no API key required, and a colorful, illustrated
      // terrain style (green/brown shading, contour lines) that fits a
      // mountain app better than a flat street map — and unlike CARTO's
      // basemaps, which now require a key and render as an "API key
      // required" placeholder. maxNativeZoom caps the actual tile fetches
      // at 17 (their real coverage) while still letting admins zoom in a
      // bit further to fine-tune a pin, with the last tile upscaled.
      L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        attribution:
          'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (CC-BY-SA)',
        subdomains: "abc",
        maxZoom: 19,
        maxNativeZoom: 17,
      }).addTo(map);

      const marker = L.marker([start.lat, start.lng], {
        draggable: true,
        opacity: value ? 1 : 0,
      }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current({ lat: pos.lat, lng: pos.lng });
      });
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        marker.setOpacity(1);
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only initialize once — external updates (e.g. from search) are applied
    // via the effect below instead of re-creating the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!value || !map || !marker) return;
    marker.setLatLng([value.lat, value.lng]);
    marker.setOpacity(1);
    map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [value?.lat, value?.lng]);

  return (
    // `isolate` confines Leaflet's internal panes/controls (which use
    // z-index up to 800) to this element's own stacking context, so they
    // can never paint over the app's fixed header/bottom nav (z-40)
    // elsewhere on the page while scrolling.
    <div className="isolate">
      <div
        ref={containerRef}
        className="h-[240px] sm:h-[320px] w-full rounded-2xl overflow-hidden border border-border"
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Click the map or drag the pin to fine-tune the spot.
      </p>
    </div>
  );
}
