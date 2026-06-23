// The one interaction: on your turn, hover the board to preview the cell you'd
// claim, then click to place a site. It's a custom tool (a StateNode) so the
// select tool's brush never gets in the way.

import { StateNode } from 'tldraw'
import { preview$, getWorld } from './game-state'
import { canPlace, placeSite, previewCell } from './sim'

export class VoronoiTool extends StateNode {
	static override id = 'voronoi'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerMove() {
		const world = getWorld()
		if (world.gameOver || world.turn !== 'you') {
			preview$.set(null)
			return
		}
		const p = this.editor.inputs.getCurrentPagePoint()
		preview$.set({ poly: previewCell(world, p.x, p.y), valid: canPlace(world, p.x, p.y) })
	}

	override onPointerDown() {
		const world = getWorld()
		if (world.gameOver || world.turn !== 'you') return
		const p = this.editor.inputs.getCurrentPagePoint()
		if (placeSite(world, p.x, p.y, 'you')) preview$.set(null)
	}

	override onExit() {
		preview$.set(null)
	}

	override onCancel() {
		preview$.set(null)
	}
}
