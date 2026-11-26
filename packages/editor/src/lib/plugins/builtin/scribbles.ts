// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { ScribbleManager } from '../../editor/managers/ScribbleManager/ScribbleManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const scribblesCapability = defineCapability<ScribbleManager>('scribbles')

/**
 * Holds the scribbles that the eraser, laser and lasso tools draw, and fades them on each tick. `editor.scribbles` uses it.
 *
 * @public
 */
export const scribblesPlugin = definePlugin({
	id: 'scribbles',
	provides: [scribblesCapability],
	setup(ctx) {
		const manager = new ScribbleManager(ctx.editor)
		ctx.provide(scribblesCapability, manager)
	},
})
