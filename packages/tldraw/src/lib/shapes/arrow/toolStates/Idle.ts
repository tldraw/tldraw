import { StateNode, TLEventHandlers } from '../../../editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	override onEnter = () => {
		this.editor.updateInstanceState({ cursor: { type: 'cross', rotation: 0 } }, true)
	}

	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}
