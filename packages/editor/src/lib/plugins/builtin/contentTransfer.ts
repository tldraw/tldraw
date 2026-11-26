// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { ContentController } from './ContentController'

/** @public */
export const contentTransferCapability = defineCapability<ContentController>('contentTransfer')

/**
 * Copies shapes out as portable content and puts content onto the current page. Copy, paste,
 * duplicate page and move to page use it.
 *
 * @public
 */
export const contentTransferPlugin = definePlugin({
	id: 'contentTransfer',
	provides: [contentTransferCapability],
	setup(ctx) {
		ctx.provide(contentTransferCapability, new ContentController(ctx.editor))
	},
})
