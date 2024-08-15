import { useCallback } from 'react'
import { useTldrawUiComponents } from '../../context/components'
import { useDialogs } from '../../context/dialogs'
import { LanguageMenu } from '../LanguageMenu'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

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
			label="help-menu.keyboard-shortcuts"
			readonlyOk
			onSelect={handleSelect}
		/>
	)
}
