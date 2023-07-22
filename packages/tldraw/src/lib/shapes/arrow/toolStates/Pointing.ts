import {
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	createShapeId,
	getSmallestShapeContainingPoint,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLArrowShape

	preciseTimeout = -1
	didTimeout = false

	private startPreciseTimeout() {
		this.preciseTimeout = window.setTimeout(() => {
			if (!this.isActive) return
			this.didTimeout = true
		}, 320)
	}

	private clearPreciseTimeout() {
		clearTimeout(this.preciseTimeout)
	}

	override onEnter = () => {
		this.didTimeout = false

		const target = getSmallestShapeContainingPoint(
			this.editor,
			this.editor.inputs.currentPagePoint,
			{ filter: (shape, util) => util.canBind(shape), ignoreMargin: false, hitInside: true }
		)

		if (!target) {
			this.createArrowShape()
		} else {
			this.editor.setHintingIds([target.id])
		}

		this.startPreciseTimeout()
	}

	override onExit = () => {
		this.shape = undefined
		this.editor.setHintingIds([])
		this.clearPreciseTimeout()
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
				handle: this.editor.getHandles(this.shape)!.find((h) => h.id === 'end')!,
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
		this.editor.bailToMark('creating')
		this.editor.setHintingIds([])
		this.parent.transition('idle', {})
	}

	createArrowShape() {
		this.editor.mark('creating')

		const id = createShapeId()

		const { originPagePoint } = this.editor.inputs

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

		const handles = this.editor.getHandles(shape)
		if (!handles) throw Error(`expected handles for arrow`)

		const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
		const startHandle = handles.find((h) => h.id === 'start')!
		const change = util.onHandleChange?.(shape, {
			handle: { ...startHandle, x: 0, y: 0 },
			isPrecise: true,
		})

		if (change) {
			const startTerminal = change.props?.start
			if (startTerminal?.type === 'binding') {
				this.editor.setHintingIds([startTerminal.boundShapeId])
			}
			this.editor.updateShapes([change], true)
		}

		// Cache the current shape after those changes
		this.shape = this.editor.getShape(id)
		this.editor.select(id)
	}

	updateArrowShapeEndHandle() {
		const shape = this.shape
		if (!shape) throw Error(`expected shape`)

		const handles = this.editor.getHandles(shape)
		if (!handles) throw Error(`expected handles for arrow`)

		// end update
		{
			const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
			const point = this.editor.getPointInShapeSpace(shape, this.editor.inputs.currentPagePoint)
			const endHandle = handles.find((h) => h.id === 'end')!
			const change = util.onHandleChange?.(shape, {
				handle: { ...endHandle, x: point.x, y: point.y },
				isPrecise: false, // sure about that?
			})

			if (change) {
				const endTerminal = change.props?.end
				if (endTerminal?.type === 'binding') {
					this.editor.setHintingIds([endTerminal.boundShapeId])
				}
				this.editor.updateShapes([change], true)
			}
		}

		// start update
		{
			const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
			const startHandle = handles.find((h) => h.id === 'start')!
			const change = util.onHandleChange?.(shape, {
				handle: { ...startHandle, x: 0, y: 0 },
				isPrecise: this.didTimeout, // sure about that?
			})

			if (change) {
				this.editor.updateShapes([change], true)
			}
		}

		// Cache the current shape after those changes
		this.shape = this.editor.getShape(shape.id)
	}
}
