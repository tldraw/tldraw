import { StateNode, react } from '@tldraw/editor'
import { Brushing } from './childStates/Brushing'
import { Crop } from './childStates/Crop/Crop'
import { Cropping } from './childStates/Cropping'
import { DraggingHandle } from './childStates/DraggingHandle'
import { EditingShape } from './childStates/EditingShape'
import { Idle } from './childStates/Idle'
import { PointingArrowLabel } from './childStates/PointingArrowLabel'
import { PointingCanvas } from './childStates/PointingCanvas'
import { PointingCropHandle } from './childStates/PointingCropHandle'
import { PointingHandle } from './childStates/PointingHandle'
import { PointingResizeHandle } from './childStates/PointingResizeHandle'
import { PointingRotateHandle } from './childStates/PointingRotateHandle'
import { PointingSelection } from './childStates/PointingSelection'
import { PointingShape } from './childStates/PointingShape'
import { Resizing } from './childStates/Resizing'
import { Rotating } from './childStates/Rotating'
import { ScribbleBrushing } from './childStates/ScribbleBrushing'
import { Translating } from './childStates/Translating'

/** @public */
export class SelectTool extends StateNode {
	static override id = 'select'
	static override initial = 'idle'
	reactor: undefined | (() => void) = undefined

	static override children = () => [
		Crop,
		Cropping,
		Idle,
		PointingCanvas,
		PointingShape,
		Translating,
		Brushing,
		ScribbleBrushing,
		PointingCropHandle,
		PointingSelection,
		PointingResizeHandle,
		EditingShape,
		Resizing,
		Rotating,
		PointingRotateHandle,
		PointingArrowLabel,
		PointingHandle,
		DraggingHandle,
	]

	// We want to clean up the duplicate props when the selection changes
	private cleanUpDuplicateProps = () => {
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		const instance = this.editor.getInstanceState()
		if (!instance.duplicateProps) return
		const duplicatedShapes = new Set(instance.duplicateProps.shapeIds)
		if (
			selectedShapeIds.length === duplicatedShapes.size &&
			selectedShapeIds.every((shapeId) => duplicatedShapes.has(shapeId))
		) {
			return
		}
		this.editor.updateInstanceState({
			duplicateProps: null,
		})
	}

	override onEnter = () => {
		this.reactor = react('clean duplicate props', () => {
			try {
				this.cleanUpDuplicateProps()
			} catch (e) {
				if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
					// ignore errors at test time
				} else {
					console.error(e)
				}
			}
		})
	}

	override onExit = () => {
		this.reactor?.()
		if (this.editor.getCurrentPageState().editingShapeId) {
			this.editor.setEditingShape(null)
		}
	}
}
