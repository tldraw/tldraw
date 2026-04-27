import { isAccelKey, StateNode, TLKeyboardEventInfo, TLStateNodeConstructor } from '@tldraw/editor'
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

	// Tracked from key events directly because inputs.getAccelKey() is debounced
	// by ~150ms in Editor.dispatch and lags real-time release.
	private _accelHeld = false

	override onEnter(info: { onInteractionEnd?: string } = {}) {
		this.info = info
		this._accelHeld = false
		if (info.onInteractionEnd) {
			this._accelHeld = true
			this.setCurrentToolIdMask(info.onInteractionEnd)
		}
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.setCurrentToolIdMask(undefined)
		this.info = {}
		this._accelHeld = false
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		if (!this.info.onInteractionEnd) return
		if (info.key === 'Meta' || info.key === 'Control') {
			this._accelHeld = true
		}
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		if (!this.info.onInteractionEnd) return
		if (info.key !== 'Meta' && info.key !== 'Control') return
		if (isAccelKey(info)) return
		this._accelHeld = false
		this.maybeReturnToOriginatingTool()
	}

	/**
	 * If the eraser was entered transiently (via accel-hold from another tool)
	 * and accel is no longer held, return to the originating tool. We only
	 * return when no pointer interaction is in progress so an in-flight erase
	 * isn't cancelled mid-drag.
	 */
	maybeReturnToOriginatingTool() {
		const { onInteractionEnd } = this.info
		if (!onInteractionEnd) return
		if (this._accelHeld) return
		if (this.getCurrent()?.id !== 'idle') return
		this.editor.setCurrentTool(onInteractionEnd)
	}
}
