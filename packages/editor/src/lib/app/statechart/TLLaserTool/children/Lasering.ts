import { TLScribble } from '@tldraw/tlschema'
import { ScribbleManager } from '../../../managers/ScribbleManager'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Lasering extends StateNode {
	static override id = 'lasering'

	scribble = {} as ScribbleManager

	override onEnter = () => {
		this.startScribble()
		this.pushPointToScribble()
	}

	override onExit = () => {
		this.app.setErasingIds([])
		this.scribble.stop()
	}

	override onPointerMove = () => {
		this.pushPointToScribble()
	}

	override onPointerUp = () => {
		this.complete()
	}

	override onKeyDown = () => {
		this.pushPointToScribble()
	}

	override onKeyUp = () => {
		if (!this.app.inputs.altKey) {
			this.parent.transition('brushing', {})
		} else {
			this.pushPointToScribble()
		}
	}

	private startScribble = () => {
		if (this.scribble.tick) {
			this.app.off('tick', this.scribble?.tick)
		}

		this.scribble = new ScribbleManager({
			onUpdate: this.onScribbleUpdate,
			onComplete: this.onScribbleComplete,
			color: 'laser',
			opacity: 0.7,
			size: 4,
			delay: 1200,
		})

		this.app.on('tick', this.scribble.tick)
	}

	private pushPointToScribble = () => {
		const { x, y } = this.app.inputs.currentPagePoint
		this.scribble.addPoint(x, y)
	}

	private onScribbleUpdate = (scribble: TLScribble) => {
		this.app.setScribble(scribble)
	}

	private onScribbleComplete = () => {
		this.app.off('tick', this.scribble.tick)
		this.app.setScribble(null)
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
