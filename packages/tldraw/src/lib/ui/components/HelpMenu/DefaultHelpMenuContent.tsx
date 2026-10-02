import { defineMessages } from '@tldraw/editor'
import { useCallback } from 'react'
import { useTldrawUiComponents } from '../../context/components'
import { useDialogs } from '../../context/dialogs'
import { LanguageMenu } from '../LanguageMenu'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	helpMenuKeyboardShortcuts: {
		id: 'help-menu.keyboard-shortcuts',
		defaultMessage: 'Keyboard shortcuts',
	},
})

/** @public @react */
export function DefaultHelpMenuContent() {
	return (
		<>
			<LanguageMenu />
			<KeyboardShortcutsMenuItem />
		</>
	)
}

/** @public @react */
export function KeyboardShortcutsMenuItem() {
	const { KeyboardShortcutsDialog } = useTldrawUiComponents()
	const { addDialog } = useDialogs()

	const handleSelect = useCallback(() => {
		if (KeyboardShortcutsDialog) addDialog({ component: KeyboardShortcutsDialog })
	}, [addDialog, KeyboardShortcutsDialog])

	if (!KeyboardShortcutsDialog) return null

	return (
		<TldrawUiMenuItem
			id="keyboard-shortcuts-button"
			label={messages.helpMenuKeyboardShortcuts.id}
			readonlyOk
			onSelect={handleSelect}
		/>
	)
}
