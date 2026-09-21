import {
	atom,
	pointInPolygon,
	polygonsIntersect,
	StateNode,
	TLPointerEventInfo,
	TLShape,
	VecModel,
} from 'tldraw'

// There's a guide at the bottom of this file!

export class LassoSelectTool extends StateNode {
	static override id = 'lasso-select'
	static override children() {
		return [IdleState, LassoingState]
	}
	static override initial = 'idle'
}

export class IdleState extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		const { editor } = this

		editor.selectNone()
		this.parent.transition('lassoing', info)
	}
}

//[1]
export class LassoingState extends StateNode {
	static override id = 'lassoing'

	info = {} as TLPointerEventInfo

	markId = null as null | string

	//[a]
	points = atom<VecModel[]>('lasso points', [])

	override onEnter(info: TLPointerEventInfo) {
		this.points.set([])
		this.markId = null
		this.info = info

		this.startLasso()
	}

	private startLasso() {
		this.markId = this.editor.markHistoryStoppingPoint('lasso start')
	}

	//[b]
	override onPointerMove(): void {
		this.addPointToLasso()
	}

	private addPointToLasso() {
		const { inputs } = this.editor

		const { x, y, z } = inputs.getCurrentPagePoint().toFixed()
		const newPoint = { x, y, z }

		this.points.set([...this.points.get(), newPoint])
	}

	//[c]
	private getShapesInLasso() {
		const { editor } = this

		const shapes = editor.getCurrentPageRenderingShapesSorted()
		const lassoPoints = this.points.get()
		const shapesInLasso = shapes.filter((shape) => {
			return this.doesLassoFullyContainShape(lassoPoints, shape)
		})

		return shapesInLasso
	}

	private doesLassoFullyContainShape(lassoPoints: VecModel[], shape: TLShape): boolean {
		const { editor } = this

		const geometry = editor.getShapeGeometry(shape)
		const pageTransform = editor.getShapePageTransform(shape)
		const shapeVertices = pageTransform.applyToPoints(geometry.vertices)

		const allVerticesInside = shapeVertices.every((vertex) => {
			return pointInPolygon(vertex, lassoPoints)
		})

		if (!allVerticesInside) {
			return false
		}

		// All vertices can be inside the lasso while an edge still crosses it, e.g. a
		// wide shape inside a concave lasso. Reject those too.
		if (geometry.isClosed) {
			if (polygonsIntersect(shapeVertices, lassoPoints)) {
				return false
			}
		}

		return true
	}

	override onPointerUp(): void {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	//[d]
	complete() {
		const { editor } = this

		const shapesInLasso = this.getShapesInLasso()
		editor.setSelectedShapes(shapesInLasso)

		editor.setCurrentTool('select')
	}
}

/*
For a general guide on building tools with child states, see the `MiniSelectTool` in the only-editor example.

[1]
`LassoingState` is active from pointer down until pointer up.

    [a]
    `points` is an `atom` rather than a plain array so that `LassoOverlayUtil`, which reads it while
    rendering the canvas overlay, re-renders whenever a point is added.

    [b]
    Each pointer move appends the current page-space pointer position to `points`.

    [c]
    A shape counts as inside the lasso when every one of its page-space vertices is inside the lasso
    polygon and none of its edges cross the lasso outline.

    [d]
    On pointer up (or when the editor completes the interaction some other way, e.g. a menu opens or
    the page changes), select the enclosed shapes and hand back to the select tool.

If you wanted to take the lasso further, you could:
- live update the selection as the user moves the mouse, similar to how the default select and brush select tools work
- use modifier keys to add or subtract from the selection instead of just setting the selection
- properly handle what happens when we select a shape that's grouped with other shapes (do we select the shape within the group or move up a level and select the entire group? what about layers?)
- extend the default selection tool to allow for lasso selection when a hotkey is pressed, similar to the brush select tool
- add a little bit of leeway to the lasso selection logic to allow for shapes that are mostly, but not fully, enclosed in the lasso to be selected

*/
