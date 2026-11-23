import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleDotDashed,
  Hand,
  MoveRight,
} from "lucide-react";
import {
  getSignReference,
  orientationFromSign,
  type ReferenceView,
  viewLabel,
} from "@/lib/sign-references";

type Sign = {
  gloss: string;
  handshape: string;
  location: string;
  movement: string;
  image_key: string;
  steps?: string[];
};

const fallbackSteps = (sign: Sign) => [
  `Form the handshape: ${sign.handshape}.`,
  `Place the hand at ${sign.location}.`,
  sign.movement,
];

/**
 * Educational media panel used in both Learn and SignLab. It never turns a
 * prose description into a made-up gesture. Approved, per-sign media is shown
 * from the central registry; all other signs get an explicit review state and
 * their precise course instructions.
 */
export function SignVisual({ sign, className }: { sign: Sign; className?: string }) {
  const reference = getSignReference(sign.image_key);
  const availableViews = useMemo<ReferenceView[]>(() => {
    if (reference.status !== "verified") return ["primary", "movement"];
    const views = (Object.keys(reference.views) as ReferenceView[]).filter(
      (candidate) => reference.views[candidate],
    );
    return views.length ? views : ["primary"];
  }, [reference]);
  const [view, setView] = useState<ReferenceView>(availableViews[0]);
  const steps = sign.steps?.length ? sign.steps : fallbackSteps(sign);
  const [frame, setFrame] = useState(0);
  const orientation = orientationFromSign(sign.handshape, sign.location);
  const activeView = availableViews.includes(view) ? view : availableViews[0];
  const activeAsset = reference.status === "verified" ? reference.views[activeView] : undefined;

  return (
    <section
      className={`overflow-hidden bg-background ${className ?? ""}`}
      aria-label={`${sign.gloss} demonstration reference`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground/15 bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <Hand className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="label-caps text-[10px]">Demonstration reference</span>
        </div>
        <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold">
          {orientation}
        </span>
      </div>

      <div
        className="flex gap-1 overflow-x-auto border-b-2 border-foreground/10 px-3 pt-2"
        role="tablist"
        aria-label="Reference views"
      >
        {availableViews.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={activeView === candidate}
            onClick={() => setView(candidate)}
            className={`rounded-t-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              activeView === candidate
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 hover:bg-secondary"
            }`}
          >
            {viewLabel(candidate)}
          </button>
        ))}
      </div>

      {activeAsset ? (
        <div className="relative aspect-[4/3] bg-secondary/30">
          <img
            src={activeAsset.src}
            alt={activeAsset.alt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
          <div className="absolute bottom-3 left-3 rounded-md bg-background/95 px-2 py-1 text-[10px] font-bold">
            Verified reference
          </div>
        </div>
      ) : (
        <div className="grid min-h-56 place-items-center bg-[radial-gradient(circle_at_center,rgba(255,221,87,0.22),transparent_48%)] p-5 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-dashed border-foreground/40 bg-card">
              <CircleDotDashed className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-3 label-caps text-xs">Verified image required</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {reference.status === "review-required"
                ? reference.reviewNote
                : "No approved reference is available."}
            </p>
          </div>
        </div>
      )}

      <div className="border-t-2 border-foreground/15 bg-card p-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {activeAsset
            ? "Compare finger position with the written cue below."
            : "Do not infer a handshape from a placeholder image."}
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            type="button"
            aria-label="Previous instruction frame"
            onClick={() => setFrame((current) => Math.max(0, current - 1))}
            disabled={frame === 0}
            className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 text-center">
            <p className="label-caps text-[9px] text-muted-foreground">
              Frame {frame + 1} of {steps.length}
            </p>
            <p className="mt-1 text-xs leading-relaxed">{steps[frame]}</p>
          </div>
          <button
            type="button"
            aria-label="Next instruction frame"
            onClick={() => setFrame((current) => Math.min(steps.length - 1, current + 1))}
            disabled={frame === steps.length - 1}
            className="rounded-md p-1.5 hover:bg-secondary disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-3">
          <p className="rounded-md bg-secondary/60 px-2 py-1.5">
            <b>Shape:</b> {sign.handshape}
          </p>
          <p className="rounded-md bg-secondary/60 px-2 py-1.5">
            <b>Place:</b> {sign.location}
          </p>
          <p className="rounded-md bg-secondary/60 px-2 py-1.5">
            <b>Move:</b> {sign.movement}
          </p>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <MoveRight className="h-3 w-3" /> Movement cues are shown as numbered written frames until
          approved media is linked.
        </p>
      </div>
    </section>
  );
}
