/**
 * Conversational phrasing mappings for sign language captions.
 * Usable on both client and server for zero-latency instant caption rendering.
 */

export const SIGN_PHRASES: Record<string, string> = {
  HELLO: "Hello there!",
  "THANK YOU": "Thank you so much.",
  PLEASE: "Please.",
  YES: "Yes.",
  NO: "No.",
  YOU: "You.",
  ME: "Me.",
  GOOD: "That's good!",
  SORRY: "I'm sorry.",
  HELP: "Can you help me?",
  "NICE TO MEET YOU": "It's nice to meet you.",
  AGAIN: "Could you repeat that?",
  ALL: "All together.",
  BAD: "That's bad.",
  BEFORE: "Before.",
  BEST: "The best!",
  BOOK: "Book.",
  BOY: "Boy.",
  BUS: "Bus.",
  BUT: "But.",
  CALM: "Stay calm.",
  CAN: "Yes, we can.",
  CHAIR: "Chair.",
  COME: "Come here.",
  DAY: "Good day.",
  DOCTOR: "Doctor.",
  DRINK: "Drink.",
  EAT: "Eat food.",
  FAMILY: "Family.",
  FATHER: "Father.",
  FEW: "A few.",
  FINE: "I am fine.",
  GIRL: "Girl.",
  GIVE: "Give.",
  HAPPY: "I am happy!",
  HEARING: "Hearing.",
  HOME: "Home.",
  HOUSE: "House.",
  HOW: "How are you?",
  MEETING: "Meeting.",
  MONEY: "Money.",
  MORE: "More, please.",
  MOTHER: "Mother.",
  NAME: "What is your name?",
  RIGHT: "That's right.",
  SAD: "Feeling sad.",
  SAME: "Same here.",
  SCHOOL: "School.",
  STUDENT: "Student.",
  TEA: "Tea.",
  TEACHER: "Teacher.",
  TIME: "What time is it?",
  WATER: "Could I have some water?",
};

export function phraseLabel(label: string): string {
  const normalized = label.trim().toUpperCase();
  if (SIGN_PHRASES[normalized]) {
    return SIGN_PHRASES[normalized]!;
  }
  return `${normalized.charAt(0)}${normalized.slice(1).toLowerCase()}.`;
}
