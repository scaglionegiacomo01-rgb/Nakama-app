import { useEffect, useRef } from "react";

export type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 46.4, lng: 10.8 }; // roughly the Alps

// Leaflet touches `document`/`navigator` at module scope, so it can only ever
// be imported on the client — never as a static import (that would crash SSR).
// Same pattern as PassportMap.tsx, but this map is interactive (click/drag to
// place a pin) and uses a colorful light basemap instead of the dark one used
// for the read-only Passport display.
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
      const map = L.map(containerRef.current).setView([start.lat, start.lng], value ? 11 : 6);
      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
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
    <div>
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
