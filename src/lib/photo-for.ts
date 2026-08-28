import heroImg from "@/assets/hero-mountain.jpg";

/**
 * Deterministic photo + crop/tint "look" per trip destination, so the same
 * location always renders the same way instead of reshuffling on every
 * render. Real per-location photos go in public/photos/ (see PHOTO_MAP);
 * until an organizer uploads one, every destination falls back to the
 * shared hero photo but still gets its own crop/tint/scale so cards don't
 * look identical.
 */
const PHOTO_MAP: Record<string, string[]> = {
  livigno: ["/photos/livigno.jpg", "/photos/livigno-2.jpg"],
  aprica: ["/photos/aprica.jpg"],
  valbondione: ["/photos/valbondione.jpg", "/photos/curo.jpg"],
  bormio: ["/photos/bormio.jpg"],
  madesimo: ["/photos/madesimo.jpg"],
};

export type PhotoLook = { pos: string; tint: string; scale: number };

const LOOKS: PhotoLook[] = [
  { pos: "50% 32%", tint: "oklch(0.40 0.17 5 / 0.30)", scale: 1.04 },
  { pos: "22% 62%", tint: "oklch(0.34 0.07 320 / 0.34)", scale: 1.0 },
  { pos: "78% 28%", tint: "oklch(0.62 0.24 350 / 0.22)", scale: 1.06 },
  { pos: "50% 70%", tint: "oklch(0.68 0.18 20 / 0.20)", scale: 1.02 },
  { pos: "12% 40%", tint: "oklch(0.40 0.17 5 / 0.22)", scale: 1.08 },
  { pos: "88% 60%", tint: "oklch(0.34 0.07 320 / 0.26)", scale: 1.03 },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function photoFor(destination: string | null | undefined): { src: string; look: PhotoLook } {
  const key = (destination ?? "").toLowerCase().split(/[,\s]+/)[0];
  const h = hash(key || "nakama");
  const set = PHOTO_MAP[key];
  return { src: set ? set[h % set.length] : heroImg, look: LOOKS[h % LOOKS.length] };
}
