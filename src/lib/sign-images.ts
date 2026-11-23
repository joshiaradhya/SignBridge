import aslHello from "@/assets/asl-hello.jpg";
import aslThankYou from "@/assets/asl-thank-you.jpg";
import aslPlease from "@/assets/asl-please.jpg";
import aslSorry from "@/assets/asl-sorry.jpg";
import islNamaste from "@/assets/isl-namaste.jpg";
import islThankYou from "@/assets/isl-thank-you.jpg";
import islHelp from "@/assets/isl-help.jpg";
import islWater from "@/assets/isl-water.jpg";

export type SignImageReference = {
  src: string;
  alt: string;
};

/**
 * Verified local lesson illustrations. Do not add a key here unless its asset
 * depicts that exact sign; unmapped signs use the data-driven SignDiagram.
 */
export const signImages: Record<string, SignImageReference> = {
  "asl-hello": {
    src: aslHello,
    alt: "ASL HELLO: a flat hand moves from the forehead outward in a relaxed greeting",
  },
  "asl-thank-you": {
    src: aslThankYou,
    alt: "ASL THANK YOU: fingertips move from the chin outward and down",
  },
  "asl-please": {
    src: aslPlease,
    alt: "ASL PLEASE: an open hand circles on the centre of the chest",
  },
  "asl-sorry": {
    src: aslSorry,
    alt: "ASL SORRY: an A-hand circles on the centre of the chest",
  },
  "isl-namaste": {
    src: islNamaste,
    alt: "ISL NAMASTE: both palms are pressed together in front of the chest with a small bow",
  },
  "isl-thank-you": {
    src: islThankYou,
    alt: "ISL THANK YOU: both open hands move forward and outward from the chest",
  },
  "isl-help": {
    src: islHelp,
    alt: "ISL HELP: a thumbs-up fist rests on the other palm and both hands lift together",
  },
  "isl-water": {
    src: islWater,
    alt: "ISL WATER: a cupped C-hand tips toward the mouth as if drinking",
  },
};

export function hasSignPhoto(key: string): boolean {
  return Boolean(signImages[key]);
}

export function signImage(key: string): SignImageReference | undefined {
  return signImages[key];
}
