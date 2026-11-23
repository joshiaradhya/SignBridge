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

export type VerifiedSignReference = {
  status: "verified";
  views: Partial<Record<ReferenceView, { src: string; alt: string }>>;
};

export type ReviewRequiredReference = {
  status: "review-required";
  reviewNote: string;
};

export type SignReference = VerifiedSignReference | ReviewRequiredReference;

/**
 * Add approved media here with its sign slug as the key. The legacy JPGs are
 * deliberately not registered: they are stylised illustrations, not verified
 * anatomical demonstrations. An absent key is therefore a safe review state.
 */
const verifiedReferences: Record<string, VerifiedSignReference> = {};

export function getSignReference(signKey: string): SignReference {
  return (
    verifiedReferences[signKey] ?? {
      status: "review-required",
      reviewNote:
        "A verified anatomical reference has not been linked for this sign yet. Use the course instructions and practise with an instructor or approved source.",
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
