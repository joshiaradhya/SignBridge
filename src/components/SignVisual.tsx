import { SignDiagram } from "@/components/SignDiagram";

type Sign = {
  gloss: string;
  handshape: string;
  location: string;
  movement: string;
  image_key: string;
};

/**
 * Uses one consistent human-style teaching illustration for every sign so the
 * handshape, placement and movement remain clear in Learn and Practice.
 */
export function SignVisual({ sign, className }: { sign: Sign; className?: string }) {
  return (
    <div className={`aspect-[4/3] w-full overflow-hidden bg-background ${className ?? ""}`}>
      <SignDiagram
        gloss={sign.gloss}
        handshape={sign.handshape}
        location={sign.location}
        movement={sign.movement}
        imageKey={sign.image_key}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
