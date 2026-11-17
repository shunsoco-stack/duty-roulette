import { createSeed } from "./seed";
import { validateState } from "./validation";
export const STORAGE_KEY = "dtr:v1";
export function restoreState(raw: string | null, now: Date) {
  if (raw === null) return { state: createSeed(now), recovered: false };
  try {
    const state: unknown = JSON.parse(raw);
    if (validateState(state, now)) return { state, recovered: false };
  } catch {
    /* Invalid JSON is handled in the same way as an invalid schema. */
  }
  return { state: createSeed(now), recovered: true };
}
