import { StateNode, TLEventHandlers } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onEnter = () => {
		this.editor.setCursor({ type: 'grab' })
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	override onCancel = () => {
		this.editor.setSelectedTool('select')
	}
}
