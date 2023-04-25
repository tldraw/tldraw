import { Matrix2d, snapAngle, Vec2d } from '@tldraw/primitives'
import {
	TLArrowShape,
	TLArrowTerminal,
	TLHandle,
	TLShapeId,
	TLShapePartial,
} from '@tldraw/tlschema'
import { deepCopy } from '@tldraw/utils'
import { sortByIndex } from '../../../../utils/reordering/reordering'
import {
	TLCancelEvent,
	TLEventHandlers,
	TLKeyboardEvent,
	TLPointerEventInfo,
	UiEnterHandler,
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

	onEnter: UiEnterHandler = (
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
		this.markId = isCreating ? 'creating' : this.app.mark('dragging handle')
		this.initialHandle = deepCopy(handle)
		this.initialPageTransform = this.app.getPageTransform(shape)!
		this.initialPageRotation = this.app.getPageRotation(shape)!

		this.app.setCursor({ type: isCreating ? 'cross' : 'grabbing', rotation: 0 })

		const handles = this.app.getShapeUtil(shape).handles(shape).sort(sortByIndex)
		const index = handles.findIndex((h) => h.id === info.handle.id)

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
			this.app.setHintingIds([initialTerminal.boundShapeId])

			this.isPrecise = !Vec2d.Equals(initialTerminal.normalizedAnchor, { x: 0.5, y: 0.5 })
			if (this.isPrecise) {
				this.isPreciseId = initialTerminal.boundShapeId
			} else {
				this.resetExactTimeout()
			}
		}

		this.update()
	}

	exactTimeout = -1 as any

	resetExactTimeout() {
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

	clearExactTimeout() {
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
		this.app.setHintingIds([])
		this.app.snaps.clear()
		this.app.setCursor({ type: 'default' })
	}

	private complete() {
		this.app.snaps.clear()

		const { onInteractionEnd } = this.info
		if (this.app.instanceState.isToolLocked && onInteractionEnd) {
			// Return to the tool that was active before this one,
			// but only if tool lock is turned on!
			this.app.setSelectedTool(onInteractionEnd, { shapeId: this.shapeId })
			return
		}

		this.parent.transition('idle', {})
	}

	private cancel() {
		this.app.bailToMark(this.markId)
		this.app.snaps.clear()

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			// Return to the tool that was active before this one,
			// whether tool lock is turned on or not!
			this.app.setSelectedTool(onInteractionEnd, { shapeId: this.shapeId })
			return
		}

		this.parent.transition('idle', {})
	}

	private update() {
		const { currentPagePoint, originPagePoint, shiftKey } = this.app.inputs
		const shape = this.app.getShapeById(this.shapeId)

		if (!shape) return

		let point = Vec2d.Add(
			Vec2d.Rot(Vec2d.Sub(currentPagePoint, originPagePoint), -this.initialPageRotation),
			this.initialHandle
		)

		if (shiftKey && this.initialHandle.id !== 'middle') {
			const { initialAdjacentHandle } = this

			if (initialAdjacentHandle) {
				const angle = Vec2d.Angle(initialAdjacentHandle, point)
				const snappedAngle = snapAngle(angle, 24)
				const angleDifference = snappedAngle - angle
				point = Vec2d.RotWith(point, initialAdjacentHandle, angleDifference)
			}
		}

		this.app.snaps.clear()

		const { ctrlKey } = this.app.inputs
		const shouldSnap = this.app.userDocumentSettings.isSnapMode ? !ctrlKey : ctrlKey

		if (shouldSnap && shape.type === 'line') {
			const pagePoint = Matrix2d.applyToPoint(this.app.getPageTransformById(shape.id)!, point)
			const snapData = this.app.snaps.snapLineHandleTranslate({
				lineId: shape.id,
				handleId: this.initialHandle.id,
				handlePoint: pagePoint,
			})

			const { nudge } = snapData
			if (nudge.x || nudge.y) {
				const shapeSpaceNudge = this.app.getDeltaInShapeSpace(shape, nudge)
				point = Vec2d.Add(point, shapeSpaceNudge)
			}
		}

		const util = this.app.getShapeUtil(shape)

		const changes = util.onHandleChange?.(shape, {
			handle: {
				...this.initialHandle,
				x: point.x,
				y: point.y,
			},
			isPrecise: this.isPrecise || this.app.inputs.altKey,
		})

		const next: TLShapePartial<any> = { ...shape, ...changes }

		if (this.initialHandle.canBind) {
			const bindingAfter = (next.props as any)[this.initialHandle.id] as TLArrowTerminal | undefined

			if (bindingAfter?.type === 'binding') {
				if (this.app.hintingIds[0] !== bindingAfter.boundShapeId) {
					this.app.setHintingIds([bindingAfter.boundShapeId])
					this.pointingId = bindingAfter.boundShapeId
					this.isPrecise = this.app.inputs.pointerVelocity.len() < 0.5 || this.app.inputs.altKey
					this.isPreciseId = this.isPrecise ? bindingAfter.boundShapeId : null
					this.resetExactTimeout()
				}
			} else {
				if (this.app.hintingIds.length > 0) {
					this.app.setHintingIds([])
					this.pointingId = null
					this.isPrecise = false
					this.isPreciseId = null
					this.resetExactTimeout()
				}
			}
		}

		if (changes) {
			this.app.updateShapes([next], true)
		}
	}
}
