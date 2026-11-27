// This module is part of the headless core. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { EditingController } from './EditingController'

/** @public */
export const editingCapability = defineCapability<EditingController>('editing')

/**
 * Starts and stops editing and cropping a shape, and holds the rich text editor of the shape that
 * is being edited. The editor's methods of the same names use it.
 *
 * @public
 */
export const editingPlugin = definePlugin({
	id: 'editing',
	provides: [editingCapability],
	setup(ctx) {
		ctx.provide(editingCapability, new EditingController(ctx.editor))
	},
})
