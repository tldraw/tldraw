import { StateNode } from '@tldraw/editor'
import { Brushing } from './children/Brushing'
import { Crop } from './children/Crop/Crop'
import { Cropping } from './children/Cropping'
import { DraggingHandle } from './children/DraggingHandle'
import { EditingShape } from './children/EditingShape'
import { Idle } from './children/Idle'
import { PointingCanvas } from './children/PointingCanvas'
import { PointingCropHandle } from './children/PointingCropHandle'
import { PointingHandle } from './children/PointingHandle'
import { PointingResizeHandle } from './children/PointingResizeHandle'
import { PointingRotateHandle } from './children/PointingRotateHandle'
import { PointingSelection } from './children/PointingSelection'
import { PointingShape } from './children/PointingShape'
import { Resizing } from './children/Resizing'
import { Rotating } from './children/Rotating'
import { ScribbleBrushing } from './children/ScribbleBrushing'
import { Translating } from './children/Translating'

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
		if (this.editor.currentPageState.editingShapeId) {
			this.editor.setEditingShape(null)
		}
	}
}
