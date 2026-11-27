import { FontManager } from '../../editor/managers/FontManager/FontManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const fontsCapability = defineCapability<FontManager>('fonts')

/**
 * Loads the fonts that shapes need with the browser's `FontFace` API. `editor.fonts` uses it.
 * Without it, the editor renders and exports without waiting for fonts.
 *
 * @public
 */
export const domFontsPlugin = definePlugin({
	id: 'domFonts',
	provides: [fontsCapability],
	setup(ctx) {
		const manager = new FontManager(ctx.editor, ctx.editorOptions.fontAssetUrls)
		ctx.provide(fontsCapability, manager)
		ctx.onDispose(() => manager.dispose())
	},
})
