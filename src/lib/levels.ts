export type LevelDef = { value: string; titleKey: string; descriptionKey: string };

export const SNOWBOARD_LEVELS: LevelDef[] = [
  { value: "beginner", titleKey: "level.beginner", descriptionKey: "level.sb_beginner_desc" },
  { value: "intermediate", titleKey: "level.intermediate", descriptionKey: "level.sb_intermediate_desc" },
  { value: "advanced", titleKey: "level.advanced", descriptionKey: "level.sb_advanced_desc" },
  { value: "expert", titleKey: "level.expert", descriptionKey: "level.sb_expert_desc" },
];

export const MOUNTAIN_LEVELS: LevelDef[] = [
  { value: "beginner", titleKey: "level.beginner", descriptionKey: "level.mt_beginner_desc" },
  { value: "intermediate", titleKey: "level.intermediate", descriptionKey: "level.mt_intermediate_desc" },
  { value: "advanced", titleKey: "level.advanced", descriptionKey: "level.mt_advanced_desc" },
];
