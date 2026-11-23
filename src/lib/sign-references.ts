/**
 * The single registry for lesson demonstration media.
 *
 * A record may only be marked `verified` after it has been checked against the
 * course's stated source (or an approved dataset/video). Keeping the registry
 * separate from the UI means a new image can be added without touching lesson
 * components, and—more importantly—an unverified gesture is never presented
 * as an instructional reference.
 */
export type ReferenceView = "primary" | "palm" | "side" | "movement";

import aslA from "@/assets/sign-references/asl-a.jpg";
import aslB from "@/assets/sign-references/asl-b.jpg";
import aslC from "@/assets/sign-references/asl-c.jpg";
import aslD from "@/assets/sign-references/asl-d.jpg";
import aslE from "@/assets/sign-references/asl-e.jpg";
import aslG from "@/assets/sign-references/asl-g.jpg";
import aslH from "@/assets/sign-references/asl-h.jpg";
import aslI from "@/assets/sign-references/asl-i.jpg";
import aslK from "@/assets/sign-references/asl-k.jpg";
import aslL from "@/assets/sign-references/asl-l.jpg";
import aslM from "@/assets/sign-references/asl-m.jpg";
import aslN from "@/assets/sign-references/asl-n.jpg";
import aslO from "@/assets/sign-references/asl-o.jpg";
import aslR from "@/assets/sign-references/asl-r.jpg";
import aslS from "@/assets/sign-references/asl-s.jpg";
import aslT from "@/assets/sign-references/asl-t.jpg";

export type ReferenceAsset = {
  src: string;
  alt: string;
  attribution?: { label: string; href: string };
};

export type GestureDescription = {
  handshape: string;
  fingers: string;
  thumb: string;
  palmOrientation: string;
  location: string;
  movement: string;
  dominantHand: string;
};

export type VerifiedSignReference = {
  status: "verified";
  language: "ASL" | "ISL";
  source: { label: string; href: string };
  gesture: GestureDescription;
  views: Partial<Record<ReferenceView, ReferenceAsset>>;
};

export type ReviewRequiredReference = {
  status: "review-required";
  language: "ASL" | "ISL";
  reviewNote: string;
  gesture?: GestureDescription;
  source?: { label: string; href: string };
};

export type SignReference = VerifiedSignReference | ReviewRequiredReference;

/**
 * Add approved media here with its sign slug as the key. The legacy JPGs are
 * deliberately not registered: they are stylised illustrations, not verified
 * anatomical demonstrations. An absent key is therefore a safe review state.
 */
const commonsAttribution = {
  label: "Photo: Mario Carneiro (Di gama), CC BY-SA 3.0 · Wikimedia Commons",
  href: "https://commons.wikimedia.org/wiki/User:Di_gama/2009-09-17_handshape_images",
};

const aslAlphabetSource = {
  label: "ASL University / Lifeprint — American Manual Alphabet",
  href: "https://www.lifeprint.com/asl101/fingerspelling/abc.htm",
};

const islAlphabetSource = {
  label: "ISLRTC — Alphabet in ISL (official Government of India resource)",
  href: "https://islrtc.nic.in/document-category/awareness-material/",
};

const photographedAslHandshape = (
  src: string,
  letter: string,
  gesture: GestureDescription,
): VerifiedSignReference => ({
  status: "verified",
  language: "ASL",
  source: aslAlphabetSource,
  gesture,
  views: {
    primary: {
      src,
      alt: `Photographed ASL ${letter} handshape, shown from the front`,
      attribution: commonsAttribution,
    },
  },
});

const aslGesture = (
  handshape: string,
  fingers: string,
  thumb: string,
  palmOrientation: string,
  movement = "Hold steady",
) => ({
  handshape,
  fingers,
  thumb,
  palmOrientation,
  location: "Chest-height fingerspelling space",
  movement,
  dominantHand: "Use the dominant hand; left-handed signers mirror the handshape.",
});

/**
 * Verified, photographed references for the stationary ASL manual alphabet.
 * J uses the I-handshape as its verified starting position, while its motion
 * remains review-required. Every other sign remains review-required until its
 * exact reference is verified—not merely because it looks similar.
 */
const verifiedReferences: Record<string, VerifiedSignReference> = {
  "asl-asl-fingerspell-a-m-a": photographedAslHandshape(
    aslA,
    "A",
    aslGesture(
      "Closed A-hand",
      "Four fingers curl into a fist",
      "Rests alongside the index finger",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-a-m-b": photographedAslHandshape(
    aslB,
    "B",
    aslGesture(
      "Flat B-hand",
      "Four straight fingers stay together",
      "Folds across the palm",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-a-m-c": photographedAslHandshape(
    aslC,
    "C",
    aslGesture("Open C-hand", "Fingers curve together", "Curves opposite the fingers", "Sideways"),
  ),
  "asl-asl-fingerspell-a-m-d": photographedAslHandshape(
    aslD,
    "D",
    aslGesture(
      "D-hand",
      "Index extends; middle, ring, and little fingers curve",
      "Touches the middle finger",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-a-m-e": photographedAslHandshape(
    aslE,
    "E",
    aslGesture(
      "E-hand",
      "All fingertips curl toward the palm",
      "Rests across the curled fingertips",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-a-m-g": photographedAslHandshape(
    aslG,
    "G",
    aslGesture(
      "G-hand",
      "Index extends sideways; remaining fingers close",
      "Extends parallel to the index finger",
      "Inward / sideways",
    ),
  ),
  "asl-asl-fingerspell-a-m-h": photographedAslHandshape(
    aslH,
    "H",
    aslGesture(
      "H-hand",
      "Index and middle fingers extend together sideways",
      "Tucks against the closed fingers",
      "Inward / sideways",
    ),
  ),
  "asl-asl-fingerspell-a-m-i": photographedAslHandshape(
    aslI,
    "I",
    aslGesture(
      "I-hand",
      "Little finger extends; other fingers close",
      "Tucks beneath the closed fingers",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-a-m-j": photographedAslHandshape(
    aslI,
    "J",
    aslGesture(
      "I-hand (J start)",
      "Little finger extends; other fingers close",
      "Tucks beneath the closed fingers",
      "Mostly forward",
      "Trace a small J with the little finger",
    ),
  ),
  "asl-asl-fingerspell-a-m-k": photographedAslHandshape(
    aslK,
    "K",
    aslGesture(
      "K-hand",
      "Index and middle fingers form a V",
      "Touches the middle finger",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-a-m-l": photographedAslHandshape(
    aslL,
    "L",
    aslGesture(
      "L-hand",
      "Index extends upright; other fingers close",
      "Extends sideways to form an L",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-a-m-m": photographedAslHandshape(
    aslM,
    "M",
    aslGesture(
      "M-hand",
      "Four fingers fold over the thumb",
      "Tucks beneath index, middle, and ring fingers",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-n-z-n": photographedAslHandshape(
    aslN,
    "N",
    aslGesture(
      "N-hand",
      "Four fingers fold over the thumb",
      "Tucks beneath index and middle fingers",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-n-z-o": photographedAslHandshape(
    aslO,
    "O",
    aslGesture("O-hand", "Fingertips curve to meet the thumb", "Meets all fingertips", "Sideways"),
  ),
  "asl-asl-fingerspell-n-z-r": photographedAslHandshape(
    aslR,
    "R",
    aslGesture(
      "R-hand",
      "Index and middle fingers extend and cross",
      "Tucks against closed ring and little fingers",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-n-z-s": photographedAslHandshape(
    aslS,
    "S",
    aslGesture(
      "S-hand",
      "All fingers form a fist",
      "Lays across the front of the fingers",
      "Mostly forward",
    ),
  ),
  "asl-asl-fingerspell-n-z-t": photographedAslHandshape(
    aslT,
    "T",
    aslGesture(
      "T-hand",
      "All fingers form a fist",
      "Tucks between index and middle fingers",
      "Mostly forward",
    ),
  ),
};

export function getSignReference(signKey: string): SignReference {
  const isIsl = signKey.toLowerCase().startsWith("isl-");
  return (
    verifiedReferences[signKey] ?? {
      status: "review-required",
      language: isIsl ? "ISL" : "ASL",
      reviewNote:
        "No approved visual asset is available. This sign is deliberately withheld from the teaching image library until a qualified reviewer compares it with an authoritative reference.",
      source: isIsl ? islAlphabetSource : aslAlphabetSource,
    }
  );
}

export function orientationFromSign(handshape: string, location: string): string {
  const detail = `${handshape} ${location}`.toLowerCase();
  if (/palm(?:s)? (?:facing )?out|palm forward/.test(detail)) return "Palm out";
  if (/palm(?:s)? (?:facing )?in|palm inward/.test(detail)) return "Palm in";
  if (/palm(?:s)? up|palm upward/.test(detail)) return "Palm up";
  if (/palm(?:s)? down|palm downward/.test(detail)) return "Palm down";
  if (/palm(?:s)? left/.test(detail)) return "Palm left";
  if (/palm(?:s)? right/.test(detail)) return "Palm right";
  return "See placement notes";
}

export function viewLabel(view: ReferenceView): string {
  return { primary: "Primary", palm: "Palm", side: "Side", movement: "Movement" }[view];
}
