import {
	DefaultMainMenuFileContent,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useActions,
} from '@tldraw/tldraw'
import {
	FORK_PROJECT_ACTION,
	LEAVE_SHARED_PROJECT_ACTION,
	SHARE_PROJECT_ACTION,
} from '../utils/sharing'

export function LocalFileMenu() {
	const actions = useActions()

	return (
		<TldrawUiMenuSubmenu id="file" label="menu.file">
			<DefaultMainMenuFileContent />
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
			<DefaultMainMenuFileContent />
			<TldrawUiMenuGroup id="share">
				<TldrawUiMenuItem {...actions[FORK_PROJECT_ACTION]} />
				<TldrawUiMenuItem {...actions[LEAVE_SHARED_PROJECT_ACTION]} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
