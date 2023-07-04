import { StateNode, TLEventHandlers } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('drawing', info)
	}

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}

	override onCancel = () => {
		this.editor.setSelectedTool('select')
	}
}
