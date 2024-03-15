import { SelectionHandle, StateNode } from '@tldraw/editor'
import { ResizingInteraction } from '../../../interactions/ResizingInteraction'

export class Resizing extends StateNode {
	static override id = 'resizing'

	session?: ResizingInteraction

	override onEnter = (info: { handle: SelectionHandle }) => {
		this.session = new ResizingInteraction(this.editor, {
			handle: info.handle,
			onEnd: () => {
				this.parent.transition('idle')
			},
		}).start()
	}

	override onExit = () => {
		this.session?.dispose()
		delete this.session
	}
}
