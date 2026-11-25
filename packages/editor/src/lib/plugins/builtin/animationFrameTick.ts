import { throttleToNextFrame as _throttleToNextFrame, bind } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { EditorManager } from '../../editor/managers/EditorManager'
import { definePlugin } from '../plugin'

const throttleToNextFrame =
	typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
		? // At test time we should use actual raf and not throttle, because throttle was set up to evaluate immediately during tests, which causes stack overflow
			// for the tick manager since it sets up a raf loop.
			function mockThrottle(cb: any) {
				// eslint-disable-next-line no-restricted-globals
				const frame = requestAnimationFrame(cb)
				return () => cancelAnimationFrame(frame)
			}
		: _throttleToNextFrame

/**
 * Emits `frame` and `tick` once per animation frame.
 *
 * @internal
 */
export class AnimationFrameTicker extends EditorManager {
	constructor(editor: Editor) {
		super(editor)
		this.start()
	}

	cancelRaf?: null | (() => void)
	isPaused = true
	now = 0

	start() {
		this.isPaused = false
		this.cancelRaf?.()
		this.cancelRaf = throttleToNextFrame(this.tick)
		this.now = Date.now()
	}

	@bind
	tick() {
		if (this.isPaused) {
			return
		}

		const now = Date.now()
		const elapsed = now - this.now
		this.now = now

		// Schedule the next frame even if a listener throws. Otherwise a single throwing listener
		// ends the loop for good, which silently stops every frame-driven behavior — camera
		// animations, edge scrolling, pointer velocity, following — instead of failing once.
		try {
			this.editor.emit('frame', elapsed)
			this.editor.emit('tick', elapsed)
		} finally {
			this.cancelRaf = throttleToNextFrame(this.tick)
		}
	}

	dispose() {
		this.isPaused = true
		this.cancelRaf?.()
		super.dispose()
	}
}

/**
 * Emits the editor's `frame` and `tick` events once per animation frame. Camera animation, edge
 * scrolling, pointer velocity and following run on these events. A headless editor without this
 * plugin gets no ticks unless the caller emits them, for example `editor.emit('tick', 16)`.
 *
 * @public
 */
export const animationFrameTickPlugin = definePlugin({
	id: 'animationFrameTick',
	setup(ctx) {
		const ticker = new AnimationFrameTicker(ctx.editor)
		ctx.onDispose(() => ticker.dispose())
		ctx.editor.timers.requestAnimationFrame(() => ticker.start())
	},
})
