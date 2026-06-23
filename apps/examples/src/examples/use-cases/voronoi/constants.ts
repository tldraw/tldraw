// Tuning constants and the shared owner/colour vocabulary. Kept free of tldraw
// imports so the pure simulation (sim.ts) and geometry (voronoi.ts) can use them.

// The fixed board, in page space. The camera fits this box at the start.
export const WORLD = { minX: 0, minY: 0, maxX: 960, maxY: 640 }

export const STONES_EACH = 8 // how many sites each side places
export const NEUTRAL_SITES = 4 // unowned sites seeded at the start
export const MIN_SITE_GAP = 28 // sites can't be placed closer than this
export const SITE_R = 5 // drawn radius of a site marker
export const AI_DELAY_MS = 480 // pause before the AI takes its turn
export const CELL_INSET = 0.92 // shrink each cell toward its centroid for a tiled look

// Bullet chess: each side gets one sharp time bank that ticks down only on its
// own turn. Run out and you flag — an instant loss, whatever the area says.
export const TIME_BANK_MS = 15000

// Who owns a site (and therefore its cell). 'neutral' sites belong to no one.
export type Owner = 'you' | 'ai' | 'neutral'

// tldraw palette colour names, so the board reads as genuinely tldraw.
export const COLOR_FOR_OWNER: Record<Owner, string> = {
	you: 'blue',
	ai: 'red',
	neutral: 'grey',
}
