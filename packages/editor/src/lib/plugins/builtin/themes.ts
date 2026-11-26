// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { ThemeManager, resolveThemes } from '../../editor/managers/ThemeManager/ThemeManager'
import { defineCapability, definePlugin } from '../plugin'
import { userPreferencesCapability } from './userPreferences'

/** @public */
export const themesCapability = defineCapability<ThemeManager>('themes')

/**
 * Holds the color themes from the `themes` and `initialTheme` editor options, and resolves the
 * current theme from the user's color mode. `editor.getCurrentTheme` and the other theme methods
 * use it.
 *
 * @public
 */
export const themesPlugin = definePlugin({
	id: 'themes',
	provides: [themesCapability],
	requires: [userPreferencesCapability],
	setup(ctx) {
		const { themes, initialTheme } = ctx.editorOptions
		const manager = new ThemeManager(ctx.editor, {
			themes: resolveThemes(themes),
			initial: initialTheme ?? 'default',
		})
		ctx.provide(themesCapability, manager)
		ctx.onDispose(() => manager.dispose())
	},
})
