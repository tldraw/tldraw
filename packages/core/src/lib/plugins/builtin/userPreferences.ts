// This module is part of the headless core. It must not import React or touch the DOM.
import { createTLCurrentUser } from '../../config/createTLCurrentUser'
import { UserPreferencesManager } from '../../editor/managers/UserPreferencesManager/UserPreferencesManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const userPreferencesCapability = defineCapability<UserPreferencesManager>('userPreferences')

/**
 * Holds the current user and their preferences, from the `user` and `colorScheme` editor options.
 * `editor.user` uses it. It follows the system color scheme and reduced motion setting when the
 * environment has `matchMedia`.
 *
 * @public
 */
export const userPreferencesPlugin = definePlugin({
	id: 'userPreferences',
	provides: [userPreferencesCapability],
	setup(ctx) {
		const { user, colorScheme } = ctx.editorOptions
		const manager = new UserPreferencesManager(
			user ?? createTLCurrentUser(),
			colorScheme ?? 'light'
		)
		ctx.provide(userPreferencesCapability, manager)
		ctx.onDispose(() => manager.dispose())
	},
})
