import { TldrawUiMenuActionItem, TldrawUiMenuGroup, TldrawUiMenuSubmenu } from 'tldraw'
import {
	FORK_PROJECT_ACTION,
	LEAVE_SHARED_PROJECT_ACTION,
	SHARE_PROJECT_ACTION,
} from '../utils/sharing'
import {
	NEW_PROJECT_ACTION,
	NEW_SHARED_PROJECT_ACTION,
	OPEN_FILE_ACTION,
	SAVE_FILE_COPY_ACTION,
} from '../utils/useFileSystem'

export function LocalFileMenu() {
	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<TldrawUiMenuGroup id="file-actions">
				<TldrawUiMenuActionItem action={NEW_PROJECT_ACTION} />
				<TldrawUiMenuActionItem action={NEW_SHARED_PROJECT_ACTION} />
				<TldrawUiMenuActionItem action={OPEN_FILE_ACTION} />
				<TldrawUiMenuActionItem action={SAVE_FILE_COPY_ACTION} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="share">
				<TldrawUiMenuActionItem action={SHARE_PROJECT_ACTION} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

export function MultiplayerFileMenu() {
	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<TldrawUiMenuGroup id="file-actions">
				<TldrawUiMenuActionItem action={SAVE_FILE_COPY_ACTION} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="share">
				<TldrawUiMenuActionItem action={NEW_SHARED_PROJECT_ACTION} />
				<TldrawUiMenuActionItem action={FORK_PROJECT_ACTION} />
				<TldrawUiMenuActionItem action={LEAVE_SHARED_PROJECT_ACTION} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
