// The one interaction in the game: you build a belt by dragging from one machine
// to another — the same gesture as drawing on a tldraw whiteboard, and the same
// gesture Mini Metro uses for its lines. It's a custom tool (a StateNode) rather
// than pointer-event handlers so the select tool's brush never gets in the way.
// Clicking a belt (without dragging) removes it.

import { StateNode, Vec } from 'tldraw'
import { MACHINE_R } from './constants'
import { drag$, getWorld } from './game-state'
import { addBelt, beltPoints, canConnect, removeBelt } from './sim'

// The machine under a page point, if any (a touch larger than the drawn radius so
// it's forgiving to hit).
function machineAt(point: Vec) {
	const world = getWorld()
	let best: { id: number; x: number; y: number } | null = null
	let bestDist = MACHINE_R * 1.5
	for (const m of world.machines) {
		const d = Math.hypot(m.x - point.x, m.y - point.y)
		if (d < bestDist) {
			bestDist = d
			best = m
		}
	}
	return best
}

// Distance from a point to a line segment.
function distToSegment(p: Vec, ax: number, ay: number, bx: number, by: number) {
	const dx = bx - ax
	const dy = by - ay
	const len2 = dx * dx + dy * dy || 1
	const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len2))
	return Math.hypot(p.x - (ax + dx * t), p.y - (ay + dy * t))
}

// The belt nearest a page point, if one is within reach.
function beltAt(point: Vec) {
	const world = getWorld()
	let bestId: number | null = null
	let bestDist = 12
	for (const belt of world.belts) {
		const pts = beltPoints(world, belt)
		if (!pts) continue
		const d = distToSegment(point, pts.from.x, pts.from.y, pts.to.x, pts.to.y)
		if (d < bestDist) {
			bestDist = d
			bestId = belt.id
		}
	}
	return bestId
}

export class FactoryTool extends StateNode {
	static override id = 'factory'

	private fromId: number | null = null
	private downPoint: Vec | null = null

	override onEnter() {
		this.editor.setCursor({ type: 'pointer', rotation: 0 })
	}

	override onPointerDown() {
		const point = this.editor.inputs.getCurrentPagePoint()
		this.downPoint = point.clone()
		const hit = machineAt(point)
		if (!hit) return
		this.fromId = hit.id
		drag$.set({
			fromX: hit.x,
			fromY: hit.y,
			toX: point.x,
			toY: point.y,
			snapId: null,
			valid: false,
		})
	}

	override onPointerMove() {
		if (this.fromId === null) return
		const point = this.editor.inputs.getCurrentPagePoint()
		const world = getWorld()
		const from = world.machines.find((m) => m.id === this.fromId)!
		const target = machineAt(point)

		if (target && target.id !== this.fromId) {
			const valid = canConnect(world, this.fromId, target.id)
			drag$.set({
				fromX: from.x,
				fromY: from.y,
				toX: target.x,
				toY: target.y,
				snapId: valid ? target.id : null,
				valid,
			})
		} else {
			drag$.set({
				fromX: from.x,
				fromY: from.y,
				toX: point.x,
				toY: point.y,
				snapId: null,
				valid: false,
			})
		}
	}

	override onPointerUp() {
		const point = this.editor.inputs.getCurrentPagePoint()
		const world = getWorld()

		if (this.fromId !== null) {
			const target = machineAt(point)
			if (target && target.id !== this.fromId) {
				addBelt(world, this.fromId, target.id)
			}
		} else if (this.downPoint && Vec.Dist(this.downPoint, point) < 6) {
			// A click that didn't land on a machine and didn't drag — remove a belt.
			const beltId = beltAt(point)
			if (beltId !== null) removeBelt(world, beltId)
		}

		this.reset()
	}

	override onCancel() {
		this.reset()
	}

	private reset() {
		this.fromId = null
		this.downPoint = null
		drag$.set(null)
	}
}
