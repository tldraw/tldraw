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
				<TldrawUiMenuActionItem actionId={NEW_PROJECT_ACTION} />
				<TldrawUiMenuActionItem actionId={NEW_SHARED_PROJECT_ACTION} />
				<TldrawUiMenuActionItem actionId={OPEN_FILE_ACTION} />
				<TldrawUiMenuActionItem actionId={SAVE_FILE_COPY_ACTION} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="share">
				<TldrawUiMenuActionItem actionId={SHARE_PROJECT_ACTION} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

export function MultiplayerFileMenu() {
	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<TldrawUiMenuGroup id="file-actions">
				<TldrawUiMenuActionItem actionId={SAVE_FILE_COPY_ACTION} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="share">
				<TldrawUiMenuActionItem actionId={NEW_SHARED_PROJECT_ACTION} />
				<TldrawUiMenuActionItem actionId={FORK_PROJECT_ACTION} />
				<TldrawUiMenuActionItem actionId={LEAVE_SHARED_PROJECT_ACTION} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
