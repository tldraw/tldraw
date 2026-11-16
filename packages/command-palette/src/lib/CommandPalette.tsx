import { useEffect } from 'react'
import { defineMessages, TLUiOverrides, useEditor, useUiEvents, useValue } from 'tldraw'
import { commandPaletteMount, commandPaletteOpen } from './commandPaletteOpen'
import {
	DefaultCommandPalette,
	TLUiCommandPaletteProps,
	useCloseCommandPalette,
} from './DefaultCommandPalette'

const messages = defineMessages({
	openCommandPalette: { id: 'action.open-command-palette', defaultMessage: 'Command palette' },
})

/**
 * The command palette, for the `CommandPalette` component slot. Renders a
 * {@link DefaultCommandPalette} while the palette is open; pair it with
 * {@link commandPaletteOverrides} for the Cmd/Ctrl+K shortcut. Wrap it to pass props:
 *
 * ```tsx
 * function MyCommandPalette() {
 * 	return <CommandPalette position="top" actionGroups={{ 'make-red': 'colors' }} />
 * }
 * ```
 *
 * @public @react
 */
export function CommandPalette(props: TLUiCommandPaletteProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const isOpen = useValue('command palette open', () => commandPaletteOpen.get(editor), [editor])
	const close = useCloseCommandPalette()

	useEffect(() => {
		commandPaletteMount.set(editor, { trackEvent })
		return () => {
			commandPaletteMount.set(editor, null)
		}
	}, [editor, trackEvent])

	// Closes it on unmount, so hiding the UI doesn't reopen the palette when it's shown again.
	useEffect(() => close, [close])

	if (!isOpen) return null
	return <DefaultCommandPalette {...props} onClose={close} />
}

/**
 * Adds the `open-command-palette` action, bound to Cmd/Ctrl+K, which opens and closes
 * {@link CommandPalette}. The action is only available while a `CommandPalette` is mounted.
 *
 * @public
 */
export const commandPaletteOverrides: TLUiOverrides = {
	actions(editor, actions) {
		actions['open-command-palette'] = {
			id: 'open-command-palette',
			label: messages.openCommandPalette.id,
			kbd: 'cmd+k,ctrl+k',
			readonlyOk: true,
			isAvailable: (editor) => commandPaletteMount.get(editor) !== null,
			onSelect(source) {
				// The palette stays open while the canvas has focus, so the shortcut also closes it.
				if (commandPaletteOpen.get(editor)) {
					commandPaletteOpen.set(editor, false)
					return
				}
				commandPaletteMount.get(editor)?.trackEvent('open-command-palette', { source })
				editor.complete()
				commandPaletteOpen.set(editor, true)
			},
		}
		return actions
	},
}
