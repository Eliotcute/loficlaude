export const CLAUDE_BUBBLE_WIDTH = 360;
export const CLAUDE_BUBBLE_HEIGHT = 290;

export function placeClaudeBubble({
  anchorX,
  anchorY,
  viewportWidth,
  viewportHeight
} = {}) {
  const vw = Math.max(0, Number(viewportWidth) || 0);
  const vh = Math.max(0, Number(viewportHeight) || 0);
  const width = Math.min(CLAUDE_BUBBLE_WIDTH, Math.max(0, vw - 28));
  const ax = Number.isFinite(anchorX) && anchorX > 0 ? anchorX : Math.round(vw / 2);
  const ay = Number.isFinite(anchorY) && anchorY > 0 ? anchorY : Math.round(vh * 0.58);
  const left = Math.max(
    14,
    Math.min(
      ax >= vw / 2 ? ax - width - 24 : ax + 24,
      vw - width - 14
    )
  );
  const top = Math.max(
    84,
    Math.min(
      Math.max(84, ay - 186),
      vh - CLAUDE_BUBBLE_HEIGHT - (vh > 600 ? 136 : 18)
    )
  );

  return { left, top, width };
}
