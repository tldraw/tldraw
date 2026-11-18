import classNames from 'classnames'
import {
	defineMessages,
	TldrawUiButton,
	TldrawUiButtonIcon,
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
import styles from './top.module.css'

const messages = defineMessages({
	newWorkspace: { defaultMessage: 'New workspace' },
	manageWorkspace: { defaultMessage: 'Manage workspace' },
})

const MENU_ID = 'workspaces'

// The row height `.tlui-page-menu__item` is laid out at.
const ITEM_HEIGHT = 40

/**
 * The workspace crumb in the v3 file header, and the successor to the sidebar's workspace switcher
 * now that the v3 canvas has no sidebar: it keeps that switcher's test ids. Picking a workspace
 * opens the file last open in it, which makes it the active one.
 *
 * Built from the page menu's own classes so the two popovers match; that menu positions its rows
 * absolutely, so these are too.
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
					className="tlui-page-menu__trigger notranslate"
					data-testid="tla-workspace-switcher"
				>
					<TldrawUiButtonLabel>
						<span data-testid="tla-active-workspace-name">{activeWorkspaceName}</span>
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="bottom" align="start" sideOffset={0}>
				<div className="tlui-page-menu__wrapper">
					<div className={classNames('tlui-page-menu__list', styles.switcherList)}>
						<div
							className="tlui-page-menu__list__content"
							style={{ height: workspaceIds.length * ITEM_HEIGHT }}
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
						</div>
					</div>
					<div className={styles.switcherDivider} />
					<TldrawUiButton
						type="menu"
						className="tlui-page-menu__create-button"
						data-testid="tla-create-workspace-menu-item"
						onClick={() => {
							setIsOpen(false)
							handleCreateWorkspace()
						}}
					>
						<TldrawUiButtonLabel>{msg(messages.newWorkspace)}</TldrawUiButtonLabel>
						<TldrawUiButtonIcon icon="plus" small />
					</TldrawUiButton>
				</div>
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
	const menuLbl = msg('page-menu.submenu.title')
	return (
		<div
			className="tlui-page-menu__item"
			data-iscurrent={isActive}
			style={{ transform: `translateY(${index * ITEM_HEIGHT}px)` }}
		>
			<TldrawUiButton
				type="normal"
				className="tlui-page-menu__item__button notranslate"
				data-element="workspace-link"
				data-active={isActive}
				data-testid={isHome ? 'tla-workspace-switcher-home' : undefined}
				onClick={onSelect}
			>
				<TldrawUiButtonLabel>{name}</TldrawUiButtonLabel>
			</TldrawUiButton>
			<div className="tlui-page-menu__item__submenu">
				<TldrawUiDropdownMenuRoot id={`workspace item submenu ${index}`}>
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton
							type="icon"
							tooltip={menuLbl}
							title={menuLbl}
							data-testid="tla-workspace-switcher-item-menu"
						>
							<TldrawUiButtonIcon icon="dots-vertical" small />
						</TldrawUiButton>
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
			</div>
		</div>
	)
}
