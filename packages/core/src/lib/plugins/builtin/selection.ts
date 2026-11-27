// This module is part of the headless core. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { SelectionController } from './SelectionController'

/** @public */
export const selectionCapability = defineCapability<SelectionController>('selection')

/**
 * Changes and measures the selection: select, deselect, select all, adjacent shapes, reading
 * order, selection bounds and rotation, and the focused group. The editor's methods of the same
 * names use it.
 *
 * @public
 */
export const selectionPlugin = definePlugin({
	id: 'selection',
	provides: [selectionCapability],
	setup(ctx) {
		ctx.provide(selectionCapability, new SelectionController(ctx.editor))
	},
})
