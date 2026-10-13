/** Lleva cualquier ángulo a 0, 90, 180 o 270 (p. ej. -90 → 270, 450 → 90). */
export function normalizeAngle(angle: number): number {
  return ((Math.round(angle) % 360) + 360) % 360
}
