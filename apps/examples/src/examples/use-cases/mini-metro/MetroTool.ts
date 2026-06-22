// The one interaction in the game, and the whole point of the demo: you build a
// metro line by dragging from one station to another — the same gesture as
// drawing on a tldraw whiteboard. It's a custom tool (a StateNode) rather than
// pointer-event handlers so the select tool's brush never gets in the way.

import { StateNode, Vec } from 'tldraw'
import { STATION_R } from './constants'
import { drag$, getWorld } from './game-state'
import { addConnection, previewColor } from './sim'

// The station under a page point, if any (a touch larger than the drawn radius
// so it's forgiving to hit).
function stationAt(point: Vec) {
	const world = getWorld()
	let best: { id: number; x: number; y: number } | null = null
	let bestDist = STATION_R * 1.6
	for (const s of world.stations) {
		const d = Math.hypot(s.x - point.x, s.y - point.y)
		if (d < bestDist) {
			bestDist = d
			best = s
		}
	}
	return best
}

export class MetroTool extends StateNode {
	static override id = 'metro'

	private fromId: number | null = null

	override onEnter() {
		this.editor.setCursor({ type: 'pointer', rotation: 0 })
	}

	override onPointerDown() {
		const point = this.editor.inputs.getCurrentPagePoint()
		const hit = stationAt(point)
		if (!hit) return
		this.fromId = hit.id
		drag$.set({ fromX: hit.x, fromY: hit.y, toX: point.x, toY: point.y, snapId: null, color: null })
	}

	override onPointerMove() {
		if (this.fromId === null) return
		const point = this.editor.inputs.getCurrentPagePoint()
		const world = getWorld()
		const target = stationAt(point)
		const from = world.stations.find((s) => s.id === this.fromId)!

		// Snap the preview endpoint to a valid target station.
		if (target && target.id !== this.fromId) {
			const color = previewColor(world, this.fromId, target.id)
			drag$.set({
				fromX: from.x,
				fromY: from.y,
				toX: target.x,
				toY: target.y,
				snapId: color ? target.id : null,
				color,
			})
		} else {
			drag$.set({
				fromX: from.x,
				fromY: from.y,
				toX: point.x,
				toY: point.y,
				snapId: null,
				color: null,
			})
		}
	}

	override onPointerUp() {
		if (this.fromId === null) return
		const target = stationAt(this.editor.inputs.getCurrentPagePoint())
		if (target && target.id !== this.fromId) {
			addConnection(getWorld(), this.fromId, target.id)
		}
		this.fromId = null
		drag$.set(null)
	}

	override onCancel() {
		this.fromId = null
		drag$.set(null)
	}
}
