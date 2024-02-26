import { useTldrawUiComponents } from '../../context/components'
import { useDialogs } from '../../context/dialogs'
import { LanguageMenu } from '../LanguageMenu'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public */
export function DefaultHelpMenuContent() {
	return (
		<div data-testid="help-menu.content">
			<LanguageMenu />
			<KeyboardShortcutsMenuItem />
		</div>
	)
}

function KeyboardShortcutsMenuItem() {
	const { KeyboardShortcutsDialog } = useTldrawUiComponents()
	const { addDialog } = useDialogs()

	if (!KeyboardShortcutsDialog) return null

	return (
		<TldrawUiMenuItem
			id="keyboard-shortcuts-button"
			label="help-menu.keyboard-shortcuts"
			readonlyOk
			onSelect={() => {
				addDialog({ component: KeyboardShortcutsDialog })
			}}
		/>
	)
}
