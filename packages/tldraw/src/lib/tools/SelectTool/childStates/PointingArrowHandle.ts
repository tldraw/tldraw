import { StateNode, TLArrowShape, TLEnterEventHandler, TLHandle } from '@tldraw/editor'
import { TranslatingArrowBendSession } from '../../../sessions/TranslatingArrowBendSession'
import { TranslatingArrowTerminalSession } from '../../../sessions/TranslatingArrowTerminalSession'

export class PointingArrowHandle extends StateNode {
	static override id = 'pointing_arrow_handle'

	session?: TranslatingArrowBendSession

	override onEnter: TLEnterEventHandler = (info: { handle: TLHandle; shape: TLArrowShape }) => {
		this.session =
			info.handle.id === 'bend'
				? new TranslatingArrowBendSession(this.editor, {
						shape: info.shape,
						handle: info.handle,
						onEnd: () => {
							this.parent.transition('idle')
						},
					}).start()
				: new TranslatingArrowTerminalSession(this.editor, {
						isCreating: false,
						shape: info.shape,
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
