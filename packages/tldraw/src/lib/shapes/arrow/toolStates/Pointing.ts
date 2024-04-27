import { StateNode, TLArrowShape, TLEventHandlers, createShapeId } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLArrowShape

	markId = ''

	timeEntered = 0

	override onEnter = () => {
		this.timeEntered = Date.now()
		const boundShapeToBe = this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
			filter: (targetShape) => {
				return !targetShape.isLocked && this.editor.getShapeUtil(targetShape).canBind(targetShape)
			},
			hitInside: true,
			renderingOnly: true,
		})

		if (boundShapeToBe) {
			// Don't create the arrow yet, we'll create it when the user starts dragging...
			// but DO set the hinting shape, showing that the arrow (when we create it)
			// will be bound to the shape
			this.editor.setHintingShapes([boundShapeToBe.id])
		}
	}

	override onExit = () => {
		this.shape = undefined
		this.editor.setHintingShapes([])
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			if (!this.shape) {
				this.createArrowShape()
			}

			if (!this.shape) throw Error(`expected shape`)

			this.updateArrowShapeEndHandle()

			this.editor.setCurrentTool('select.dragging_handle', {
				shape: this.shape,
				handle: this.editor.getShapeHandles(this.shape)!.find((h) => h.id === 'end')!,
				isCreating: true,
				onInteractionEnd: 'arrow',
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.cancel()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.cancel()
	}

	cancel() {
		if (this.shape) {
			// the arrow might not have been created yet!
			this.editor.bailToMark(this.markId)
		}
		this.editor.setHintingShapes([])
		this.parent.transition('idle')
	}

	createArrowShape() {
		const { originPagePoint } = this.editor.inputs

		const id = createShapeId()

		this.markId = `creating:${id}`
		this.editor.mark(this.markId)

		this.editor.createShapes<TLArrowShape>([
			{
				id,
				type: 'arrow',
				x: originPagePoint.x,
				y: originPagePoint.y,
			},
		])

		const shape = this.editor.getShape<TLArrowShape>(id)
		if (!shape) throw Error(`expected shape`)

		const handles = this.editor.getShapeHandles(shape)
		if (!handles) throw Error(`expected handles for arrow`)

		const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
		const startHandle = handles.find((h) => h.id === 'start')!
		const change = util.onHandleDrag?.(shape, {
			handle: { ...startHandle, x: 0, y: 0 },
			timeInBoundShape: Date.now() - this.timeEntered,
		})

		if (change) {
			const startTerminal = change.props?.start
			if (startTerminal?.type === 'binding') {
				this.editor.setHintingShapes([startTerminal.boundShapeId])
			}
			this.editor.updateShapes([change])
		}

		// Cache the current shape after those changes
		this.shape = this.editor.getShape(id)
		this.editor.select(id)
	}

	updateArrowShapeEndHandle() {
		const shape = this.shape
		if (!shape) throw Error(`expected shape`)

		const handles = this.editor.getShapeHandles(shape)
		if (!handles) throw Error(`expected handles for arrow`)

		const shapeWithOutEndOffset = {
			...shape,
			props: { ...shape.props, end: { ...shape.props.end, x: 0, y: 0 } },
		}

		// end update
		{
			const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
			const point = this.editor.getPointInShapeSpace(shape, this.editor.inputs.currentPagePoint)
			const endHandle = handles.find((h) => h.id === 'end')!
			const change = util.onHandleDrag?.(shapeWithOutEndOffset, {
				handle: { ...endHandle, x: point.x, y: point.y },
				timeInBoundShape: 0,
			})

			if (change) {
				const endTerminal = change.props?.end
				if (endTerminal?.type === 'binding') {
					this.editor.setHintingShapes([endTerminal.boundShapeId])
				}
				this.editor.updateShapes([change])
			}
		}

		// start update
		{
			const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
			const startHandle = handles.find((h) => h.id === 'start')!
			const change = util.onHandleDrag?.(shapeWithOutEndOffset, {
				handle: { ...startHandle, x: 0, y: 0 },
				timeInBoundShape: Date.now() - this.timeEntered,
			})

			if (change) {
				this.editor.updateShapes([change])
			}
		}

		// Cache the current shape after those changes
		this.shape = this.editor.getShape(shape.id)
	}
}
