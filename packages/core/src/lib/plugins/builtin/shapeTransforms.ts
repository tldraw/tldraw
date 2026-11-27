// This module is part of the headless core. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { ShapeTransformer } from './ShapeTransformer'

/** @public */
export const shapeTransformsCapability = defineCapability<ShapeTransformer>('shapeTransforms')

/**
 * Resizes, rotates, nudges and translates shapes. The editor's `resizeShape`, `rotateShapesBy` and
 * `nudgeShapes` use it.
 *
 * @public
 */
export const shapeTransformsPlugin = definePlugin({
	id: 'shapeTransforms',
	provides: [shapeTransformsCapability],
	setup(ctx) {
		ctx.provide(shapeTransformsCapability, new ShapeTransformer(ctx.editor))
	},
})
