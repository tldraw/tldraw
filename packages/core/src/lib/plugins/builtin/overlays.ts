// This module is part of the headless core. It must not import React or touch the DOM.
import { OverlayManager } from '../../editor/overlays/OverlayManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const overlaysCapability = defineCapability<OverlayManager>('overlays')

/**
 * Holds the overlay utils from the `overlayUtils` editor option: canvas UI such as selection and
 * shape handles. `editor.overlays` uses it.
 *
 * @public
 */
export const overlaysPlugin = definePlugin({
	id: 'overlays',
	provides: [overlaysCapability],
	setup(ctx) {
		const manager = new OverlayManager(ctx.editor)
		for (const Util of ctx.editorOptions.overlayUtils ?? []) {
			manager.registerUtil(new Util(ctx.editor))
		}
		ctx.provide(overlaysCapability, manager)
		ctx.onDispose(() => manager.dispose())
	},
})
