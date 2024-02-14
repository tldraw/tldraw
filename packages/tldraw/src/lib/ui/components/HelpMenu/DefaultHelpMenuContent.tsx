import { useDialogs } from '../../hooks/useDialogsProvider'
import { useTldrawUiComponents } from '../../hooks/useTldrawUiComponents'
import { LanguageMenu } from '../LanguageMenu'
import { TldrawUiMenuItem } from '../menus/TldrawUiMenuItem'

/** @public */
export function DefaultHelpMenuContent() {
	return (
		<>
			<LanguageMenu />
			<KeyboardShortcutsMenuItem />
		</>
	)
}

function KeyboardShortcutsMenuItem() {
	const { KeyboardShortcutsDialog } = useTldrawUiComponents()
	const { addDialog } = useDialogs()

	if (!KeyboardShortcutsDialog) return null

	return (
		<TldrawUiMenuItem
			id="keyboard-shortcuts"
			label="help-menu.keyboard-shortcuts"
			readonlyOk
			onSelect={() => {
				addDialog({ component: KeyboardShortcutsDialog })
			}}
		/>
	)
}
