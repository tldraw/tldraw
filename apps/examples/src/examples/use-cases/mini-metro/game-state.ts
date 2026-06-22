// The bridge between the pure simulation (sim.ts) and tldraw's reactive world.
// Each frame the host steps the `World` and publishes lightweight snapshots into
// atoms; the overlays and HUD read those, never the world directly. Fresh array
// references are what tell the overlay canvas to redraw.

import { atom } from 'tldraw'
import { LineColor, MAX_LINES, StationShape } from './constants'
import { createWorld, linePoints, overcrowdFraction, World } from './sim'

// These are also used as `OverlayUtil` props, which must satisfy
// `Record<string, unknown>`; the overlays intersect them with that index
// signature at the boundary, so they can stay plain interfaces here.

// A drawn train, with its interpolated page position and onboard passengers.
export interface TrainView {
	id: number
	color: LineColor
	x: number
	y: number
	passengers: StationShape[]
}

// A station as the passenger overlay needs it: where it is and who's waiting.
export interface StationView {
	id: number
	x: number
	y: number
	shape: StationShape
	waiting: StationShape[]
	overcrowd: number
}

// The in-progress line drag, in page space, or null when not dragging.
export interface DragView {
	fromX: number
	fromY: number
	toX: number
	toY: number
	snapId: number | null
	color: LineColor | null
}

export interface HudState {
	score: number
	timeMs: number
	linesUsed: number
	linesMax: number
	gameOver: boolean
}

export const trains$ = atom<TrainView[]>('mm_trains', [])
export const stations$ = atom<StationView[]>('mm_stations', [])
export const drag$ = atom<DragView | null>('mm_drag', null)
export const hud$ = atom<HudState>('mm_hud', {
	score: 0,
	timeMs: 0,
	linesUsed: 0,
	linesMax: 0,
	gameOver: false,
})

// Bumped whenever stations or lines change structurally, so the host re-syncs
// the real tldraw shapes.
export const structure$ = atom<number>('mm_structure', 0)

let _world = createWorld()

export function getWorld(): World {
	return _world
}

// Interpolate a train's page position along its line's path.
function trainPosition(world: World, lineId: number, fromIdx: number, toIdx: number, t: number) {
	const line = world.lines.find((l) => l.id === lineId)
	if (!line) return null
	const pts = linePoints(world, line)
	const a = pts[fromIdx]
	const b = pts[toIdx]
	if (!a || !b) return null
	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function publish() {
	const w = _world

	trains$.set(
		w.trains
			.map((train) => {
				const pos = trainPosition(w, train.lineId, train.fromIdx, train.toIdx, train.t)
				const line = w.lines.find((l) => l.id === train.lineId)
				if (!pos || !line) return null
				return {
					id: train.id,
					color: line.color,
					x: pos.x,
					y: pos.y,
					passengers: train.passengers.map((p) => p.dest),
				}
			})
			.filter((t): t is TrainView => t !== null)
	)

	stations$.set(
		w.stations.map((s) => ({
			id: s.id,
			x: s.x,
			y: s.y,
			shape: s.shape,
			waiting: s.passengers.map((p) => p.dest),
			overcrowd: overcrowdFraction(s),
		}))
	)

	hud$.set({
		score: w.score,
		timeMs: w.timeMs,
		linesUsed: w.lines.length,
		linesMax: MAX_LINES,
		gameOver: w.gameOver,
	})

	structure$.set(w.structureVersion)
}

export function resetWorld() {
	_world = createWorld()
	drag$.set(null)
	publish()
}
