import {
	Box,
	StateNode,
	TLCancelEvent,
	TLEventHandlers,
	TLGeoShape,
	TLInterruptEvent,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
	createShapeId,
	moveCameraWhenCloseToEdge,
} from '@tldraw/editor'

export class Brushing extends StateNode {
	static override id = 'brushing'

	info = {} as TLPointerEventInfo & { target: 'canvas' }

	brush = new Box()

	gridShapes: TLShapeId[] = []

	initialStartShape: TLGeoShape | null = null

	override onEnter = (info: TLGeoShape) => {
		this.initialStartShape = { ...info }
	}

	override onTick = () => {
		moveCameraWhenCloseToEdge(this.editor)
	}

	override onPointerMove = () => {
		this.createNoteGrid()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel?: TLCancelEvent | undefined = (info) => {
		this.cleanupGridShapes()
		this.editor.updateInstanceState({ brush: null })
		this.parent.transition('idle', info)
	}

	private complete() {
		this.editor.updateInstanceState({ brush: null })
		this.gridShapes.shift()

		const gridShapes = this.gridShapes.map((id) => {
			const shape = this.editor.getShape(id)
			return shape
		})
		gridShapes.unshift(this.initialStartShape!)
		this.editor.createShapes(
			gridShapes.map((shape) => {
				return {
					type: 'note',
					x: shape!.x,
					y: shape!.y,
					id: createShapeId(),
				}
			})
		)
		this.editor.deleteShapes([...this.gridShapes, this.initialStartShape!.id])

		this.parent.transition('idle')
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.cleanupGridShapes()
		this.editor.updateInstanceState({ brush: null })
	}

	private createNoteGrid() {
		const noteSize = 200 + 30
		const {
			inputs: { currentPagePoint },
		} = this.editor
		// Set the brush to contain the current and origin points
		const originPoint = { x: this.initialStartShape!.x + 115, y: this.initialStartShape!.y + 115 }
		const angle = Vec.Sub(currentPagePoint, originPoint).uni()
		const newPoint = Vec.Add(currentPagePoint, angle.mul(noteSize + 100))
		this.brush.setTo(Box.FromPoints([originPoint, newPoint]))
		console.log({ angle })
		const isLeft = originPoint.x - currentPagePoint.x > 0
		const isUp = originPoint.y - currentPagePoint.y > 0
		const direction = {
			isLeft,
			isUp,
		}
		// test how many notes fit in the brush horizontally and vertically

		const brushWidth = this.brush.width
		const offsetOriginPoint = {
			x: originPoint.x - noteSize / 2,
			y: originPoint.y - noteSize / 2,
		}

		const notesPerRow = Math.floor(Math.max(brushWidth / noteSize, 1))
		const notesPerColumn = Math.floor(Math.max(this.brush.height / noteSize, 1))

		const totalNotes = notesPerRow * notesPerColumn
		// delete the old grid
		this.editor.deleteShapes(this.gridShapes)
		// create the shapes
		const geoIds = Array.from({ length: totalNotes }, () => createShapeId())
		for (let i = 0; i < notesPerColumn; i++) {
			for (let j = 0; j < notesPerRow; j++) {
				if (i === 0 && j === 0) continue
				let x = offsetOriginPoint.x + j * noteSize
				let y = offsetOriginPoint.y + i * noteSize
				if (direction.isLeft) x = offsetOriginPoint.x - j * noteSize
				if (direction.isUp) y = offsetOriginPoint.y - i * noteSize
				const geoId = geoIds[i * notesPerRow + j]
				this.editor.createShape<TLGeoShape>({
					type: 'geo',
					x,
					y,
					id: geoId,
					opacity: 0.5,
					props: {
						h: 200,
						w: 200,
						color: 'light-blue',
						fill: 'solid',
						dash: 'dashed',
					},
				})
			}
		}
		this.gridShapes = geoIds
	}

	private cleanupGridShapes() {
		this.editor.deleteShapes(this.gridShapes)
		this.gridShapes = []
	}
}
