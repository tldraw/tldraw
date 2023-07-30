import { StateNode, TLEventHandlers } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	override onEnter = () => {
		this.editor.updateInstanceState(
			{ cursor: { type: 'cross', rotation: 0 } },
			{ ephemeral: true, squashing: true }
		)
	}

	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}
