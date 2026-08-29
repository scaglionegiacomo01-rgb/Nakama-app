export const EVENT_TAGS = [
  "Beginner Friendly",
  "Chill Day",
  "Park Session",
  "Progression Day",
  "Powder Day",
  "Mountain Walk",
] as const;


export type EventTag = typeof EVENT_TAGS[number];

export const TAG_STYLE: Record<string, string> = {
  "First Time Friendly": "bg-ice text-ice-foreground",
  "Beginner Friendly": "bg-ice text-ice-foreground",
  "Chill Day": "bg-secondary",
  "Social Ride": "bg-secondary",
  "Park Session": "bg-primary text-primary-foreground",
  "Progression Day": "bg-primary text-primary-foreground",
  "Powder Day": "bg-summit text-primary-foreground",
  "Mountain Walk": "bg-secondary",
  "Packed Lunch": "bg-secondary",
  "Rental Available": "bg-secondary",
  "Carpool": "bg-secondary",
  // legacy / generic concept tags — kept here so old data still styles,
  // but filtered out of card display via GENERIC_TAGS below.
  "No One Left Behind": "bg-summit text-primary-foreground",
  "Nobody gets left behind": "bg-summit text-primary-foreground",
};

// Generic brand/concept tags that should NOT appear on trip cards.
// (They describe the whole app, not a specific trip.)
export const GENERIC_TAGS = new Set<string>([
  "No One Left Behind",
  "Nobody gets left behind",
  "Nobody Gets Left Behind",
]);

// Priority order for the (max 3) tags visible on a card.
const PRIORITY_TAGS = [
  "First Time Friendly",
  "Beginner Friendly",
  "Rental Available",
  "Packed Lunch",
  "Carpool",
  "Powder Day",
  "Park Session",
  "Progression Day",
  "Chill Day",
  "Social Ride",
  "Mountain Walk",
];

export function getCardTags(tags: string[] | null | undefined, max = 3): { visible: string[]; overflow: number } {
  const clean = (tags ?? []).filter((t) => t && !GENERIC_TAGS.has(t));
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const p of PRIORITY_TAGS) if (clean.includes(p) && !seen.has(p)) { ordered.push(p); seen.add(p); }
  for (const t of clean) if (!seen.has(t)) { ordered.push(t); seen.add(t); }
  return { visible: ordered.slice(0, max), overflow: Math.max(0, ordered.length - max) };
}

// Tags are stored in the DB as fixed English strings (see EVENT_TAGS above) —
// this only maps them to a translated label for display, the stored value
// never changes with the language toggle.
const TAG_LABEL_KEY: Record<string, string> = {
  "First Time Friendly": "tag.first_time_friendly",
  "Beginner Friendly": "tag.beginner_friendly",
  "Chill Day": "tag.chill_day",
  "Social Ride": "tag.social_ride",
  "Park Session": "tag.park_session",
  "Progression Day": "tag.progression_day",
  "Powder Day": "tag.powder_day",
  "Mountain Walk": "tag.mountain_walk",
  "Packed Lunch": "tag.packed_lunch",
  "Rental Available": "tag.rental_available",
  Carpool: "tag.carpool",
};

export function tagLabel(tag: string, t: (key: string) => string): string {
  const key = TAG_LABEL_KEY[tag];
  return key ? t(key) : tag;
}

const TYPE_LABEL_KEY: Record<string, string> = {
  snowboard: "type.snowboard",
  mountain_walk: "type.mountain_walk",
  skate: "type.skate",
  surf: "type.surf",
};

export function eventTypeLabel(type: string, t: (key: string) => string): string {
  const key = TYPE_LABEL_KEY[type];
  return key ? t(key) : type;
}
