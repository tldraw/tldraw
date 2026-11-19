import classNames from 'classnames'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	useDialogs,
	useMenuIsOpen,
	useTranslation,
	useValue,
} from 'tldraw'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useApp } from '../../hooks/useAppState'
import { useWorkspaceName } from '../../hooks/useWorkspaceName'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { WorkspaceSettingsDialog } from '../dialogs/WorkspaceSettingsDialog'
import {
	useCreateWorkspaceDialog,
	useSwitchToWorkspace,
} from '../TlaSidebar/components/useWorkspaceActions'
import {
	SWITCHER_TRIGGER_CLASS_NAME,
	TlaSwitcherList,
	TlaSwitcherRow,
	TlaSwitcherRowButton,
	TlaSwitcherRowMenu,
	TlaSwitcherRowMenuTrigger,
} from './TlaEditorSwitcherList'

const messages = defineMessages({
	newWorkspace: { defaultMessage: 'New workspace' },
	manageWorkspace: { defaultMessage: 'Manage workspace' },
})

const MENU_ID = 'workspaces'

/**
 * The workspace crumb in the v3 file header, and the successor to the sidebar's workspace switcher
 * now that the v3 canvas has no sidebar: it keeps that switcher's test ids. Picking a workspace
 * opens the file last open in it, which makes it the active one.
 */
export function TlaEditorWorkspaceSwitcher({ className }: { className?: string }) {
	const app = useApp()
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const activeWorkspaceId = useActiveWorkspaceId()
	const activeWorkspaceName = useWorkspaceName(activeWorkspaceId)
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const workspaceIds = useValue(
		'workspace ids',
		() => [
			homeWorkspaceId,
			...app
				.getWorkspaceMemberships()
				.filter((g) => g.groupId !== homeWorkspaceId && !!g.group)
				.map((g) => g.groupId),
		],
		[app, homeWorkspaceId]
	)

	// The popover keeps its open state under the same id, so this closes it. A button inside a
	// popover does not close it on its own, and it would sit over the dialogs opened from here.
	const [, setIsOpen] = useMenuIsOpen(MENU_ID)
	const switchToWorkspace = useSwitchToWorkspace()
	const handleCreateWorkspace = useCreateWorkspaceDialog('file-header')

	const handleManage = (workspaceId: string) => {
		setIsOpen(false)
		addDialog({
			component: ({ onClose }) => (
				<WorkspaceSettingsDialog workspaceId={workspaceId} onClose={onClose} />
			),
		})
		trackEvent('open-workspace-settings', { source: 'file-header' })
	}

	return (
		<TldrawUiPopover id={MENU_ID} className={className}>
			<TldrawUiPopoverTrigger>
				<TldrawUiButton
					type="menu"
					tooltip={activeWorkspaceName}
					title={activeWorkspaceName}
					className={classNames(SWITCHER_TRIGGER_CLASS_NAME, 'notranslate')}
					data-testid="tla-workspace-switcher"
				>
					<TldrawUiButtonLabel>
						<span data-testid="tla-active-workspace-name">{activeWorkspaceName}</span>
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="bottom" align="start" sideOffset={0}>
				<TlaSwitcherList
					rowCount={workspaceIds.length}
					createLabel={msg(messages.newWorkspace)}
					createTestId="tla-create-workspace-menu-item"
					onCreate={() => {
						setIsOpen(false)
						handleCreateWorkspace()
					}}
				>
					{workspaceIds.map((workspaceId, index) => (
						<WorkspaceSwitcherItem
							key={workspaceId}
							workspaceId={workspaceId}
							index={index}
							isActive={workspaceId === activeWorkspaceId}
							isHome={workspaceId === homeWorkspaceId}
							onSelect={() => {
								setIsOpen(false)
								switchToWorkspace(workspaceId)
							}}
							onManage={() => handleManage(workspaceId)}
						/>
					))}
				</TlaSwitcherList>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}

function WorkspaceSwitcherItem({
	workspaceId,
	index,
	isActive,
	isHome,
	onSelect,
	onManage,
}: {
	workspaceId: string
	index: number
	isActive: boolean
	isHome: boolean
	onSelect(): void
	onManage(): void
}) {
	const msg = useTranslation()
	const name = useWorkspaceName(workspaceId)
	return (
		<TlaSwitcherRow index={index} isCurrent={isActive}>
			<TlaSwitcherRowButton
				data-element="workspace-link"
				data-active={isActive}
				data-testid={isHome ? 'tla-workspace-switcher-home' : undefined}
				onClick={onSelect}
			>
				{name}
			</TlaSwitcherRowButton>
			<TlaSwitcherRowMenu>
				<TldrawUiDropdownMenuRoot id={`workspace item submenu ${index}`}>
					<TldrawUiDropdownMenuTrigger>
						<TlaSwitcherRowMenuTrigger data-testid="tla-workspace-switcher-item-menu" />
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
						<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
							<TldrawUiMenuGroup id="workspace">
								<TldrawUiMenuItem
									id="manage-workspace"
									label={msg(messages.manageWorkspace)}
									readonlyOk
									onSelect={onManage}
								/>
							</TldrawUiMenuGroup>
						</TldrawUiMenuContextProvider>
					</TldrawUiDropdownMenuContent>
				</TldrawUiDropdownMenuRoot>
			</TlaSwitcherRowMenu>
		</TlaSwitcherRow>
	)
}
