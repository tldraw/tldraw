import { useDialogs } from '../../../hooks/useDialogsProvider'
import { KeyboardShortcutsDialog } from '../../KeyboardShortcutsDialog'
import { LanguageMenu } from '../../LanguageMenu'
import { TldrawUiMenuGroup } from '../MenuItems/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../MenuItems/TldrawUiMenuItem'

/** @public */
export function DefaultHelpMenu() {
	return (
		<>
			<TldrawUiMenuGroup id="top">
				<LanguageMenu />
				<KeyboardShortcutsMenuItem />
			</TldrawUiMenuGroup>
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
