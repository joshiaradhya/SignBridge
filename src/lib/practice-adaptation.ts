import type { Result } from "./attempt-analysis";

type MistakeHistory = Record<string, number>;

const KEY_PREFIX = "signbridge:practice-mistakes:";
const REPEAT_THRESHOLD = 3;

function keyFor(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

function readHistory(userId: string): MistakeHistory {
  try {
    return JSON.parse(window.localStorage.getItem(keyFor(userId)) ?? "{}") as MistakeHistory;
  } catch {
    return {};
  }
}

/**
 * Personalises feedback without uploading camera footage. A repeated weak component
 * becomes an explicit next exercise instead of the same generic advice every time.
 */
export function adaptPracticeFeedback(result: Result, userId: string | undefined): Result {
  if (!userId || typeof window === "undefined") return result;
  const history = readHistory(userId);
  for (const criterion of result.criteria) {
    const id = criterion.key;
    history[id] = criterion.matched ? Math.max(0, (history[id] ?? 0) - 1) : (history[id] ?? 0) + 1;
  }
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(history));
  } catch {
    // Personalisation is optional; the attempt result still works in private mode.
  }

  const recurring = result.criteria
    .filter((criterion) => (history[criterion.key] ?? 0) >= REPEAT_THRESHOLD)
    .sort((a, b) => (history[b.key] ?? 0) - (history[a.key] ?? 0));
  if (!recurring.length) return result;

  const focus = recurring[0]!;
  const count = history[focus.key];
  return {
    ...result,
    feedback: `You have repeated the same ${focus.label.toLowerCase()} issue ${count} times. ${focus.tip}`,
    tips: [
      `Personal focus: ${focus.label} — repeat this sign slowly three times, holding the target position for one second.`,
      ...result.tips.filter((tip) => !tip.startsWith(`${focus.label}:`)),
    ].slice(0, 3),
  };
}
