// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { EdgeScrollManager } from '../../editor/managers/EdgeScrollManager/EdgeScrollManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const edgeScrollCapability = defineCapability<EdgeScrollManager>('edgeScroll')

/**
 * Moves the camera when a drag gets near the edge of the viewport. `editor.edgeScrollManager` uses it.
 *
 * @public
 */
export const edgeScrollPlugin = definePlugin({
	id: 'edgeScroll',
	provides: [edgeScrollCapability],
	setup(ctx) {
		const manager = new EdgeScrollManager(ctx.editor)
		ctx.provide(edgeScrollCapability, manager)
	},
})
