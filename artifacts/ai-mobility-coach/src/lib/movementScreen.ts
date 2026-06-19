export interface ScreenQuestion {
  id: string;
  label: string;
}

export const SCREEN_QUESTIONS: Record<string, ScreenQuestion[]> = {
  "lower-back": [
    { id: "heelsFlat",  label: "When you squat down, do your heels stay flat on the ground?" },
    { id: "touchToes",  label: "Can you touch your toes without bending your knees?" },
    { id: "legsTo90",   label: "Lying on your back, can you lift both legs to 90 degrees without your lower back lifting off the floor?" },
  ],
  "hips": [
    { id: "squatParallel",    label: "Can you squat to parallel without your knees caving inward?" },
    { id: "singleLegBalance", label: "Standing on one leg, can you hold your balance for 10 seconds without swaying?" },
    { id: "touchToes",        label: "Can you touch your toes without bending your knees?" },
  ],
  "neck-shoulders": [
    { id: "overheadReach", label: "Can you raise both arms straight overhead without your lower back arching?" },
    { id: "shoulderClasp", label: "Can you clasp your hands behind your back — one from over the shoulder and one from below?" },
    { id: "headTurn",      label: "Can you turn your head fully left and right without pain or restriction?" },
  ],
  "knees": [
    { id: "kneeCave",       label: "Does your knee cave inward when you squat down?" },
    { id: "singleLegSquat", label: "Can you do a single-leg squat without losing balance?" },
    { id: "stairsKneePain", label: "Walking down stairs, do you feel pain or instability in the knee?" },
  ],
  "hamstrings": [
    { id: "touchToes",           label: "Can you touch your toes without bending your knees?" },
    { id: "straightLegRaise",    label: "Lying on your back, can you lift one straight leg to 90 degrees?" },
    { id: "standingForwardFold", label: "Can you do a standing forward fold and reach past your shins?" },
  ],
  "quads": [
    { id: "singleLegSquatNoCollapse", label: "Can you do a single-leg squat without your knee collapsing inward?" },
    { id: "heelSit",                  label: "Kneeling on one knee, can you sit back onto your heel comfortably?" },
    { id: "wallSit30",                label: "Can you hold a wall sit for 30 seconds without pain?" },
  ],
  "calves": [
    { id: "heelsFlat",    label: "Can you fully flatten your heels at the bottom of a squat?" },
    { id: "calfRaises10", label: "Standing on one foot, can you do 10 calf raises without cramping?" },
    { id: "heelWalk",     label: "Can you walk on your heels for 10 steps without difficulty?" },
  ],
  "chest": [
    { id: "shoulderClasp", label: "Can you clasp your hands behind your back — one from over the shoulder and one from below?" },
    { id: "wallSpine",     label: "Standing against a wall, can you flatten your entire spine including lower back against it?" },
    { id: "wallAngel",     label: "Can you do a wall angel (arms slide up a wall) without your lower back lifting off?" },
  ],
  "upper-back": [
    { id: "shoulderClasp", label: "Can you clasp your hands behind your back — one from over the shoulder and one from below?" },
    { id: "wallSpine",     label: "Standing against a wall, can you flatten your entire spine including lower back against it?" },
    { id: "wallAngel",     label: "Can you do a wall angel (arms slide up a wall) without your lower back lifting off?" },
  ],
  "mid-back": [
    { id: "shoulderClasp", label: "Can you clasp your hands behind your back — one from over the shoulder and one from below?" },
    { id: "wallSpine",     label: "Standing against a wall, can you flatten your entire spine including lower back against it?" },
    { id: "wallAngel",     label: "Can you do a wall angel (arms slide up a wall) without your lower back lifting off?" },
  ],
  "abs-core": [
    { id: "plankHold", label: "Can you hold a plank for 30 seconds without your hips sagging?" },
    { id: "legsOff6",  label: "Lying on your back, can you lift both legs 6 inches off the floor without your lower back arching?" },
    { id: "deadBug",   label: "Can you do a dead bug exercise (opposite arm/leg extension) without losing core tension?" },
  ],
  "arms": [
    { id: "armOverhead", label: "Can you fully straighten your arm overhead next to your ear?" },
    { id: "elbowBend",   label: "Can you bend your elbow fully so your hand touches your shoulder?" },
    { id: "wallPushup",  label: "Can you do a wall pushup without your elbows flaring out to the sides?" },
  ],
};

export interface ScreenMeta {
  shortLabel: string;
  badText: string;
  goodText: string;
  inverted?: boolean; // true = "yes" means the problem exists (e.g. knee cave, stair pain)
}

export const SCREEN_META: Record<string, ScreenMeta> = {
  // ── Original ──────────────────────────────────────────────────
  overheadReach:  { shortLabel: "Overhead reach",      badText: "Limited",            goodText: "Full range"      },
  heelsFlat:      { shortLabel: "Heel squat",           badText: "Heels lift",          goodText: "Heels flat"      },
  touchToes:      { shortLabel: "Toe touch",            badText: "Could not reach",     goodText: "Can touch toes"  },
  kneeCave:       { shortLabel: "Knee alignment",       badText: "Knee caves in",       goodText: "Knee stable",   inverted: true },
  shoulderClasp:  { shortLabel: "Shoulder clasp",       badText: "Could not clasp",     goodText: "Hands clasp"     },
  plankHold:      { shortLabel: "Plank hold",           badText: "Hips sag",            goodText: "Hips level"      },
  armOverhead:    { shortLabel: "Arm extension",        badText: "Arm bends",           goodText: "Fully straight"  },
  // ── New ───────────────────────────────────────────────────────
  legsTo90:                 { shortLabel: "Lying leg raise",      badText: "Lower back lifts",    goodText: "Stable lower back"  },
  squatParallel:            { shortLabel: "Deep squat alignment",  badText: "Knees cave",          goodText: "Knees track out"    },
  singleLegBalance:         { shortLabel: "Single-leg balance",   badText: "Swaying",             goodText: "Balanced 10s"       },
  headTurn:                 { shortLabel: "Head rotation",        badText: "Pain or restriction", goodText: "Full rotation"      },
  singleLegSquat:           { shortLabel: "Single-leg squat",     badText: "Loses balance",       goodText: "Stays balanced"     },
  stairsKneePain:           { shortLabel: "Stair descent",        badText: "Pain or instability", goodText: "No pain",          inverted: true },
  straightLegRaise:         { shortLabel: "Straight leg raise",   badText: "Can't reach 90°",     goodText: "Reaches 90°"        },
  standingForwardFold:      { shortLabel: "Forward fold",         badText: "Can't reach shins",   goodText: "Past shins"         },
  singleLegSquatNoCollapse: { shortLabel: "Single-leg squat",     badText: "Knee collapses",      goodText: "Knee stable"        },
  heelSit:                  { shortLabel: "Heel sit",             badText: "Uncomfortable",       goodText: "Comfortable"        },
  wallSit30:                { shortLabel: "Wall sit",             badText: "Can't hold 30s",      goodText: "Holds 30s"          },
  calfRaises10:             { shortLabel: "Calf raises",          badText: "Cramping",            goodText: "No cramp"           },
  heelWalk:                 { shortLabel: "Heel walk",            badText: "Difficulty",          goodText: "No difficulty"      },
  wallSpine:                { shortLabel: "Wall spine contact",   badText: "Gap in lower back",   goodText: "Full contact"       },
  wallAngel:                { shortLabel: "Wall angel",           badText: "Lower back lifts",    goodText: "Spine stays flat"   },
  legsOff6:                 { shortLabel: "Leg lowering",         badText: "Lower back arches",   goodText: "Spine stable"       },
  deadBug:                  { shortLabel: "Dead bug",             badText: "Loses tension",       goodText: "Core engaged"       },
  elbowBend:                { shortLabel: "Elbow flexion",        badText: "Limited range",       goodText: "Full range"         },
  wallPushup:               { shortLabel: "Wall pushup",          badText: "Elbows flare",        goodText: "Elbows aligned"     },
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
