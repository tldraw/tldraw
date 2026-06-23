// The bridge between the pure simulation (sim.ts) and tldraw's reactive world.
// The host publishes lightweight snapshots into atoms; the overlays and HUD read
// those, never the world directly.

import { atom } from 'tldraw'
import { Owner, STONES_EACH, TIME_BANK_MS } from './constants'
import { areas, createWorld, World } from './sim'
import { Pt } from './voronoi'

// A site as the overlay needs it: where it is and who owns it.
export interface SiteView {
	id: number
	x: number
	y: number
	owner: Owner
}

// The cell a placement would create, while hovering.
export interface PreviewView {
	poly: Pt[]
	valid: boolean
}

export interface HudState {
	youPct: number
	aiPct: number
	neutralPct: number
	youLeft: number
	aiLeft: number
	youTimeMs: number
	aiTimeMs: number
	turn: 'you' | 'ai'
	gameOver: boolean
	winner: 'you' | 'ai' | 'tie' | null
	flagged: 'you' | 'ai' | null
	started: boolean
}

export const sites$ = atom<SiteView[]>('vor_sites', [])
export const preview$ = atom<PreviewView | null>('vor_preview', null)
export const hud$ = atom<HudState>('vor_hud', {
	youPct: 0,
	aiPct: 0,
	neutralPct: 100,
	youLeft: STONES_EACH,
	aiLeft: STONES_EACH,
	youTimeMs: TIME_BANK_MS,
	aiTimeMs: TIME_BANK_MS,
	turn: 'you',
	gameOver: false,
	winner: null,
	flagged: null,
	started: false,
})

let _world = createWorld()

export function getWorld(): World {
	return _world
}

export function publish() {
	const w = _world

	sites$.set(w.sites.map((s) => ({ id: s.id, x: s.x, y: s.y, owner: s.owner })))

	const a = areas(w)
	const pct = (v: number) => (a.total > 0 ? Math.round((v / a.total) * 100) : 0)
	const winner: HudState['winner'] = !w.gameOver
		? null
		: w.flagged === 'you'
			? 'ai'
			: w.flagged === 'ai'
				? 'you'
				: a.you > a.ai
					? 'you'
					: a.ai > a.you
						? 'ai'
						: 'tie'

	hud$.set({
		youPct: pct(a.you),
		aiPct: pct(a.ai),
		neutralPct: pct(a.neutral),
		youLeft: w.youLeft,
		aiLeft: w.aiLeft,
		youTimeMs: w.youTimeMs,
		aiTimeMs: w.aiTimeMs,
		turn: w.turn,
		gameOver: w.gameOver,
		winner,
		flagged: w.flagged,
		started: w.youLeft < STONES_EACH || w.aiLeft < STONES_EACH,
	})
}

export function resetWorld() {
	_world = createWorld()
	preview$.set(null)
	publish()
}
