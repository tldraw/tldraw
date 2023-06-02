import { TLShapeId } from '@tldraw/tlschema'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	shapeId = '' as TLShapeId

	onEnter = (info: { shapeId: TLShapeId }) => {
		this.shapeId = info.shapeId
		this.editor.setCursor({ type: 'cross' })
	}

	onPointerDown: TLEventHandlers['onPointerDown'] = () => {
		this.parent.transition('pointing', { shapeId: this.shapeId })
	}

	onCancel = () => {
		this.editor.setSelectedTool('select')
	}
}
