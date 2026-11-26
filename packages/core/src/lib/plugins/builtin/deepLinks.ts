// This module is part of the headless core. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { DeepLinkController } from './DeepLinkController'

/** @public */
export const deepLinksCapability = defineCapability<DeepLinkController>('deepLinks')

/**
 * Creates and follows deep links. The editor's `createDeepLink`, `navigateToDeepLink` and
 * `registerDeepLinkListener` use it.
 *
 * @public
 */
export const deepLinksPlugin = definePlugin({
	id: 'deepLinks',
	provides: [deepLinksCapability],
	setup(ctx) {
		ctx.provide(deepLinksCapability, new DeepLinkController(ctx.editor))
	},
})
