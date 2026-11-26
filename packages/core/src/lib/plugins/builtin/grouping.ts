// This module is part of the headless core. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { ShapeGrouper } from './ShapeGrouper'

/** @public */
export const groupingCapability = defineCapability<ShapeGrouper>('grouping')

/**
 * Groups and ungroups shapes. The editor's `groupShapes` and `ungroupShapes` use it.
 *
 * @public
 */
export const groupingPlugin = definePlugin({
	id: 'grouping',
	provides: [groupingCapability],
	setup(ctx) {
		ctx.provide(groupingCapability, new ShapeGrouper(ctx.editor))
	},
})
