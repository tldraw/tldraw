// The bridge between the pure simulation (sim.ts) and tldraw's reactive world.
// Each frame the host steps the `World` and publishes lightweight snapshots into
// atoms; the overlays and HUD read those, never the world directly. Fresh array
// references are what tell the overlay canvas to redraw.

import { atom } from 'tldraw'
import { FLASH_MS, ItemColor, ItemShape, MachineKind } from './constants'
import { beltPoints, createWorld, World } from './sim'

// An item travelling a belt, at its interpolated page position.
export interface ItemView {
	id: number
	shape: ItemShape
	color: ItemColor
	x: number
	y: number
}

// A machine as the overlay needs it: where it is, what it does, and how loaded.
export interface MachineView {
	id: number
	kind: MachineKind
	x: number
	y: number
	shape?: ItemShape // extractor: the raw shape it emits
	paint?: ItemColor // painter: the colour it applies
	request?: { shape: ItemShape; color: ItemColor } // hub: what it wants
	pending: number // items buffered (inbox + outbox), for a load ring
	flash?: number // hub: 0..1 pulse strength right after consuming an item
	flashGood?: boolean // hub: whether that consumed item matched the request
}

// The in-progress belt drag, in page space, or null when not dragging.
export interface DragView {
	fromX: number
	fromY: number
	toX: number
	toY: number
	snapId: number | null
	valid: boolean
}

export interface HudState {
	score: number
	timeMs: number
	belts: number
	request: { shape: ItemShape; color: ItemColor }
}

export const items$ = atom<ItemView[]>('sf_items', [])
export const machines$ = atom<MachineView[]>('sf_machines', [])
export const drag$ = atom<DragView | null>('sf_drag', null)
export const hud$ = atom<HudState>('sf_hud', {
	score: 0,
	timeMs: 0,
	belts: 0,
	request: { shape: 'circle', color: 'blue' },
})

let _world = createWorld()

export function getWorld(): World {
	return _world
}

export function publish() {
	const w = _world

	const items: ItemView[] = []
	for (const belt of w.belts) {
		const pts = beltPoints(w, belt)
		if (!pts) continue
		const { from, to } = pts
		for (const c of belt.cargo) {
			items.push({
				id: c.item.id,
				shape: c.item.shape,
				color: c.item.color,
				x: from.x + (to.x - from.x) * c.t,
				y: from.y + (to.y - from.y) * c.t,
			})
		}
	}
	items$.set(items)

	machines$.set(
		w.machines.map((m) => ({
			id: m.id,
			kind: m.kind,
			x: m.x,
			y: m.y,
			shape: m.shape,
			paint: m.paint,
			request: m.kind === 'hub' ? w.request : undefined,
			pending: m.inbox.length + m.outbox.length,
			flash: m.kind === 'hub' ? w.hubFlashMs / FLASH_MS : 0,
			flashGood: w.hubFlashGood,
		}))
	)

	hud$.set({ score: w.score, timeMs: w.timeMs, belts: w.belts.length, request: w.request })
}

export function resetWorld() {
	_world = createWorld()
	drag$.set(null)
	publish()
}
