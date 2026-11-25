import { FocusManager } from '../../editor/managers/FocusManager/FocusManager'
import { defineCapability, definePlugin } from '../plugin'

/**
 * Moves DOM focus to and from the editor's container. `editor.focus()` and `editor.blur()` use it
 * when it is present. The editor's focused state itself is instance data and needs no plugin.
 *
 * @public
 */
export interface TLContainerFocus {
	focus(): void
	blur(): void
}

/** @public */
export const containerFocusCapability = defineCapability<TLContainerFocus>('containerFocus')

/**
 * Keeps the container's DOM focus and focus classes in sync with the editor's focused state.
 *
 * @public
 */
export const domFocusPlugin = definePlugin({
	id: 'domFocus',
	provides: [containerFocusCapability],
	setup(ctx) {
		const focusManager = new FocusManager(ctx.editor)
		ctx.provide(containerFocusCapability, focusManager)
		ctx.onDispose(() => focusManager.dispose())
	},
})
