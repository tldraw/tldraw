import classNames from 'classnames'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	defineMessages,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDialogs,
	useTranslation,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { WorkspaceSettingsDialog } from '../../components/dialogs/WorkspaceSettingsDialog'
import { TLA_MENU_POSITION } from '../../components/tla-menu/tla-menu-position'
import { TlaIcon } from '../../components/TlaIcon/TlaIcon'
import { useCreateWorkspaceDialog } from '../../components/TlaSidebar/components/useWorkspaceActions'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useApp } from '../../hooks/useAppState'
import { useWorkspaceName } from '../../hooks/useWorkspaceName'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import styles from './workspace-layout.module.css'

const messages = defineMessages({
	newWorkspace: { defaultMessage: 'New workspace' },
	manageWorkspace: { defaultMessage: 'Manage workspace' },
})

/** Switches between the user's workspace galleries, and manages or creates workspaces. */
export function TlaWorkspaceSwitcher() {
	const app = useApp()
	const msg = useTranslation()
	const navigate = useNavigate()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const workspaceId = useActiveWorkspaceId()
	const name = useWorkspaceName(workspaceId)
	const handleCreateWorkspace = useCreateWorkspaceDialog('workspace-home', 'workspace')
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const otherWorkspaceIds = useValue(
		'workspace ids',
		() =>
			app
				.getWorkspaceMemberships()
				.filter((g) => g.groupId !== homeWorkspaceId && !!g.group)
				.map((g) => g.groupId),
		[app, homeWorkspaceId]
	)

	const handleManage = useCallback(() => {
		addDialog({
			component: ({ onClose }) => (
				<WorkspaceSettingsDialog workspaceId={workspaceId} onClose={onClose} />
			),
		})
		trackEvent('open-workspace-settings', { source: 'workspace-home' })
	}, [addDialog, workspaceId, trackEvent])

	return (
		<TldrawUiDropdownMenuRoot id="workspace-home-switcher">
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<button
						className={classNames(styles.switcher, 'notranslate')}
						data-testid="tla-workspace-switcher"
					>
						<span className={styles.switcherLabel} data-testid="tla-workspace-title">
							{name}
						</span>
						<TlaIcon icon="chevron-up-down" />
					</button>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" {...TLA_MENU_POSITION}>
					<TldrawUiMenuGroup id="workspaces">
						{[homeWorkspaceId, ...otherWorkspaceIds].map((id) => (
							<TlaWorkspaceSwitcherItem
								key={id}
								workspaceId={id}
								checked={id === workspaceId}
								onSelect={() => navigate(routes.tlaWorkspace(id))}
							/>
						))}
					</TldrawUiMenuGroup>
					<TldrawUiMenuGroup id="workspace-actions">
						<TldrawUiMenuItem
							id="manage-workspace"
							label={msg(messages.manageWorkspace)}
							readonlyOk
							onSelect={handleManage}
						/>
						<TldrawUiMenuItem
							id="new-workspace"
							label={msg(messages.newWorkspace)}
							readonlyOk
							onSelect={handleCreateWorkspace}
						/>
					</TldrawUiMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

function TlaWorkspaceSwitcherItem({
	workspaceId,
	checked,
	onSelect,
}: {
	workspaceId: string
	checked: boolean
	onSelect(): void
}) {
	const name = useWorkspaceName(workspaceId)
	return (
		<TldrawUiMenuCheckboxItem
			id={`workspace-${workspaceId}`}
			label={name}
			checked={checked}
			readonlyOk
			onSelect={onSelect}
		/>
	)
}
