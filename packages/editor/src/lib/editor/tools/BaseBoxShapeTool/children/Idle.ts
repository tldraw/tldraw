import { TLCreateShapePartial } from '@tldraw/tlschema'
import { TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		const shapes = [{ type: this.parent.shapeType }] as TLCreateShapePartial[]
		if (this.editor.checkCapability('create-shapes', { shapes })) {
			return
		}
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
