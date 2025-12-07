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

		const { x, y, z } = inputs.currentPagePoint.toFixed()
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

		// Early return if any vertex is not inside the lasso
		if (!allVerticesInside) {
			return false
		}

		// If any shape edges intersect with the lasso, then we know it can't be fully contained by the lasso because of like the mean value theorem or something.
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
This is where we define the actual lasso select tool and its functionality.

For a general guide on how to built tools with child states, see the `MiniSelectTool` in the only-editor example.

[1]
The main meat of this tool is in the `LassoingState` class. This is the state that is active when the user has the tool selected and holds the mouse down.

    [a]
    The `points` attribute is an instance of the `atom` class. This makes the entire thing work by allowing us to reactively read the lasso points from the `Overlays` layer (which we then use to draw the lasso). As the user moves the mouse, `points` will be updated.

    [b]
    `onPointerMove()`, which is called when the user moves the mouse, calls `addPointToLasso()`, which adds the current mouse position in page space to `points`.

    [c]
    `getShapesInLasso()`, alongside `doesLassoFullyContainShape()` handles the logic of figuring out which shapes on the canvas are fully contained within the lasso.

    [d]
    `onPointerUp()`, which is called when the user releases the mouse, calls the state's `complete()` function. This gets all shapes inside the lasso and selects all of them using the editor's `setSelectedShapes()` function.

In general, if we wanted to add more functionality to the lasso select, we could:
- live update the selection as the user moves the mouse, similar to how the default select and brush select tools work
- use modifier keys to add or subtract from the selection instead of just setting the selection
- properly handle what happens when we select a shape that's grouped with other shapes (do we select the shape within the group or move up a level and select the entire group? what about layers?)
- extend the default selection tool to allow for lasso selection when a hotkey is pressed, similar to the brush select tool
- add a little bit of leeway to the lasso selection logic to allow for shapes that are mostly, but not fully, enclosed in the lasso to be selected

*/
