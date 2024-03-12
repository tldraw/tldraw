import { SelectionHandle, StateNode } from '@tldraw/editor'
import { ResizingSession } from '../../../sessions/ResizingSession'

export class Resizing extends StateNode {
	static override id = 'resizing'

	session?: ResizingSession

	override onEnter = (info: { handle: SelectionHandle }) => {
		this.session = new ResizingSession(this.editor, {
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
