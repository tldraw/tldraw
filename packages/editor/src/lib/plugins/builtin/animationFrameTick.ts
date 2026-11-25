import { TickManager } from '../../editor/managers/TickManager/TickManager'
import { definePlugin } from '../plugin'

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
		const tickManager = new TickManager(ctx.editor)
		ctx.onDispose(() => tickManager.dispose())
		ctx.editor.timers.requestAnimationFrame(() => tickManager.start())
	},
})
