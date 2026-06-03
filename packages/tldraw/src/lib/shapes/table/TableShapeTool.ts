import { StateNode, createShapeId } from '@tldraw/editor'
import { TABLE_CONSTANTS } from './core'

/**
 * The tool for creating table shapes. Click on the canvas to drop a default table
 * centered on the pointer.
 *
 * @public
 */
export class TableShapeTool extends StateNode {
	static override id = 'table'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const { editor } = this
		const point = editor.inputs.getCurrentPagePoint()
		const id = createShapeId()

		editor.markHistoryStoppingPoint('creating table')
		editor.createShape({
			id,
			type: 'table',
			x: point.x - (3 * TABLE_CONSTANTS.DEFAULT_COL_WIDTH) / 2,
			y: point.y - (3 * TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT) / 2,
		})
		editor.setSelectedShapes([id])
		editor.setCurrentTool('select')
	}
}
