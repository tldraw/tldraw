import { TldrawUiMenuActionItem, TldrawUiMenuGroup, TldrawUiMenuSubmenu } from 'tldraw'
import { NEW_PROJECT_ACTION, OPEN_FILE_ACTION, SAVE_FILE_COPY_ACTION } from '../utils/useFileSystem'

export function LocalFileMenu() {
	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<TldrawUiMenuGroup id="file-actions">
				<TldrawUiMenuActionItem actionId={NEW_PROJECT_ACTION} />
				<TldrawUiMenuActionItem actionId={OPEN_FILE_ACTION} />
				<TldrawUiMenuActionItem actionId={SAVE_FILE_COPY_ACTION} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
