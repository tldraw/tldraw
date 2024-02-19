import {
	StateNode,
	TLArrowShape,
	TLArrowShapeTerminal,
	TLCancelEvent,
	TLEnterEventHandler,
	TLEventHandlers,
	TLHandle,
	TLKeyboardEvent,
	TLPointerEventInfo,
	TLShapeId,
	TLShapePartial,
	Vec,
	snapAngleBetweenPoints,
	sortByIndex,
	structuredClone,
} from '@tldraw/editor'

export class DraggingArrowHandle extends StateNode {
	static override id = 'dragging_arrow_handle'

	markId = ''

	initialHandle = {} as TLHandle
	initialAdjacentHandle = null as TLHandle | null
	initialPagePoint = {} as Vec

	initialPageRotation: any

	info = {} as TLPointerEventInfo & {
		shape: TLArrowShape
		target: 'handle'
		onInteractionEnd?: string
		isCreating: boolean
	}

	isPrecise = false
	isPreciseId = null as TLShapeId | null
	pointingId = null as TLShapeId | null

	override onEnter: TLEnterEventHandler = (
		info: TLPointerEventInfo & {
			shape: TLArrowShape
			target: 'handle'
			isCreating: boolean
		}
	) => {
		const { shape, isCreating, handle } = info
		this.info = info

		if (isCreating) {
			this.parent.setCurrentToolIdMask('arrow')
		}

		this.markId = isCreating ? `creating:${shape.id}` : 'dragging arrow handle'
		if (!isCreating) this.editor.mark(this.markId)

		this.initialHandle = structuredClone(handle)
		this.initialPageRotation = this.editor.getShapePageTransform(shape)!.rotation()
		this.initialPagePoint = this.editor.inputs.originPagePoint.clone()

		this.editor.updateInstanceState(
			{ cursor: { type: isCreating ? 'cross' : 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)

		const handles = this.editor.getShapeHandles(shape)!.sort(sortByIndex)
		const index = handles.findIndex((h) => h.id === info.handle.id)

		this.initialAdjacentHandle = index === 0 ? handles[1] : index === 2 ? handles[0] : null

		const initialTerminal = shape.props[info.handle.id as 'start' | 'end']

		this.isPrecise = false

		if (initialTerminal?.type === 'binding') {
			this.editor.setHintingShapes([initialTerminal.boundShapeId])

			this.isPrecise = initialTerminal.isPrecise
			if (this.isPrecise) {
				this.isPreciseId = initialTerminal.boundShapeId
			} else {
				this.resetExactTimeout()
			}
		} else {
			this.editor.setHintingShapes([])
		}

		this.update()

		this.editor.select(this.info.shape.id)
	}

	private exactTimeout = -1 as any

	private resetExactTimeout() {
		if (this.exactTimeout !== -1) {
			this.clearExactTimeout()
		}

		this.exactTimeout = setTimeout(() => {
			if (this.getIsActive() && !this.isPrecise) {
				this.isPrecise = true
				this.isPreciseId = this.pointingId
				this.update()
			}
			this.exactTimeout = -1
		}, 750)
	}

	private clearExactTimeout() {
		if (this.exactTimeout !== -1) {
			clearTimeout(this.exactTimeout)
			this.exactTimeout = -1
		}
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		this.update()
	}

	override onKeyDown: TLKeyboardEvent | undefined = () => {
		this.update()
	}

	override onKeyUp: TLKeyboardEvent | undefined = () => {
		this.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel: TLCancelEvent = () => {
		this.cancel()
	}

	override onExit = () => {
		this.parent.setCurrentToolIdMask(undefined)
		this.editor.setHintingShapes([])
		this.editor.snaps.clearIndicators()

		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	private complete() {
		this.editor.snaps.clearIndicators()

		const { isCreating } = this.info
		if (this.editor.getInstanceState().isToolLocked && isCreating) {
			this.editor.setCurrentTool('arrow', { shapeId: this.info.shape.id })
			return
		}

		this.parent.transition('idle')
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.complete()
	}

	private update() {
		const { editor, initialPagePoint } = this
		const { initialHandle, initialPageRotation, initialAdjacentHandle } = this
		const hintingShapeIds = this.editor.getHintingShapeIds()
		const isSnapMode = this.editor.user.getIsSnapMode()
		const {
			snaps,
			inputs: { currentPagePoint, shiftKey, ctrlKey, altKey, pointerVelocity },
		} = editor

		const initial = this.info.shape
		const shape = editor.getShape(initial.id)
		if (!shape) return

		const util = editor.getShapeUtil(shape)

		let point = currentPagePoint
			.clone()
			.sub(initialPagePoint)
			.rot(-initialPageRotation)
			.add(initialHandle)

		// Shift alignment
		if (shiftKey && initialAdjacentHandle && initialHandle.id !== 'middle') {
			point = snapAngleBetweenPoints(point, initialAdjacentHandle)
		}

		let nextHandle = { ...initialHandle, x: point.x, y: point.y }

		// Snapping
		editor.snaps.clearIndicators()

		if (initialHandle.canSnap && (isSnapMode ? !ctrlKey : ctrlKey)) {
			const pageTransform = editor.getShapePageTransform(shape.id)
			if (!pageTransform) throw Error('Expected a page transform')

			const snap = snaps.handles.snapHandle({ currentShapeId: shape.id, handle: nextHandle })

			if (snap) {
				snap.nudge.rot(-editor.getShapeParentTransform(shape)!.rotation())
				point.add(snap.nudge)
				nextHandle = { ...initialHandle, x: point.x, y: point.y }
			}
		}

		// Get the changes from the util... (we could move these to the tool)
		const changes = util.onHandleDrag?.(shape, {
			handle: nextHandle,
			isPrecise: this.isPrecise || altKey,
			initial: initial,
		})

		if (!changes) return

		const next: TLShapePartial<any> = { ...shape, ...changes }

		// Bindings
		if (initialHandle.canBind) {
			const bindingAfter = (next.props as any)[initialHandle.id] as TLArrowShapeTerminal | undefined

			if (bindingAfter?.type === 'binding') {
				if (hintingShapeIds[0] !== bindingAfter.boundShapeId) {
					editor.setHintingShapes([bindingAfter.boundShapeId])
					this.pointingId = bindingAfter.boundShapeId
					this.isPrecise = pointerVelocity.len() < 0.5 || altKey
					this.isPreciseId = this.isPrecise ? bindingAfter.boundShapeId : null
					this.resetExactTimeout()
				}
			} else {
				if (hintingShapeIds.length > 0) {
					editor.setHintingShapes([])
					this.pointingId = null
					this.isPrecise = false
					this.isPreciseId = null
					this.resetExactTimeout()
				}
			}
		}

		editor.updateShapes([next], { squashing: true })
	}
}
