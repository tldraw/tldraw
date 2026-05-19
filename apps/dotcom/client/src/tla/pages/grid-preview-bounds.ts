/**
 * The page-space bounds the grid pages use as the preview viewport. Both
 * `/grid` (filters shapes server-side to these bounds) and `/grid-original`
 * (renders the full file, but focuses the camera on this region) must agree
 * on this value so the rendered previews are comparable.
 */
export const PREVIEW_BOUNDS = { x: 0, y: 0, w: 500, h: 500 } as const
