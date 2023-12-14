import { StateNode } from '@tldraw/editor'
import { Brushing } from './childStates/Brushing'
import { Crop } from './childStates/Crop/Crop'
import { Cropping } from './childStates/Cropping'
import { DraggingHandle } from './childStates/DraggingHandle'
import { EditingShape } from './childStates/EditingShape'
import { Idle } from './childStates/Idle'
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
		PointingHandle,
		DraggingHandle,
	]

	override onExit = () => {
		if (this.editor.getCurrentPageState().editingShapeId) {
			this.editor.setEditingShape(null)
		}
	}
}
