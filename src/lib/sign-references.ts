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

export type ReferenceAsset = {
  src: string;
  alt: string;
  attribution?: { label: string; href: string };
};

export type VerifiedSignReference = {
  status: "verified";
  views: Partial<Record<ReferenceView, ReferenceAsset>>;
};

export type ReviewRequiredReference = {
  status: "review-required";
  reviewNote: string;
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

const photographedAslHandshape = (src: string, letter: string): VerifiedSignReference => ({
  status: "verified",
  views: {
    primary: {
      src,
      alt: `Photographed ASL ${letter} handshape, shown from the front`,
      attribution: commonsAttribution,
    },
  },
});

/**
 * Verified, photographed references for the stationary ASL manual alphabet.
 * J uses the I-handshape as its first frame; its J motion stays in the lesson
 * frames. Every other sign remains review-required until its exact reference
 * is verified—not merely because it looks similar.
 */
const verifiedReferences: Record<string, VerifiedSignReference> = {
  "asl-asl-fingerspell-a-m-a": photographedAslHandshape(aslA, "A"),
  "asl-asl-fingerspell-a-m-b": photographedAslHandshape(aslB, "B"),
  "asl-asl-fingerspell-a-m-c": photographedAslHandshape(aslC, "C"),
  "asl-asl-fingerspell-a-m-d": photographedAslHandshape(aslD, "D"),
  "asl-asl-fingerspell-a-m-e": photographedAslHandshape(aslE, "E"),
  "asl-asl-fingerspell-a-m-g": photographedAslHandshape(aslG, "G"),
  "asl-asl-fingerspell-a-m-h": photographedAslHandshape(aslH, "H"),
  "asl-asl-fingerspell-a-m-i": photographedAslHandshape(aslI, "I"),
  "asl-asl-fingerspell-a-m-j": photographedAslHandshape(aslI, "I (starting handshape for J)"),
  "asl-asl-fingerspell-a-m-k": photographedAslHandshape(aslK, "K"),
  "asl-asl-fingerspell-a-m-l": photographedAslHandshape(aslL, "L"),
  "asl-asl-fingerspell-a-m-m": photographedAslHandshape(aslM, "M"),
  "asl-asl-fingerspell-n-z-n": photographedAslHandshape(aslN, "N"),
  "asl-asl-fingerspell-n-z-o": photographedAslHandshape(aslO, "O"),
  "asl-asl-fingerspell-n-z-r": photographedAslHandshape(aslR, "R"),
  "asl-asl-fingerspell-n-z-s": photographedAslHandshape(aslS, "S"),
};

export function getSignReference(signKey: string): SignReference {
  const isIsl = signKey.toLowerCase().startsWith("isl-");
  return (
    verifiedReferences[signKey] ?? {
      status: "review-required",
      reviewNote:
        "A verified anatomical reference has not been linked for this sign yet. Use the course instructions and practise with an instructor or approved source.",
      source: isIsl
        ? {
            label: "Open the official ISLRTC Dictionary",
            href: "https://divyangjan.depwd.gov.in/islrtc/",
          }
        : undefined,
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
