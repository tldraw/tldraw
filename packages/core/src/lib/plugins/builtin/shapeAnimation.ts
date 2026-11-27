// This module is part of the headless core. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { ShapeAnimator } from './ShapeAnimator'

/** @public */
export const shapeAnimationCapability = defineCapability<ShapeAnimator>('shapeAnimation')

/**
 * Animates shape updates on each tick. `editor.animateShape` and `animateShapes` use it.
 *
 * @public
 */
export const shapeAnimationPlugin = definePlugin({
	id: 'shapeAnimation',
	provides: [shapeAnimationCapability],
	setup(ctx) {
		ctx.provide(shapeAnimationCapability, new ShapeAnimator(ctx.editor))
	},
})
