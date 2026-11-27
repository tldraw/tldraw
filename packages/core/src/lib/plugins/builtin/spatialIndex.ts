// This module is part of the headless core. It must not import React or touch the DOM.
import { SpatialIndexManager } from '../../editor/managers/SpatialIndexManager/SpatialIndexManager'
import { defineCapability, definePlugin } from '../plugin'

/** @internal */
export const spatialIndexCapability = defineCapability<SpatialIndexManager>('spatialIndex')

/**
 * Keeps an R-tree of shape bounds on the current page. Hit testing (`getShapeAtPoint`, `getShapesAtPoint`) and brushing use it.
 *
 * @internal
 */
export const spatialIndexPlugin = definePlugin({
	id: 'spatialIndex',
	provides: [spatialIndexCapability],
	setup(ctx) {
		const manager = new SpatialIndexManager(ctx.editor)
		ctx.provide(spatialIndexCapability, manager)
		ctx.onDispose(() => manager.dispose())
	},
})
