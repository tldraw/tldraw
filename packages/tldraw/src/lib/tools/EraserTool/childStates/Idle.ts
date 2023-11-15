import { StateNode, TLEventHandlers } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}
