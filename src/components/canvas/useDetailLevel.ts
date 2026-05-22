import { useStore } from '@xyflow/react';

// Semantic-zoom detail level (Phase 18.2). The canvas node representation
// adapts to the zoom level so there is always a useful altitude:
//   - 'chip'  — zoomed out: a score-coloured glyph (role + layer, no prose),
//               a structural map readable when the box is tiny on screen
//   - 'title' — mid zoom: the thought on a single line
//   - 'full'  — zoomed in: the full card (thought + rationale hint)
// This is the missing fourth scale technique ("zooming") — see
// docs/ux-readability-research.md.
export type DetailLevel = 'chip' | 'title' | 'full';

export function detailForZoom(zoom: number): DetailLevel {
  if (zoom < 0.45) return 'chip';
  if (zoom < 0.8) return 'title';
  return 'full';
}

// Reads the live React Flow zoom and returns the detail bucket. The selector
// returns a string, so a subscriber only re-renders when the bucket actually
// changes (a threshold crossing) — not on every zoom delta.
export function useDetailLevel(): DetailLevel {
  return useStore((s) => detailForZoom(s.transform[2]));
}
