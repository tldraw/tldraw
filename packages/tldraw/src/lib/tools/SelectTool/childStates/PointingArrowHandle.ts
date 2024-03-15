import { StateNode, TLArrowShape, TLEnterEventHandler, TLHandle } from '@tldraw/editor'
import { TranslatingArrowBendInteraction } from '../../../interactions/TranslatingArrowBendInteraction'
import { TranslatingArrowTerminalInteraction } from '../../../interactions/TranslatingArrowTerminalInteraction'

export class PointingArrowHandle extends StateNode {
	static override id = 'pointing_arrow_handle'

	session?: TranslatingArrowBendInteraction

	override onEnter: TLEnterEventHandler = (info: { handle: TLHandle; shape: TLArrowShape }) => {
		this.session =
			info.handle.id === 'bend'
				? new TranslatingArrowBendInteraction(this.editor, {
						shape: info.shape,
						handle: info.handle,
						onStart: () => {
							this.editor.setCursor({ type: 'grabbing', rotation: 0 })
						},
						onEnd: () => {
							this.parent.transition('idle')
						},
					}).start()
				: new TranslatingArrowTerminalInteraction(this.editor, {
						isCreating: false,
						shape: info.shape,
						handle: info.handle,
						onStart: () => {
							this.editor.setCursor({ type: 'grabbing', rotation: 0 })
						},
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
