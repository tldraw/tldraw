import { StateNode, TLEventHandlers, TLScribble } from '@tldraw/editor'
import { ScribbleManager } from '../../../shapes/shared/ScribbleManager'

export class Lasering extends StateNode {
	static override id = 'lasering'

	scribble = {} as ScribbleManager

	override onEnter = () => {
		this.startScribble()
		this.pushPointToScribble()
	}

	override onExit = () => {
		this.scribble.stop()
	}

	override onPointerMove = () => {
		this.pushPointToScribble()
	}

	override onPointerUp = () => {
		this.complete()
	}

	private startScribble = () => {
		if (this.scribble.tick) {
			this.editor.off('tick', this.scribble?.tick)
		}

		this.scribble = new ScribbleManager({
			onUpdate: this.onScribbleUpdate,
			onComplete: this.onScribbleComplete,
			color: 'laser',
			opacity: 0.7,
			size: 4,
			delay: 1200,
		})

		this.editor.on('tick', this.scribble.tick)
	}

	private pushPointToScribble = () => {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.scribble.addPoint(x, y)
	}

	private onScribbleUpdate = (scribble: TLScribble) => {
		this.editor.updateInstanceState({ scribble })
	}

	private onScribbleComplete = () => {
		this.editor.off('tick', this.scribble.tick)
		this.editor.updateInstanceState({ scribble: null })
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	private complete() {
		this.parent.transition('idle', {})
	}

	private cancel() {
		this.parent.transition('idle', {})
	}
}
