import { ZErrorCode } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { uniqueId, useDialogs, useMenuIsOpen, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { CreateWorkspaceDialog } from '../../dialogs/CreateWorkspaceDialog'
import { WorkspaceSettingsDialog } from '../../dialogs/WorkspaceSettingsDialog'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	home: { defaultMessage: 'Home' },
	createWorkspace: { defaultMessage: 'Create workspace' },
	newWorkspace: { defaultMessage: 'New workspace' },
	inviteTeammates: { defaultMessage: 'Invite teammates' },
	workspaceSettings: { defaultMessage: 'Workspace settings' },
})

/**
 * The fixed top region of the sidebar: a dropdown for switching between the
 * home workspace and the user's other workspaces. The active workspace is
 * marked with a check and carries invite and settings actions on the right.
 * Selecting a workspace opens its top file (first pinned file, otherwise the
 * most recent one), which makes it active (the active workspace is derived
 * from the open file). The home workspace has no invite link or settings, so
 * its actions are shown disabled.
 */
export function TlaSidebarWorkspaceSwitcher() {
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const activeWorkspaceId = useActiveWorkspaceId()
	const isHome = activeWorkspaceId === homeWorkspaceId
	const homeLbl = useMsg(messages.home)
	const inviteTeammatesLbl = useMsg(messages.inviteTeammates)
	const workspaceSettingsLbl = useMsg(messages.workspaceSettings)

	const workspaces = useValue(
		'workspaceMemberships',
		() => app.getWorkspaceMemberships().filter((g) => g.groupId !== homeWorkspaceId),
		[app, homeWorkspaceId]
	)
	const activeWorkspaceName = useValue(
		'active workspace name',
		() => app.getWorkspaceMembership(activeWorkspaceId)?.group.name,
		[app, activeWorkspaceId]
	)

	const [isOpen, onOpenChange] = useMenuIsOpen('sidebar-workspace-switcher')
	const switchToWorkspace = useSwitchToWorkspace()
	const handleCreateWorkspace = useCreateWorkspaceDialog()
	const createWorkspaceLbl = useMsg(messages.createWorkspace)
	const newWorkspaceLbl = useMsg(messages.newWorkspace)

	const closeMenu = useCallback(() => onOpenChange(false), [onOpenChange])

	const handleCopyInvite = useCallback(
		(workspaceId: string) => {
			// Right after creating a workspace the invite secret only exists on the
			// server, so there may be nothing to copy for a moment.
			if (!app.copyWorkspaceInvite(workspaceId)) {
				app.toasts?.addToast({
					id: 'invite-link-not-ready',
					title: 'Invite link not ready yet',
					description: 'Try again in a moment.',
				})
			}
		},
		[app]
	)

	const handleSettings = useCallback(
		(workspaceId: string) => {
			addDialog({
				component: ({ onClose }) => (
					<WorkspaceSettingsDialog workspaceId={workspaceId} onClose={onClose} />
				),
				preventBackgroundClose: true,
			})
			trackEvent('open-share-menu', { source: 'sidebar' })
		},
		[addDialog, trackEvent]
	)

	return (
		<div className={styles.sidebarSection}>
			{isOpen && (
				<div
					className={styles.sidebarWorkspaceSwitcherOverlay}
					onPointerDown={(e) => {
						e.preventDefault()
						e.stopPropagation()
						onOpenChange(false)
					}}
				/>
			)}
			<div className={styles.sidebarWorkspaceSwitcherRoot}>
				<_DropdownMenu.Root open={isOpen} onOpenChange={onOpenChange} modal>
					<_DropdownMenu.Trigger asChild>
						<button
							className={classNames(
								styles.sidebarWorkspaceSwitcherTrigger,
								styles.hoverable,
								'tla-text_ui__regular'
							)}
							data-testid="tla-workspace-switcher"
						>
							<span
								className={classNames(styles.sidebarWorkspaceSwitcherLabel, 'notranslate')}
								data-testid="tla-active-workspace-name"
							>
								{isHome ? homeLbl : (activeWorkspaceName ?? homeLbl)}
							</span>
							<TlaIcon icon="chevron-up-down" className={styles.sidebarWorkspaceSwitcherChevrons} />
						</button>
					</_DropdownMenu.Trigger>
					<_DropdownMenu.Content
						className={classNames('tlui-menu', styles.sidebarWorkspaceSwitcherMenu)}
						side="bottom"
						align="start"
						sideOffset={4}
						alignOffset={-4}
						collisionPadding={8}
					>
						<WorkspaceSwitcherItem
							isActive={isHome}
							isHome
							onSelect={() => switchToWorkspace(homeWorkspaceId)}
							onInvite={() => handleCopyInvite(homeWorkspaceId)}
							onSettings={() => handleSettings(homeWorkspaceId)}
							closeMenu={closeMenu}
							inviteLabel={inviteTeammatesLbl}
							settingsLabel={workspaceSettingsLbl}
							testId="tla-workspace-switcher-home"
						>
							{homeLbl}
						</WorkspaceSwitcherItem>
						{workspaces.map((g) => (
							<WorkspaceSwitcherItem
								key={`workspace-${g.group.id}`}
								isActive={g.group.id === activeWorkspaceId}
								isHome={false}
								onSelect={() => switchToWorkspace(g.group.id)}
								onInvite={() => handleCopyInvite(g.group.id)}
								onSettings={() => handleSettings(g.group.id)}
								closeMenu={closeMenu}
								inviteLabel={inviteTeammatesLbl}
								settingsLabel={workspaceSettingsLbl}
							>
								{g.group.name}
							</WorkspaceSwitcherItem>
						))}
						<_DropdownMenu.Separator className={styles.sidebarWorkspaceSwitcherMenuDivider} />
						<_DropdownMenu.Item
							className={classNames(
								styles.sidebarWorkspaceSwitcherItem,
								styles.sidebarWorkspaceSwitcherItemCreate,
								'tla-text_ui__regular'
							)}
							onSelect={handleCreateWorkspace}
							data-testid="tla-create-workspace-menu-item"
						>
							<span className={styles.sidebarWorkspaceSwitcherItemLabel}>
								<TlaIcon icon="plus" />
								{newWorkspaceLbl}
							</span>
						</_DropdownMenu.Item>
					</_DropdownMenu.Content>
				</_DropdownMenu.Root>
			</div>
			{workspaces.length === 0 && (
				<button
					className={classNames(
						styles.sidebarCreateWorkspaceButton,
						styles.hoverable,
						'tla-text_ui__regular'
					)}
					onClick={handleCreateWorkspace}
					data-testid="tla-create-workspace"
				>
					{createWorkspaceLbl}
				</button>
			)}
		</div>
	)
}

function WorkspaceSwitcherItem({
	isActive,
	isHome,
	onSelect,
	onInvite,
	onSettings,
	closeMenu,
	inviteLabel,
	settingsLabel,
	testId,
	children,
}: {
	isActive: boolean
	isHome: boolean
	onSelect(): void
	onInvite(): void
	onSettings(): void
	closeMenu(): void
	inviteLabel: string
	settingsLabel: string
	testId?: string
	children: ReactNode
}) {
	return (
		<_DropdownMenu.Item
			className={classNames(
				styles.sidebarWorkspaceSwitcherItem,
				'tla-text_ui__regular',
				'notranslate'
			)}
			data-active={isActive}
			data-element="workspace-link"
			onSelect={onSelect}
			data-testid={testId}
		>
			<TlaIcon
				icon="check"
				className={styles.sidebarWorkspaceSwitcherCheck}
				style={{ visibility: isActive ? 'visible' : 'hidden' }}
			/>
			<span className={styles.sidebarWorkspaceSwitcherItemLabel}>{children}</span>
			{isActive && (
				<span
					className={styles.sidebarWorkspaceSwitcherItemActions}
					// Keep interactions with the action buttons from reaching the row,
					// which selects on pointer up/click and would switch workspaces and
					// close the menu out from under them.
					onPointerDown={(e) => e.stopPropagation()}
					onPointerUp={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
				>
					<WorkspaceActionButton
						icon="invite"
						label={inviteLabel}
						disabled={isHome}
						onClick={() => {
							onInvite()
							closeMenu()
						}}
						testId="tla-sidebar-invite-teammates"
					/>
					<WorkspaceActionButton
						icon="settings"
						label={settingsLabel}
						disabled={isHome}
						onClick={() => {
							onSettings()
							closeMenu()
						}}
						testId="tla-sidebar-workspace-settings"
					/>
				</span>
			)}
		</_DropdownMenu.Item>
	)
}

function WorkspaceActionButton({
	icon,
	label,
	disabled,
	onClick,
	testId,
}: {
	icon: string
	label: string
	disabled: boolean
	onClick(): void
	testId: string
}) {
	return (
		<button
			type="button"
			className={styles.sidebarWorkspaceSwitcherActionButton}
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			data-testid={testId}
		>
			<TlaIcon icon={icon} />
		</button>
	)
}

function useSwitchToWorkspace() {
	const app = useApp()
	const navigate = useNavigate()

	return useCallback(
		async (workspaceId: string) => {
			const files = app.getWorkspaceFilesSorted(workspaceId)
			if (files.length) {
				navigate(routes.tlaFile(files[0]!.fileId))
				return
			}
			// Empty workspace: create a file in it and open that, so selecting a
			// workspace always lands you on a file within it.
			const res = await app.createFile({ workspaceId })
			if (res.ok) {
				if (!getIsCoarsePointer()) {
					app.sidebarState.update((prev) => ({
						...prev,
						renameState: { fileId: res.value.fileId, workspaceId },
					}))
				}
				navigate(routes.tlaFile(res.value.fileId))
			}
		},
		[app, navigate]
	)
}

function useCreateWorkspaceDialog() {
	const app = useApp()
	const { addDialog } = useDialogs()
	const switchToWorkspace = useSwitchToWorkspace()

	return useCallback(() => {
		addDialog({
			component: ({ onClose }) => (
				<CreateWorkspaceDialog
					onClose={onClose}
					onCreate={async (name) => {
						const id = uniqueId()
						try {
							await app.z.mutate.createWorkspace({ id, name }).client
						} catch (e) {
							app.showMutationRejectionToast((e as Error).message as ZErrorCode)
							return
						}
						await switchToWorkspace(id)
					}}
				/>
			),
		})
	}, [app, addDialog, switchToWorkspace])
}
