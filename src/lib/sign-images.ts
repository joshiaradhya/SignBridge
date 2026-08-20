import aslHello from "@/assets/asl-hello.jpg";
import aslThankYou from "@/assets/asl-thank-you.jpg";
import aslPlease from "@/assets/asl-please.jpg";
import aslSorry from "@/assets/asl-sorry.jpg";
import islNamaste from "@/assets/isl-namaste.jpg";
import islThankYou from "@/assets/isl-thank-you.jpg";
import islHelp from "@/assets/isl-help.jpg";
import islWater from "@/assets/isl-water.jpg";

export const signImages: Record<string, string> = {
  "asl-hello": aslHello,
  "asl-thank-you": aslThankYou,
  "asl-please": aslPlease,
  "asl-sorry": aslSorry,
  "isl-namaste": islNamaste,
  "isl-thank-you": islThankYou,
  "isl-help": islHelp,
  "isl-water": islWater,
};

export function signImage(key: string): string {
  return signImages[key] ?? aslHello;
}
