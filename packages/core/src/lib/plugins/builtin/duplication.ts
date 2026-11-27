// This module is part of the headless core. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { ShapeDuplicator } from './ShapeDuplicator'

/** @public */
export const duplicationCapability = defineCapability<ShapeDuplicator>('duplication')

/**
 * Duplicates shapes and pages. The editor's `duplicateShapes` and `duplicatePage` use it.
 *
 * @public
 */
export const duplicationPlugin = definePlugin({
	id: 'duplication',
	provides: [duplicationCapability],
	setup(ctx) {
		ctx.provide(duplicationCapability, new ShapeDuplicator(ctx.editor))
	},
})
