export interface ScreenQuestion {
  id: string;
  label: string;
}

export const SCREEN_QUESTIONS: Record<string, ScreenQuestion[]> = {
  "lower-back": [
    { id: "heelsFlat",     label: "When you squat down, do your heels stay flat on the ground?" },
    { id: "touchToes",     label: "Can you touch your toes without bending your knees?" },
  ],
  "hips": [
    { id: "heelsFlat",     label: "When you squat down, do your heels stay flat on the ground?" },
    { id: "touchToes",     label: "Can you touch your toes without bending your knees?" },
  ],
  "neck-shoulders": [
    { id: "overheadReach", label: "Can you raise both arms straight overhead without your lower back arching?" },
  ],
  "knees": [
    { id: "kneeCave",      label: "Does your knee cave inward when you squat down?" },
  ],
  "hamstrings": [
    { id: "touchToes",     label: "Can you touch your toes without bending your knees?" },
  ],
  "quads": [
    { id: "touchToes",     label: "Can you touch your toes without bending your knees?" },
  ],
  "calves": [
    { id: "heelsFlat",     label: "Can you fully flatten your heels at the bottom of a squat?" },
  ],
  "chest": [
    { id: "shoulderClasp", label: "Can you clasp your hands behind your back — one from over the shoulder and one from below?" },
  ],
  "upper-back": [
    { id: "shoulderClasp", label: "Can you clasp your hands behind your back — one from over the shoulder and one from below?" },
  ],
  "mid-back": [
    { id: "shoulderClasp", label: "Can you clasp your hands behind your back — one from over the shoulder and one from below?" },
  ],
  "abs-core": [
    { id: "plankHold",     label: "Can you hold a plank for 30 seconds without your hips sagging?" },
  ],
  "arms": [
    { id: "armOverhead",   label: "Can you fully straighten your arm overhead next to your ear?" },
  ],
};

export interface ScreenMeta {
  shortLabel: string;
  badText: string;
  goodText: string;
  inverted?: boolean; // true = "yes" means the problem exists (e.g. knee cave)
}

export const SCREEN_META: Record<string, ScreenMeta> = {
  overheadReach:  { shortLabel: "Overhead reach",    badText: "Limited",           goodText: "Full range"       },
  heelsFlat:      { shortLabel: "Heel squat",         badText: "Heels lift",         goodText: "Heels flat"       },
  touchToes:      { shortLabel: "Toe touch",          badText: "Could not reach",    goodText: "Can touch toes"   },
  kneeCave:       { shortLabel: "Knee alignment",     badText: "Knee caves in",      goodText: "Knee stable",  inverted: true },
  shoulderClasp:  { shortLabel: "Shoulder clasp",     badText: "Could not clasp",    goodText: "Hands clasp"      },
  plankHold:      { shortLabel: "Plank hold",         badText: "Hips sag",           goodText: "Hips level"       },
  armOverhead:    { shortLabel: "Arm extension",      badText: "Arm bends",          goodText: "Fully straight"   },
};

export type ComparisonStatus = "improved" | "maintained" | "no-change" | "regressed";

export interface ComparisonResult {
  id: string;
  shortLabel: string;
  originalText: string;
  retakeText: string;
  status: ComparisonStatus;
}

export function computeComparison(
  original: Record<string, "yes" | "no">,
  retake: Record<string, "yes" | "no">,
): ComparisonResult[] {
  const ids = new Set([...Object.keys(original), ...Object.keys(retake)]);
  const results: ComparisonResult[] = [];

  for (const id of ids) {
    const meta = SCREEN_META[id];
    const orig = original[id];
    const ret  = retake[id];
    if (!meta || !orig || !ret) continue;

    const origGood = meta.inverted ? orig === "no" : orig === "yes";
    const retGood  = meta.inverted ? ret  === "no" : ret  === "yes";

    let status: ComparisonStatus;
    if (!origGood && retGood)      status = "improved";
    else if (origGood && retGood)  status = "maintained";
    else if (origGood && !retGood) status = "regressed";
    else                           status = "no-change";

    results.push({
      id,
      shortLabel:   meta.shortLabel,
      originalText: origGood ? meta.goodText : meta.badText,
      retakeText:   retGood  ? meta.goodText : meta.badText,
      status,
    });
  }

  return results;
}
