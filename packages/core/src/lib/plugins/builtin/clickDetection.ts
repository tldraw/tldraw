// This module is part of the headless core. It must not import React or touch the DOM.
import { ClickManager } from '../../editor/managers/ClickManager/ClickManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const clickDetectionCapability = defineCapability<ClickManager>('clickDetection')

/**
 * Turns pointer events into double, triple and quadruple clicks.
 *
 * @public
 */
export const clickDetectionPlugin = definePlugin({
	id: 'clickDetection',
	provides: [clickDetectionCapability],
	setup(ctx) {
		const manager = new ClickManager(ctx.editor)
		ctx.provide(clickDetectionCapability, manager)
	},
})
