// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { StyleController } from './StyleController'

/** @public */
export const stylesCapability = defineCapability<StyleController>('styles')

/**
 * Reads and sets styles and opacity for the selection and for the next shapes. The editor's
 * methods of the same names use it.
 *
 * @public
 */
export const stylesPlugin = definePlugin({
	id: 'styles',
	provides: [stylesCapability],
	setup(ctx) {
		ctx.provide(stylesCapability, new StyleController(ctx.editor))
	},
})
