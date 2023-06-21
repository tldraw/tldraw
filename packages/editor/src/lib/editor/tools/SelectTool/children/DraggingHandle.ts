import { sortByIndex } from '@tldraw/indices'
import { Matrix2d, snapAngle, Vec2d } from '@tldraw/primitives'
import {
	TLArrowShape,
	TLArrowShapeTerminal,
	TLHandle,
	TLShapeId,
	TLShapePartial,
} from '@tldraw/tlschema'
import { deepCopy } from '@tldraw/utils'
import {
	TLCancelEvent,
	TLEnterEventHandler,
	TLEventHandlers,
	TLKeyboardEvent,
	TLPointerEventInfo,
} from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class DraggingHandle extends StateNode {
	static id = 'dragging_handle'

	shapeId = '' as TLShapeId
	initialHandle = {} as TLHandle
	initialAdjacentHandle = null as TLHandle | null

	markId = ''
	initialPageTransform: any
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

	onEnter: TLEnterEventHandler = (
		info: TLPointerEventInfo & {
			shape: TLArrowShape
			target: 'handle'
			onInteractionEnd?: string
			isCreating: boolean
		}
	) => {
		const { shape, isCreating, handle } = info
		this.info = info
		this.shapeId = shape.id
		this.markId = isCreating ? 'creating' : this.editor.mark('dragging handle')
		this.initialHandle = deepCopy(handle)
		this.initialPageTransform = this.editor.getPageTransform(shape)!
		this.initialPageRotation = this.editor.getPageRotation(shape)!

		this.editor.setCursor({ type: isCreating ? 'cross' : 'grabbing', rotation: 0 })

		// <!-- Only relevant to arrows
		const handles = this.editor.getHandles(shape)!.sort(sortByIndex)
		const index = handles.findIndex((h) => h.id === info.handle.id)

		// Find the adjacent handle
		this.initialAdjacentHandle = null

		// Start from the handle and work forward
		for (let i = index + 1; i < handles.length; i++) {
			const handle = handles[i]
			if (handle.type === 'vertex' && handle.id !== 'middle' && handle.id !== info.handle.id) {
				this.initialAdjacentHandle = handle
				break
			}
		}

		// If still no handle, start from the end and work backward
		if (!this.initialAdjacentHandle) {
			for (let i = handles.length - 1; i >= 0; i--) {
				const handle = handles[i]
				if (handle.type === 'vertex' && handle.id !== 'middle' && handle.id !== info.handle.id) {
					this.initialAdjacentHandle = handle
					break
				}
			}
		}

		const initialTerminal = shape.props[info.handle.id as 'start' | 'end']

		this.isPrecise = false

		if (initialTerminal?.type === 'binding') {
			this.editor.setHintingIds([initialTerminal.boundShapeId])

			this.isPrecise = !Vec2d.Equals(initialTerminal.normalizedAnchor, { x: 0.5, y: 0.5 })
			if (this.isPrecise) {
				this.isPreciseId = initialTerminal.boundShapeId
			} else {
				this.resetExactTimeout()
			}
		}
		// -->

		this.update()
	}

	// Only relevant to arrows
	private exactTimeout = -1 as any

	// Only relevant to arrows
	private resetExactTimeout() {
		if (this.exactTimeout !== -1) {
			this.clearExactTimeout()
		}

		this.exactTimeout = setTimeout(() => {
			if (this.isActive && !this.isPrecise) {
				this.isPrecise = true
				this.isPreciseId = this.pointingId
				this.update()
			}
			this.exactTimeout = -1
		}, 750)
	}

	// Only relevant to arrows
	private clearExactTimeout() {
		if (this.exactTimeout !== -1) {
			clearTimeout(this.exactTimeout)
			this.exactTimeout = -1
		}
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		this.update()
	}

	onKeyDown: TLKeyboardEvent | undefined = () => {
		this.update()
	}

	onKeyUp: TLKeyboardEvent | undefined = () => {
		this.update()
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	onCancel: TLCancelEvent = () => {
		this.cancel()
	}

	onExit = () => {
		this.editor.setHintingIds([])
		this.editor.snaps.clear()
		this.editor.setCursor({ type: 'default' })
	}

	private complete() {
		this.editor.snaps.clear()

		const { onInteractionEnd } = this.info
		if (this.editor.instanceState.isToolLocked && onInteractionEnd) {
			// Return to the tool that was active before this one,
			// but only if tool lock is turned on!
			this.editor.setSelectedTool(onInteractionEnd, { shapeId: this.shapeId })
			return
		}

		this.parent.transition('idle', {})
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.editor.snaps.clear()

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			// Return to the tool that was active before this one,
			// whether tool lock is turned on or not!
			this.editor.setSelectedTool(onInteractionEnd, { shapeId: this.shapeId })
			return
		}

		this.parent.transition('idle', {})
	}

	private update() {
		const { editor, shapeId } = this
		const { initialHandle, initialPageRotation, initialAdjacentHandle } = this
		const {
			isSnapMode,
			hintingIds,
			snaps,
			inputs: { currentPagePoint, originPagePoint, shiftKey, ctrlKey, altKey, pointerVelocity },
		} = editor

		const shape = editor.getShapeById(shapeId)
		if (!shape) return

		const util = editor.getShapeUtil(shape)

		let point = currentPagePoint
			.clone()
			.sub(originPagePoint)
			.rot(-initialPageRotation)
			.add(initialHandle)

		if (shiftKey && initialAdjacentHandle && initialHandle.id !== 'middle') {
			const angle = Vec2d.Angle(initialAdjacentHandle, point)
			const snappedAngle = snapAngle(angle, 24)
			const angleDifference = snappedAngle - angle
			point = Vec2d.RotWith(point, initialAdjacentHandle, angleDifference)
		}

		// Clear any existing snaps
		editor.snaps.clear()

		if (isSnapMode ? !ctrlKey : ctrlKey) {
			// We're snapping
			const pageTransform = editor.getPageTransformById(shape.id)
			if (!pageTransform) throw Error('Expected a page transform')

			// Get all the outline segments from the shape
			const additionalSegments = util
				.getOutlineSegments(shape)
				.map((segment) => Matrix2d.applyToPoints(pageTransform, segment))

			// We want to skip the segments that include the handle, so
			// find the index of the handle that shares the same index property
			// as the initial dragging handle; this catches a quirk of create handles
			const handleIndex = editor
				.getHandles(shape)!
				.filter(({ type }) => type === 'vertex')
				.sort(sortByIndex)
				.findIndex(({ index }) => initialHandle.index === index)

			additionalSegments.splice(handleIndex - 1, 2)

			const snapDelta = snaps.getSnappingHandleDelta({
				additionalSegments,
				handlePoint: Matrix2d.applyToPoint(pageTransform, point),
			})

			if (snapDelta) {
				point.add(editor.getDeltaInShapeSpace(shape, snapDelta))
			}
		}

		const changes = util.onHandleChange?.(shape, {
			handle: {
				...initialHandle,
				x: point.x,
				y: point.y,
			},
			isPrecise: this.isPrecise || altKey,
		})

		const next: TLShapePartial<any> = { ...shape, ...changes }

		// Arrows
		if (initialHandle.canBind) {
			const bindingAfter = (next.props as any)[initialHandle.id] as TLArrowShapeTerminal | undefined

			if (bindingAfter?.type === 'binding') {
				if (hintingIds[0] !== bindingAfter.boundShapeId) {
					editor.setHintingIds([bindingAfter.boundShapeId])
					this.pointingId = bindingAfter.boundShapeId
					this.isPrecise = pointerVelocity.len() < 0.5 || altKey
					this.isPreciseId = this.isPrecise ? bindingAfter.boundShapeId : null
					this.resetExactTimeout()
				}
			} else {
				if (hintingIds.length > 0) {
					editor.setHintingIds([])
					this.pointingId = null
					this.isPrecise = false
					this.isPreciseId = null
					this.resetExactTimeout()
				}
			}
		}

		if (changes) {
			editor.updateShapes([next], true)
		}
	}
}
