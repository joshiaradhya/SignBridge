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
 */
export function SignVisual({ sign, className }: { sign: Sign; className?: string }) {
  if (hasSignPhoto(sign.image_key)) {
    return (
      <img
        src={signImage(sign.image_key)}
        alt={`Annotated illustration showing how to sign ${sign.gloss}: ${sign.movement}`}
        width={1024}
        height={768}
        loading="lazy"
        className={className ?? "w-full"}
      />
    );
  }
  return (
    <SignDiagram
      gloss={sign.gloss}
      handshape={sign.handshape}
      location={sign.location}
      movement={sign.movement}
      className={className ?? "w-full"}
    />
  );
}
