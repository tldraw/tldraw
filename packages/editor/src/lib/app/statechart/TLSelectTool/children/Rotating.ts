import { angleDelta, degreesToRadians, EPSILON, RotateCorner, snapAngle } from '@tldraw/primitives'
import {
	applyRotationToSnapshotShapes,
	getRotationSnapshot,
	RotationSnapshot,
} from '../../../../utils/rotation'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { CursorTypeMap } from './PointingResizeHandle'

export class Rotating extends StateNode {
	static override id = 'rotating'

	snapshot = {} as RotationSnapshot

	info = {} as Extract<TLPointerEventInfo, { target: 'selection' }> & { onInteractionEnd?: string }

	markId = ''

	override onEnter = (
		info: Extract<TLPointerEventInfo, { target: 'selection'; onInteractionEnd?: string }>
	) => {
		// Store the event information
		this.info = info

		this.markId = this.app.mark('rotate start')

		this.snapshot = getRotationSnapshot({ app: this.app })

		// Trigger a pointer move
		this.handleStart()
	}

	override onExit = () => {
		this.app.setCursor({ type: 'none' })

		this.snapshot = {} as RotationSnapshot
	}

	override onPointerMove = () => {
		this.update()
	}

	override onKeyDown = () => {
		this.update()
	}

	override onKeyUp = () => {
		this.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel = () => {
		this.cancel()
	}

	// ---

	private update = () => {
		const newSelectionRotation = this._getRotationFromPointerPosition({
			snapToNearestDegree: false,
		})

		applyRotationToSnapshotShapes({
			app: this.app,
			delta: newSelectionRotation,
			snapshot: this.snapshot,
			stage: 'update',
		})

		// Update cursor
		this.app.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: newSelectionRotation + this.snapshot.initialSelectionRotation,
		})
	}

	private cancel = () => {
		this.app.bailToMark(this.markId)
		if (this.info.onInteractionEnd) {
			this.app.setSelectedTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('idle', this.info)
		}
	}

	private complete = () => {
		applyRotationToSnapshotShapes({
			app: this.app,
			delta: this._getRotationFromPointerPosition({ snapToNearestDegree: true }),
			snapshot: this.snapshot,
			stage: 'end',
		})
		if (this.info.onInteractionEnd) {
			this.app.setSelectedTool(this.info.onInteractionEnd, this.info)
		} else {
			this.parent.transition('idle', this.info)
		}
	}

	protected handleStart() {
		const newSelectionRotation = this._getRotationFromPointerPosition({
			snapToNearestDegree: false,
		})

		applyRotationToSnapshotShapes({
			app: this.app,
			delta: this._getRotationFromPointerPosition({ snapToNearestDegree: false }),
			snapshot: this.snapshot,
			stage: 'start',
		})

		// Update cursor
		this.app.setCursor({
			type: CursorTypeMap[this.info.handle as RotateCorner],
			rotation: newSelectionRotation + this.snapshot.initialSelectionRotation,
		})
	}

	_getRotationFromPointerPosition({ snapToNearestDegree }: { snapToNearestDegree: boolean }) {
		const {
			selectionPageCenter,
			inputs: { shiftKey, currentPagePoint },
		} = this.app
		const { initialCursorAngle, initialSelectionRotation } = this.snapshot

		// The delta is the difference between the current angle and the initial angle
		const preSnapRotationDelta = selectionPageCenter!.angle(currentPagePoint) - initialCursorAngle
		let newSelectionRotation = initialSelectionRotation + preSnapRotationDelta

		if (shiftKey) {
			newSelectionRotation = snapAngle(newSelectionRotation, 24)
		} else if (snapToNearestDegree) {
			newSelectionRotation = Math.round(newSelectionRotation / EPSILON) * EPSILON

			if (this.app.isCoarsePointer) {
				const snappedToRightAngle = snapAngle(newSelectionRotation, 4)
				const angleToRightAngle = angleDelta(newSelectionRotation, snappedToRightAngle)
				if (Math.abs(angleToRightAngle) < degreesToRadians(5)) {
					newSelectionRotation = snappedToRightAngle
				}
			}
		}

		return newSelectionRotation - initialSelectionRotation
	}
}
