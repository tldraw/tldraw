// This module is part of the headless core. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { PageController } from './PageController'

/** @public */
export const pagesCapability = defineCapability<PageController>('pages')

/**
 * Creates, updates, renames and deletes pages. The editor's page methods of the same names use it.
 *
 * @public
 */
export const pagesPlugin = definePlugin({
	id: 'pages',
	provides: [pagesCapability],
	setup(ctx) {
		ctx.provide(pagesCapability, new PageController(ctx.editor))
	},
})
