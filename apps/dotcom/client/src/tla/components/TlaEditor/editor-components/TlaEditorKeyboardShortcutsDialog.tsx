import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	TLUiKeyboardShortcutsDialogProps,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
} from 'tldraw'
import { SAVE_FILE_COPY_ACTION } from '../../../../utils/useFileSystem'
import { useMsg } from '../../../utils/i18n'
import { editorMessages as messages } from '../editor-messages'

export function TlaEditorKeyboardShortcutsDialog(props: TLUiKeyboardShortcutsDialogProps) {
	const actions = useActions()
	return (
		<DefaultKeyboardShortcutsDialog {...props}>
			<TldrawUiMenuGroup label={useMsg(messages.file)} id="file">
				<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
			</TldrawUiMenuGroup>
			<DefaultKeyboardShortcutsDialogContent />
		</DefaultKeyboardShortcutsDialog>
	)
}
