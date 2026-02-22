import { StateNode } from 'tldraw'
import { CORAL_TYPE } from './coral-shape-types'

// [1]
export class CoralDrawTool extends StateNode {
	static override id = 'coral-draw'

	private points: { x: number; y: number }[] = []
	private isDrawing = false

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
		this.points = []
		this.isDrawing = false
	}

	override onPointerDown() {
		const point = this.editor.inputs.getCurrentPagePoint()
		this.points = [{ x: point.x, y: point.y }]
		this.isDrawing = true
	}

	// [2]
	override onPointerMove() {
		if (!this.isDrawing) return
		const point = this.editor.inputs.getCurrentPagePoint()
		const last = this.points[this.points.length - 1]
		const dx = point.x - last.x
		const dy = point.y - last.y
		// Only add a point if the pointer has moved at least 4px from the last point
		if (dx * dx + dy * dy > 16) {
			this.points.push({ x: point.x, y: point.y })
		}
	}

	// [3]
	override onPointerUp() {
		if (!this.isDrawing || this.points.length < 3) {
			this.isDrawing = false
			this.points = []
			return
		}

		// Normalize points so the shape origin is at (0,0)
		let minX = Infinity
		let minY = Infinity
		for (const p of this.points) {
			minX = Math.min(minX, p.x)
			minY = Math.min(minY, p.y)
		}

		const basePath = this.points.map((p) => ({ x: p.x - minX, y: p.y - minY }))

		// Compute the center X of the path; pull upward by default
		let cx = 0
		let maxY = 0
		for (const p of basePath) {
			cx += p.x
			maxY = Math.max(maxY, p.y)
		}
		cx /= basePath.length

		this.editor.createShape({
			type: CORAL_TYPE,
			x: minX,
			y: minY,
			props: {
				basePath,
				pullVector: { x: 0, y: -maxY * 2.5 },
			},
		})

		this.isDrawing = false
		this.points = []
		this.editor.setCurrentTool('select')
	}

	override onCancel() {
		this.isDrawing = false
		this.points = []
	}
}

/*
[1]
A simple freehand drawing tool. The user holds down the pointer to draw a loop of points.

[2]
We throttle point collection to every 4px to keep the path manageable while still capturing detail.

[3]
On pointer up, we normalize the path so its bounding box starts at (0,0), create the coral shape,
and switch back to the select tool so the user can immediately grab the pull handle.
*/
