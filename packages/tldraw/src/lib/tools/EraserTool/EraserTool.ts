import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Erasing } from './childStates/Erasing'
import { Idle } from './childStates/Idle'
import { Pointing } from './childStates/Pointing'

/** @public */
export class EraserTool extends StateNode {
	static override id = 'eraser'
	static override initial = 'idle'
	static override isLockable = false
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing, Erasing]
	}

	info = {} as { onInteractionEnd?: string }

	override onEnter(info: { onInteractionEnd?: string } = {}) {
		this.info = info
		if (info.onInteractionEnd) {
			this.setCurrentToolIdMask(info.onInteractionEnd)
		}
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.setCurrentToolIdMask(undefined)
		this.info = {}
	}

	maybeReturnToOriginatingTool() {
		const { onInteractionEnd } = this.info
		if (!onInteractionEnd) return
		this.editor.setCurrentTool(onInteractionEnd)
	}
}
