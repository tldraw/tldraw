import {
	StateNode,
	TLCancelEvent,
	TLEnterEventHandler,
	TLEventHandlers,
	TLHandle,
	TLKeyboardEvent,
	TLLineShape,
	TLPointerEventInfo,
	TLShapeId,
	TLShapePartial,
	Vec,
	snapAngleBetweenPoints,
	sortByIndex,
	structuredClone,
} from '@tldraw/editor'

export class DraggingLineHandle extends StateNode {
	static override id = 'dragging_line_handle'

	markId = ''

	info = {} as TLPointerEventInfo & {
		shape: TLLineShape
		target: 'handle'
		onInteractionEnd?: string
		isCreating: boolean
	}

	initialHandle = {} as TLHandle
	initialAdjacentHandle = null as TLHandle | null
	initialPagePoint = {} as Vec
	initialPageRotation: any

	isPrecise = false
	isPreciseId = null as TLShapeId | null
	pointingId = null as TLShapeId | null

	override onEnter: TLEnterEventHandler = (
		info: TLPointerEventInfo & {
			shape: TLLineShape
			target: 'handle'
			onInteractionEnd?: string
			isCreating: boolean
		}
	) => {
		const { shape, isCreating, handle } = info
		this.info = info

		if (isCreating) {
			this.parent.setCurrentToolIdMask('line')
		}

		this.markId = isCreating ? `creating:${shape.id}` : 'dragging line handle'
		if (!isCreating) this.editor.mark(this.markId)

		this.initialHandle = structuredClone(handle)
		this.initialPageRotation = this.editor.getShapePageTransform(shape)!.rotation()
		this.initialPagePoint = this.editor.inputs.originPagePoint.clone()

		// For line shapes, if we're dragging a "create" handle, then
		// create a new vertex handle at that point; and make this handle
		// the handle that we're dragging.
		if (this.initialHandle.type === 'create') {
			const handles = this.editor.getShapeHandles(shape)!
			const index = handles.indexOf(handle)
			const points = structuredClone(shape.props.points)
			points.splice(Math.ceil(index / 2), 0, { x: handle.x, y: handle.y })
			this.editor.updateShape({
				...shape,
				props: {
					points,
				},
			})
			const handlesAfter = this.editor.getShapeHandles(shape)!
			const handleAfter = handlesAfter.find((h) => h.x === handle.x && h.y === handle.y)!
			this.initialHandle = structuredClone(handleAfter)
		}

		this.initialPageRotation = this.editor.getShapePageTransform(shape)!.rotation()
		this.initialPagePoint = this.editor.inputs.originPagePoint.clone()

		this.editor.updateInstanceState(
			{ cursor: { type: isCreating ? 'cross' : 'grabbing', rotation: 0 } },
			{ ephemeral: true }
		)

		// Find the adjacent handle
		const handles = this.editor
			.getShapeHandles(shape)!
			.filter((h) => h.type === 'vertex')
			.sort(sortByIndex)
		const index = handles.findIndex((h) => h.id === this.initialHandle.id)
		this.initialAdjacentHandle = handles[index === 0 ? 1 : index - 1]

		this.update()

		this.editor.select(this.info.shape.id)
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
		this.editor.snaps.clearIndicators()

		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
	}

	private complete() {
		const { isCreating } = this.info
		if (isCreating && this.editor.getInstanceState().isToolLocked) {
			this.editor.setCurrentTool('line', { shapeId: this.info.shape.id })
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
		const isSnapMode = this.editor.user.getIsSnapMode()
		const {
			snaps,
			inputs: { currentPagePoint, shiftKey, ctrlKey, altKey },
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
		if (shiftKey && initialAdjacentHandle) {
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

		const changes = util.onHandleDrag?.(shape, {
			handle: nextHandle,
			isPrecise: this.isPrecise || altKey,
			initial: initial,
		})

		if (changes) {
			const next: TLShapePartial<any> = { ...shape, ...changes }
			editor.updateShapes([next], { squashing: true })
		}
	}
}
