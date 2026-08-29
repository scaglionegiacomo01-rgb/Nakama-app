export type ChecklistItem = { key: string; labelKey: string; hintKey?: string };
export type ChecklistGroup = { titleKey: string; items: ChecklistItem[] };

export const BEGINNER_CHECKLIST: ChecklistGroup[] = [
  {
    titleKey: "checklist.group_snowboard",
    items: [
      { key: "snowboard", labelKey: "checklist.snowboard" },
      { key: "boots", labelKey: "checklist.boots" },
      { key: "bindings", labelKey: "checklist.bindings" },
      { key: "helmet", labelKey: "checklist.helmet", hintKey: "checklist.helmet_hint" },
      { key: "goggles", labelKey: "checklist.goggles", hintKey: "checklist.goggles_hint" },
      { key: "gloves", labelKey: "checklist.gloves" },
      { key: "jacket", labelKey: "checklist.jacket" },
      { key: "pants", labelKey: "checklist.pants" },
      { key: "thermals", labelKey: "checklist.thermals" },
      { key: "socks", labelKey: "checklist.socks" },
    ],
  },
  {
    titleKey: "checklist.group_trip",
    items: [
      { key: "water", labelKey: "checklist.water" },
      { key: "lunch", labelKey: "checklist.lunch" },
      { key: "powerbank", labelKey: "checklist.powerbank", hintKey: "checklist.powerbank_hint" },
      { key: "skipass", labelKey: "checklist.skipass" },
      { key: "id", labelKey: "checklist.id" },
      { key: "backpack", labelKey: "checklist.backpack" },
    ],
  },
  {
    titleKey: "checklist.group_optional",
    items: [
      { key: "sunscreen", labelKey: "checklist.sunscreen", hintKey: "checklist.sunscreen_hint" },
      { key: "extra_socks", labelKey: "checklist.extra_socks" },
      { key: "neck_warmer", labelKey: "checklist.neck_warmer" },
      { key: "towel", labelKey: "checklist.towel" },
    ],
  },
];

export const ALL_CHECKLIST_ITEMS = BEGINNER_CHECKLIST.flatMap(g => g.items);
export const TOTAL_CHECKLIST_COUNT = ALL_CHECKLIST_ITEMS.length;

export const BEGINNER_TAGS = ["Beginner Friendly", "First Time Friendly"];
