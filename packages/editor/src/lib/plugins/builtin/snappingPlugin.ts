// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { SnapManager } from '../../editor/managers/SnapManager/SnapManager'
import { definePlugin } from '../plugin'
import { snappingCapability } from './snapping'

/**
 * Snaps shapes and handles while they move, and holds the snap indicators. Tools reach it with
 * `editor.snaps`.
 *
 * @public
 */
export const snappingPlugin = definePlugin({
	id: 'snapping',
	provides: [snappingCapability],
	setup(ctx) {
		ctx.provide(snappingCapability, new SnapManager(ctx.editor))
	},
})
