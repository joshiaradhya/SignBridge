import { useState } from "react";
import { SignDiagram } from "@/components/SignDiagram";
import { signImage } from "@/lib/sign-images";

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
  const image = signImage(sign.image_key);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const showPhoto = Boolean(image && failedImage !== image.src);
  const isLoading = showPhoto && loadedImage !== image?.src;

  return (
    <div
      className={`aspect-[4/3] w-full overflow-hidden bg-background ${className ?? ""}`}
      aria-label={`${sign.gloss} sign reference`}
    >
      {showPhoto && image ? (
        <div className="relative h-full w-full">
          {isLoading ? (
            <div
              className="absolute inset-0 animate-pulse bg-secondary/30"
              role="status"
              aria-label={`Loading ${sign.gloss} sign reference`}
            />
          ) : null}
          <img
            key={image.src}
            src={image.src}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoadedImage(image.src)}
            onError={() => setFailedImage(image.src)}
            className={`h-full w-full object-contain transition-opacity duration-200 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
          />
          <p className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground">
            Visual reference
          </p>
        </div>
      ) : (
        <SignDiagram
          gloss={sign.gloss}
          handshape={sign.handshape}
          location={sign.location}
          movement={sign.movement}
          imageKey={sign.image_key}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}
