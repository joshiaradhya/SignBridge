type Props = {
  gloss: string;
  handshape: string;
  location: string;
  movement: string;
  className?: string;
};

type Finger = { up: boolean; curl?: boolean };

/** Very small keyword parser that turns the written handshape into finger states. */
function readHandshape(raw: string): { fingers: Finger[]; thumbUp: boolean; label: string } {
  const h = raw.toLowerCase();
  const all = (up: boolean) => [0, 1, 2, 3].map(() => ({ up }));

  if (/pinch|o-hand|\bo\b|circle with/.test(h))
    return { fingers: [{ up: false, curl: true }, ...all(true).slice(1)], thumbUp: false, label: raw };
  if (/fist|\ba-hand\b|closed/.test(h))
    return { fingers: all(false), thumbUp: /thumb up|thumb out/.test(h), label: raw };
  if (/index (finger )?(up|extended)|\bd-hand\b|point/.test(h))
    return { fingers: [{ up: true }, { up: false }, { up: false }, { up: false }], thumbUp: false, label: raw };
  if (/two fingers|\bv-hand\b|peace|index and middle/.test(h))
    return { fingers: [{ up: true }, { up: true }, { up: false }, { up: false }], thumbUp: false, label: raw };
  if (/three/.test(h))
    return { fingers: [{ up: true }, { up: true }, { up: true }, { up: false }], thumbUp: true, label: raw };
  if (/\bc-hand\b|cupped|claw/.test(h))
    return { fingers: all(true).map(() => ({ up: true, curl: true })), thumbUp: true, label: raw };
  if (/thumb (up|out)|\bten\b/.test(h))
    return { fingers: all(false), thumbUp: true, label: raw };
  // flat / open / B-hand / five and anything else
  return { fingers: all(true), thumbUp: /spread|open|five/.test(h), label: raw };
}

/** Where on the body the sign sits. */
function readLocation(raw: string): { y: number; name: string } {
  const l = raw.toLowerCase();
  if (/forehead|temple|head|brow|eye/.test(l)) return { y: 62, name: "Head" };
  if (/chin|mouth|lip|nose|cheek/.test(l)) return { y: 92, name: "Chin" };
  if (/shoulder|neck/.test(l)) return { y: 118, name: "Shoulder" };
  if (/chest|heart/.test(l)) return { y: 146, name: "Chest" };
  if (/waist|stomach|hip|lap/.test(l)) return { y: 196, name: "Waist" };
  return { y: 160, name: "Neutral space" };
}

function readMotion(raw: string): "none" | "out" | "circle" | "down" | "up" | "shake" | "tap" {
  const m = raw.toLowerCase();
  if (/hold steady|hold the position|no movement|still/.test(m)) return "none";
  if (/circle|circular|rotate|twist/.test(m)) return "circle";
  if (/tap|touch|double tap|contact/.test(m)) return "tap";
  if (/shake|wiggle|wave|back and forth|side to side|open and closed/.test(m)) return "shake";
  if (/down|lower|drop/.test(m)) return "down";
  if (/up|raise|lift/.test(m)) return "up";
  return "out";
}

/**
 * Schematic, generated illustration for a sign: body silhouette, the hand placed at
 * the documented location, fingers matching the documented handshape and an arrow
 * showing the documented movement. Accurate by construction — no stock photo mismatch.
 */
export function SignDiagram({ gloss, handshape, location, movement, className }: Props) {
  const hand = readHandshape(handshape);
  const spot = readLocation(location);
  const motion = readMotion(movement);
  const handX = 190;
  const handY = spot.y;

  return (
    <svg
      viewBox="0 0 320 260"
      role="img"
      aria-label={`Diagram of the sign ${gloss}: ${handshape}, ${location}, ${movement}`}
      className={className}
    >
      <rect x="0" y="0" width="320" height="260" className="fill-secondary" />
      {/* grid */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line
          key={`v${i}`}
          x1={i * 40}
          y1="0"
          x2={i * 40}
          y2="260"
          className="stroke-foreground/10"
          strokeWidth="1"
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={i * 40}
          x2="320"
          y2={i * 40}
          className="stroke-foreground/10"
          strokeWidth="1"
        />
      ))}

      {/* body */}
      <g className="fill-card stroke-foreground" strokeWidth="3" strokeLinejoin="round">
        <circle cx="120" cy="72" r="34" />
        <path d="M70 250 C70 176 92 138 120 138 C148 138 170 176 170 250 Z" />
      </g>
      {/* face marks */}
      <g className="stroke-foreground" strokeWidth="3" strokeLinecap="round">
        <line x1="108" y1="66" x2="114" y2="66" />
        <line x1="128" y1="66" x2="134" y2="66" />
        <path d="M110 86 Q121 94 132 86" fill="none" />
      </g>

      {/* location marker */}
      <g>
        <line
          x1="140"
          y1={spot.y}
          x2={handX - 26}
          y2={spot.y}
          className="stroke-foreground/40"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <text x="146" y={spot.y - 8} className="fill-foreground/60" fontSize="11">
          {spot.name}
        </text>
      </g>

      {/* hand */}
      <g transform={`translate(${handX} ${handY})`}>
        <rect
          x="-2"
          y="0"
          width="52"
          height="46"
          rx="12"
          className="fill-primary stroke-foreground"
          strokeWidth="3"
        />
        {hand.fingers.map((f, i) => (
          <rect
            key={i}
            x={2 + i * 12}
            y={f.up ? (f.curl ? -14 : -30) : -6}
            width="9"
            height={f.up ? (f.curl ? 20 : 36) : 12}
            rx="4"
            className="fill-card stroke-foreground"
            strokeWidth="3"
          />
        ))}
        <rect
          x={hand.thumbUp ? -18 : -12}
          y={hand.thumbUp ? -2 : 12}
          width={hand.thumbUp ? 14 : 20}
          height={hand.thumbUp ? 30 : 12}
          rx="6"
          className="fill-card stroke-foreground"
          strokeWidth="3"
        />
      </g>

      {/* movement arrow */}
      <g className="stroke-foreground" strokeWidth="3" fill="none" strokeLinecap="round">
        {motion === "out" && (
          <path d={`M${handX + 62} ${handY + 22} h34 l-10 -9 m10 9 l-10 9`} />
        )}
        {motion === "up" && <path d={`M${handX + 66} ${handY + 30} v-34 l-9 10 m9 -10 l9 10`} />}
        {motion === "down" && <path d={`M${handX + 66} ${handY - 6} v34 l-9 -10 m9 10 l9 -10`} />}
        {motion === "circle" && (
          <path
            d={`M${handX + 74} ${handY + 8} a20 20 0 1 1 -6 28 l12 2 m-12 -2 l4 -11`}
          />
        )}
        {motion === "shake" && (
          <path d={`M${handX + 62} ${handY + 22} l14 -10 l0 20 m18 -20 l0 20 l14 -10`} />
        )}
        {motion === "tap" && (
          <>
            <circle cx={handX + 70} cy={handY + 22} r="6" className="fill-accent" />
            <circle cx={handX + 70} cy={handY + 22} r="15" />
          </>
        )}
      </g>

      <text x="12" y="248" className="fill-foreground/70" fontSize="12">
        {gloss}
      </text>
    </svg>
  );
}
