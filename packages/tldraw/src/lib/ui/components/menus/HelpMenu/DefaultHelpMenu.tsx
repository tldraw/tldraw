import { useDialogs } from '../../../hooks/useDialogsProvider'
import { KeyboardShortcutsDialog } from '../../KeyboardShortcutsDialog'
import { LanguageMenu } from '../../LanguageMenu'
import { TldrawUiMenuItem } from '../TldrawUiMenuItem'

/** @public */
export function DefaultHelpMenu() {
	return (
		<>
			<LanguageMenu />
			<KeyboardShortcutsMenuItem />
		</>
	)
}

function KeyboardShortcutsMenuItem() {
	const { addDialog } = useDialogs()

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
