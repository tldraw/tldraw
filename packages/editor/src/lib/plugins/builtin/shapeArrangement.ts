// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { ShapeArranger } from './ShapeArranger'

/** @public */
export const shapeArrangementCapability = defineCapability<ShapeArranger>('shapeArrangement')

/**
 * Flips, stacks, packs, aligns, distributes, stretches and resizes groups of shapes. The editor's
 * methods of the same names use it.
 *
 * @public
 */
export const shapeArrangementPlugin = definePlugin({
	id: 'shapeArrangement',
	provides: [shapeArrangementCapability],
	setup(ctx) {
		ctx.provide(shapeArrangementCapability, new ShapeArranger(ctx.editor))
	},
})
