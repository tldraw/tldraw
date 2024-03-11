import { TldrawUiMenuGroup, TldrawUiMenuItem, TldrawUiMenuSubmenu, useActions } from 'tldraw'
import {
	FORK_PROJECT_ACTION,
	LEAVE_SHARED_PROJECT_ACTION,
	SHARE_PROJECT_ACTION,
} from '../utils/sharing'
import { NEW_PROJECT_ACTION, OPEN_FILE_ACTION, SAVE_FILE_COPY_ACTION } from '../utils/useFileSystem'

export function LocalFileMenu() {
	const actions = useActions()

	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<TldrawUiMenuGroup id="file-actions">
				<TldrawUiMenuItem {...actions[NEW_PROJECT_ACTION]} />
				<TldrawUiMenuItem {...actions[OPEN_FILE_ACTION]} />
				<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="share">
				<TldrawUiMenuItem {...actions[SHARE_PROJECT_ACTION]} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

export function MultiplayerFileMenu() {
	const actions = useActions()

	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<TldrawUiMenuGroup id="file-actions">
				<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="share">
				<TldrawUiMenuItem {...actions[FORK_PROJECT_ACTION]} />
				<TldrawUiMenuItem {...actions[LEAVE_SHARED_PROJECT_ACTION]} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
