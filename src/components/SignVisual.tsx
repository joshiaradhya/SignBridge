import { SignDiagram } from "@/components/SignDiagram";
import { hasSignPhoto, signImage } from "@/lib/sign-images";

type Sign = {
  gloss: string;
  handshape: string;
  location: string;
  movement: string;
  image_key: string;
};

/**
 * Shows the photographed reference when one exists for this exact sign, and an
 * accurate generated diagram otherwise — never a photo of a different sign.
 *
 * Both variants are rendered inside the same 4:3 frame so every entry in Learn
 * and Practice keeps an identical size at every breakpoint.
 */
export function SignVisual({ sign, className }: { sign: Sign; className?: string }) {
  return (
    <div className={`aspect-[4/3] w-full overflow-hidden bg-background ${className ?? ""}`}>
      {hasSignPhoto(sign.image_key) ? (
        <img
          src={signImage(sign.image_key)}
          alt={`Annotated illustration showing how to sign ${sign.gloss}: ${sign.movement}`}
          width={1024}
          height={768}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <SignDiagram
          gloss={sign.gloss}
          handshape={sign.handshape}
          location={sign.location}
          movement={sign.movement}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}
