export type Metrics = {
  /** average frame-to-frame motion energy (0-100 scale, ~4 is ideal) */
  energy: number;
  /** share of sampled pixels that changed noticeably (fine detail of the hand) */
  detail: number;
  /** horizontal centre of motion, 0 = left edge, 1 = right edge */
  centroidX: number;
  /** vertical centre of motion, 0 = top, 1 = bottom */
  centroidY: number;
  /** share of motion happening in the upper (face) band */
  faceBand: number;
  /** frame-to-frame variability of energy — high means jerky */
  jitter: number;
};

export type Criterion = {
  key: "handshape" | "location" | "movement" | "expression";
  label: string;
  score: number;
  matched: boolean;
  note: string;
  tip: string;
};

export type Result = {
  score: number;
  feedback: string;
  criteria: Criterion[];
  tips: string[];
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const closeness = (value: number, ideal: number, tolerance: number) =>
  Math.max(0, 1 - Math.abs(value - ideal) / tolerance);

export function analyseAttempt(
  m: Metrics,
  sign?: { gloss: string; handshape: string; location: string; movement: string; expression: string },
): Result {
  const still = m.energy < 0.6;

  const handshape = clamp(45 + closeness(m.detail, 0.09, 0.12) * 55);
  const location = clamp(
    40 +
      (closeness(m.centroidX, 0.5, 0.45) * 0.55 + closeness(m.centroidY, 0.52, 0.45) * 0.45) * 60,
  );
  const movement = clamp(
    42 + (closeness(m.energy, 4, 8) * 0.7 + Math.max(0, 1 - m.jitter / 3) * 0.3) * 58,
  );
  const expression = clamp(45 + closeness(m.faceBand, 0.3, 0.35) * 55);

  const criteria: Criterion[] = [
    {
      key: "handshape",
      label: "Handshape",
      score: still ? 30 : handshape,
      matched: !still && handshape >= 75,
      note:
        sign?.handshape ??
        "Fingers and palm shape held clearly enough for the camera to read.",
      tip:
        m.detail < 0.05
          ? "Bring your hand closer to the camera — the shape is too small in frame to read."
          : "Hold the finished handshape still for half a second so it reads clearly.",
    },
    {
      key: "location",
      label: "Location",
      score: still ? 35 : location,
      matched: !still && location >= 75,
      note: sign?.location ?? "Sign kept inside the signing space in front of your torso.",
      tip:
        m.centroidY < 0.32
          ? "Your signing space drifted too high — lower your hands towards chest level."
          : m.centroidY > 0.72
            ? "Your hands sat too low in frame — raise them to chest/chin height."
            : Math.abs(m.centroidX - 0.5) > 0.2
              ? "Recentre yourself: the motion happened off to one side of the frame."
              : "Keep the whole gesture inside the frame from start to finish.",
    },
    {
      key: "movement",
      label: "Movement",
      score: still ? 25 : movement,
      matched: !still && movement >= 75,
      note: sign?.movement ?? "Path, direction and rhythm of the gesture.",
      tip: still
        ? "Almost no movement was detected — repeat the full motion with your hands in frame."
        : m.energy > 8
          ? "Slow down — the motion is rushed. Try it at half speed and stop cleanly at the end."
          : m.jitter > 3
            ? "Smooth it out: the motion was jerky. One continuous path, then hold."
            : "Add a clear pause at the end position to mark the sign's finish.",
    },
    {
      key: "expression",
      label: "Expression",
      score: still ? 40 : expression,
      matched: !still && expression >= 75,
      note: sign?.expression ?? "Face visible with the matching non-manual signal.",
      tip:
        m.faceBand < 0.12
          ? "Your face is out of frame or completely still — expression is part of the sign."
          : m.faceBand > 0.55
            ? "Most of the motion was up near your face — keep the head steady and let the hands move."
            : "Match the expression to the meaning while you sign, not after.",
    },
  ];

  const score = clamp(
    criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length,
  );

  const weakest = criteria.filter((c) => !c.matched).sort((a, b) => a.score - b.score);
  const tips = weakest.length
    ? weakest.slice(0, 3).map((c) => `${c.label}: ${c.tip}`)
    : ["Everything matched — try the same sign at conversational speed to lock it in."];

  const feedback = still
    ? "Barely any movement was detected — make sure your hands are inside the frame and repeat the motion more fully."
    : weakest.length === 0
      ? `Clean attempt at ${sign?.gloss ?? "this sign"} — all four components matched.`
      : `Matched ${criteria.length - weakest.length} of 4 components. Focus next on ${weakest
          .slice(0, 2)
          .map((c) => c.label.toLowerCase())
          .join(" and ")}.`;

  return { score, feedback, criteria, tips };
}
