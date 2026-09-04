type Props = {
  gloss: string;
  handshape: string;
  location: string;
  movement: string;
  imageKey?: string;
  className?: string;
};

type FingerPose = { length: number; bend: number; spread: number };
type HandPose = {
  fingers: [FingerPose, FingerPose, FingerPose, FingerPose];
  thumb: "open" | "side" | "tucked" | "touch-index" | "touch-middle" | "touch-ring" | "touch-little";
  rotate?: number;
};

const extended = (spread = 0): FingerPose => ({ length: 1, bend: 0, spread });
const curled = (spread = 0): FingerPose => ({ length: 0.56, bend: 24, spread });
const hooked = (spread = 0): FingerPose => ({ length: 0.78, bend: 48, spread });
const DEFAULT_POSE: HandPose = { fingers: [extended(-14), extended(-5), extended(5), extended(14)], thumb: "open" };

const LETTER_POSES: Record<string, HandPose> = {
  A: { fingers: [curled(-4), curled(-1), curled(2), curled(5)], thumb: "side" },
  B: { fingers: [extended(-2), extended(-1), extended(1), extended(2)], thumb: "tucked" },
  C: { fingers: [hooked(-8), hooked(-3), hooked(3), hooked(8)], thumb: "open", rotate: 16 },
  D: { fingers: [extended(), curled(), curled(2), curled(4)], thumb: "touch-middle" },
  E: { fingers: [hooked(-3), hooked(-1), hooked(1), hooked(3)], thumb: "tucked" },
  F: { fingers: [curled(), extended(-3), extended(2), extended(7)], thumb: "touch-index" },
  G: { fingers: [extended(), curled(), curled(), curled()], thumb: "open", rotate: 88 },
  H: { fingers: [extended(-2), extended(3), curled(), curled()], thumb: "tucked", rotate: 88 },
  I: { fingers: [curled(), curled(), curled(), extended(7)], thumb: "tucked" },
  J: { fingers: [curled(), curled(), curled(), extended(7)], thumb: "tucked", rotate: -12 },
  K: { fingers: [extended(-10), extended(12), curled(), curled()], thumb: "touch-middle" },
  L: { fingers: [extended(), curled(), curled(), curled()], thumb: "open" },
  M: { fingers: [curled(-5), curled(-2), curled(2), curled(5)], thumb: "tucked" },
  N: { fingers: [curled(-3), curled(1), curled(3), curled(5)], thumb: "tucked" },
  O: { fingers: [hooked(-6), hooked(-2), hooked(2), hooked(6)], thumb: "touch-index", rotate: 14 },
  P: { fingers: [extended(-10), extended(12), curled(), curled()], thumb: "touch-middle", rotate: 154 },
  Q: { fingers: [extended(), curled(), curled(), curled()], thumb: "open", rotate: 154 },
  R: { fingers: [extended(7), extended(-7), curled(), curled()], thumb: "tucked" },
  S: { fingers: [curled(-4), curled(-1), curled(2), curled(5)], thumb: "tucked" },
  T: { fingers: [curled(), curled(), curled(), curled()], thumb: "touch-index" },
  U: { fingers: [extended(-2), extended(2), curled(), curled()], thumb: "tucked" },
  V: { fingers: [extended(-12), extended(12), curled(), curled()], thumb: "tucked" },
  W: { fingers: [extended(-12), extended(), extended(12), curled()], thumb: "tucked" },
  X: { fingers: [hooked(), curled(), curled(), curled()], thumb: "tucked" },
  Y: { fingers: [curled(), curled(), curled(), extended(14)], thumb: "open" },
  Z: { fingers: [extended(), curled(), curled(), curled()], thumb: "tucked" },
};

const NUMBER_POSES: Record<string, HandPose> = {
  "0": LETTER_POSES["O"] ?? DEFAULT_POSE,
  "1": { fingers: [extended(), curled(), curled(), curled()], thumb: "tucked" },
  "2": { fingers: [extended(-10), extended(10), curled(), curled()], thumb: "tucked" },
  "3": { fingers: [extended(-7), extended(8), curled(), curled()], thumb: "open" },
  "4": { fingers: [extended(-10), extended(-3), extended(4), extended(11)], thumb: "tucked" },
  "5": { fingers: [extended(-14), extended(-5), extended(5), extended(14)], thumb: "open" },
  "6": { fingers: [extended(-8), extended(), extended(8), curled()], thumb: "touch-little" },
  "7": { fingers: [extended(-8), extended(), curled(), extended(8)], thumb: "touch-ring" },
  "8": { fingers: [extended(-8), curled(), extended(), extended(8)], thumb: "touch-middle" },
  "9": { fingers: [curled(), extended(-7), extended(2), extended(10)], thumb: "touch-index" },
};

function inferPose(gloss: string, handshape: string): HandPose {
  const key = gloss.trim().toUpperCase();
  const letterPose = LETTER_POSES[key];
  if (letterPose) return letterPose;
  const numberPose = NUMBER_POSES[key];
  if (numberPose) return numberPose;

  const text = `${gloss} ${handshape}`.toLowerCase();
  if (/two fingers|v-hand|peace|index and middle/.test(text)) return LETTER_POSES["V"] ?? DEFAULT_POSE;
  if (/three/.test(text)) return NUMBER_POSES["3"] ?? DEFAULT_POSE;
  if (/fist|closed|a-hand/.test(text)) return LETTER_POSES["A"] ?? DEFAULT_POSE;
  if (/point|index/.test(text)) return NUMBER_POSES["1"] ?? DEFAULT_POSE;
  if (/pinch|o-hand|circle|fingertips meet/.test(text)) return LETTER_POSES["O"] ?? DEFAULT_POSE;
  if (/c-hand|cupped|claw|curve/.test(text)) return LETTER_POSES["C"] ?? DEFAULT_POSE;
  if (/thumb up|thumb out/.test(text)) return LETTER_POSES["Y"] ?? DEFAULT_POSE;
  return DEFAULT_POSE;
}

function motionType(raw: string): "still" | "circle" | "down" | "up" | "side" | "trace" | "tap" {
  const text = raw.toLowerCase();
  if (/trace/.test(text)) return "trace";
  if (/circle|round|rotate|twist/.test(text)) return "circle";
  if (/tap|touch|contact/.test(text)) return "tap";
  if (/down|lower|drop/.test(text)) return "down";
  if (/up|raise|lift/.test(text)) return "up";
  if (/side|across|wave|back and forth/.test(text)) return "side";
  return "still";
}

function Finger({ x, pose, index }: { x: number; pose: FingerPose; index: number }) {
  const height = 72 * pose.length;
  const baseY = 121;
  return (
    <g transform={`translate(${x} ${baseY}) rotate(${pose.spread})`}>
      <rect
        x="-10"
        y={-height}
        width="20"
        height={height + 16}
        rx="10"
        fill="url(#skin)"
        className="stroke-foreground/70"
        strokeWidth="1.8"
      />
      <path d={`M-6 ${-height + 25} Q0 ${-height + 29 + pose.bend / 8} 6 ${-height + 25}`} className="fill-none stroke-foreground/25" strokeWidth="1.4" />
      <rect x="-5.5" y={-height + 7} width="11" height="10" rx="5" className="fill-card/70 stroke-foreground/20" strokeWidth="1" />
      {pose.bend > 35 && <path d={`M-8 ${-height + 38} Q2 ${-height + 47} 9 ${-height + 34}`} className="fill-none stroke-foreground/30" strokeWidth="1.5" />}
      <title>{`Finger ${index + 1}`}</title>
    </g>
  );
}

function HumanHand({ pose, x, y, scale = 1, mirrored = false }: { pose: HandPose; x: number; y: number; scale?: number; mirrored?: boolean }) {
  const thumb = pose.thumb;
  const thumbRotation = thumb === "open" ? -48 : thumb === "side" ? -20 : thumb.startsWith("touch") ? 22 : 42;
  const thumbY = thumb.startsWith("touch") ? 105 : 132;
  return (
    <g transform={`translate(${x} ${y}) scale(${mirrored ? -scale : scale} ${scale}) rotate(${pose.rotate ?? 0} 0 138)`}>
      <ellipse cx="2" cy="160" rx="67" ry="24" className="fill-foreground/10" />
      <path d="M-42 113 C-47 129 -48 164 -39 186 L-31 221 L42 221 L49 181 C54 157 49 126 39 112 C20 101 -23 101 -42 113Z" fill="url(#skin)" className="stroke-foreground/70" strokeWidth="2.2" />
      <path d="M-30 180 Q2 194 34 178" className="fill-none stroke-foreground/25" strokeWidth="1.5" />
      <path d="M-27 194 Q3 205 31 193" className="fill-none stroke-foreground/20" strokeWidth="1.3" />
      {pose.fingers.map((finger, index) => (
        <Finger key={index} x={-30 + index * 20} pose={finger} index={index} />
      ))}
      <g transform={`translate(-43 ${thumbY}) rotate(${thumbRotation})`}>
        <rect x="-10" y="-7" width="23" height="60" rx="11" fill="url(#skin)" className="stroke-foreground/70" strokeWidth="2" />
        <rect x="-5" y="-2" width="12" height="11" rx="5" className="fill-card/70 stroke-foreground/20" strokeWidth="1" />
      </g>
      <path d="M-22 218 L-19 252 M24 218 L22 252" className="stroke-foreground/25" strokeWidth="1.5" />
    </g>
  );
}

function MotionGuide({ kind }: { kind: ReturnType<typeof motionType> }) {
  if (kind === "still") return <g><circle cx="267" cy="83" r="5" className="fill-primary stroke-foreground" strokeWidth="1.5" /><circle cx="267" cy="83" r="11" className="fill-none stroke-primary" strokeWidth="2" /></g>;
  if (kind === "circle") return <path d="M248 94 C281 65 305 112 273 127 M273 127 l5 -12 m-5 12 l13 -1" className="fill-none stroke-primary" strokeWidth="4" strokeLinecap="round" />;
  if (kind === "trace") return <path d="M244 73 h47 l-45 51 h48" className="fill-none stroke-primary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 6" />;
  const path = kind === "down" ? "M269 68 v55 m0 0 l-10 -12 m10 12 l10 -12" : kind === "up" ? "M269 124 V69 m0 0 l-10 12 m10 -12 l10 12" : "M239 98 h58 m-58 0 l11 -10 m-11 10 l11 10 m47 -10 l-11 -10 m11 10 l-11 10";
  return <path d={path} className="fill-none stroke-primary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
}

export function SignDiagram({ gloss, handshape, location, movement, imageKey = "", className }: Props) {
  const pose = inferPose(gloss, handshape);
  const isIsl = imageKey.toLowerCase().startsWith("isl-") || /two hands|both hands|non-dominant/.test(handshape.toLowerCase());
  const movementKind = motionType(movement);

  return (
    <svg viewBox="0 0 320 240" role="img" aria-label={`Human hand illustration for ${gloss}: ${handshape}. ${movement}`} className={className}>
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--background)" /><stop offset="1" stopColor="var(--secondary)" /></linearGradient>
        <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--accent)" /><stop offset="0.6" stopColor="var(--card)" /><stop offset="1" stopColor="var(--primary)" /></linearGradient>
        <pattern id="guideGrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" className="fill-none stroke-primary/10" strokeWidth="1" /></pattern>
      </defs>
      <rect width="320" height="240" rx="12" className="fill-background" />
      <rect width="320" height="240" rx="12" fill="url(#paper)" opacity="0.8" />
      <rect x="8" y="8" width="304" height="224" rx="9" fill="url(#guideGrid)" />
      <path d="M18 54 H302" className="stroke-foreground/15" strokeWidth="1" />
      <text x="20" y="34" className="fill-foreground font-bold" fontSize="19">{gloss}</text>
      <text x="299" y="32" textAnchor="end" className="fill-muted-foreground" fontSize="9">{isIsl ? "TWO-HAND GUIDE" : "DOMINANT HAND"}</text>
      {isIsl && <HumanHand pose={{ ...(NUMBER_POSES["5"] ?? DEFAULT_POSE), rotate: 4 }} x={110} y={3} scale={0.62} mirrored />}
      <HumanHand pose={pose} x={isIsl ? 208 : 157} y={8} scale={isIsl ? 0.68 : 0.78} />
      <MotionGuide kind={movementKind} />
      <g transform="translate(18 205)">
        <rect width="284" height="25" rx="6" className="fill-card/90 stroke-foreground/15" strokeWidth="1" />
        <text x="10" y="11" className="fill-muted-foreground" fontSize="7.5">PLACEMENT</text>
        <text x="10" y="21" className="fill-foreground" fontSize="8.5">{location}</text>
      </g>
    </svg>
  );
}