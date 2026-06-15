import { ZErrorCode } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { CSSProperties, ReactNode, useCallback } from 'react'
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
import { useHandleSidebarCreateFile } from './TlaSidebarCreateFileButton'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	home: { defaultMessage: 'Home' },
	createWorkspace: { defaultMessage: 'Create workspace' },
	newBoard: { defaultMessage: 'New board' },
	inviteTeammates: { defaultMessage: 'Invite teammates' },
	workspaceSettings: { defaultMessage: 'Workspace settings' },
})

/**
 * The fixed top region of the sidebar: a dropdown for switching between the
 * home workspace and the user's other workspaces, followed by action rows
 * when a non-home workspace is active. Selecting a workspace opens its top
 * file (first pinned file, otherwise the most recent one), which makes it
 * active (the active workspace is derived from the open file).
 */
export function TlaSidebarWorkspaceSwitcher() {
	const app = useApp()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const activeWorkspaceId = useActiveWorkspaceId()
	const isHome = activeWorkspaceId === homeWorkspaceId
	const homeLbl = useMsg(messages.home)

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

	return (
		<>
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
								<TlaIcon
									icon="chevron-up-down"
									className={styles.sidebarWorkspaceSwitcherChevrons}
								/>
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
								onSelect={() => switchToWorkspace(homeWorkspaceId)}
								testId="tla-workspace-switcher-home"
							>
								{homeLbl}
							</WorkspaceSwitcherItem>
							{workspaces.map((g) => (
								<WorkspaceSwitcherItem
									key={`workspace-${g.group.id}`}
									isActive={g.group.id === activeWorkspaceId}
									onSelect={() => switchToWorkspace(g.group.id)}
								>
									{g.group.name}
								</WorkspaceSwitcherItem>
							))}
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
									{createWorkspaceLbl}
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
			{!isHome && (
				<>
					<div className={styles.sidebarDivider} />
					<TlaSidebarWorkspaceActions workspaceId={activeWorkspaceId} />
				</>
			)}
		</>
	)
}

function WorkspaceSwitcherItem({
	isActive,
	onSelect,
	testId,
	children,
}: {
	isActive: boolean
	onSelect(): void
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
			<span className={styles.sidebarWorkspaceSwitcherItemLabel}>{children}</span>
		</_DropdownMenu.Item>
	)
}

/**
 * The action rows shown below the workspace switcher when a non-home
 * workspace is active: creating a new board in it, copying the workspace
 * invite link, and opening the workspace settings.
 */
function TlaSidebarWorkspaceActions({ workspaceId }: { workspaceId: string }) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const handleCreateFile = useHandleSidebarCreateFile()
	const newBoardLbl = useMsg(messages.newBoard)
	const inviteTeammatesLbl = useMsg(messages.inviteTeammates)
	const settingsLbl = useMsg(messages.workspaceSettings)

	const handleCopyInviteLink = useCallback(() => {
		// Right after creating a workspace the invite secret only exists on the
		// server, so there may be nothing to copy for a moment.
		if (!app.copyWorkspaceInvite(workspaceId)) {
			app.toasts?.addToast({
				id: 'invite-link-not-ready',
				title: 'Invite link not ready yet',
				description: 'Try again in a moment.',
			})
		}
	}, [app, workspaceId])

	const handleSettings = useCallback(() => {
		addDialog({
			component: ({ onClose }) => (
				<WorkspaceSettingsDialog workspaceId={workspaceId} onClose={onClose} />
			),
			preventBackgroundClose: true,
		})
		trackEvent('open-share-menu', { source: 'sidebar' })
	}, [addDialog, workspaceId, trackEvent])

	return (
		<div className={styles.sidebarSection}>
			<TlaSidebarActionButton
				icon="edit-strong"
				// edit-strong fills its 15px box while the other action icons draw
				// 12px art inside it; scale it down so they optically match.
				iconStyle={{ width: 12, height: 12, margin: 0 }}
				label={newBoardLbl}
				onClick={handleCreateFile}
				testId="tla-sidebar-new-board"
			/>
			<TlaSidebarActionButton
				icon="invite"
				label={inviteTeammatesLbl}
				onClick={handleCopyInviteLink}
				testId="tla-sidebar-invite-teammates"
			/>
			<TlaSidebarActionButton
				icon="settings"
				label={settingsLbl}
				onClick={handleSettings}
				testId="tla-sidebar-workspace-settings"
			/>
		</div>
	)
}

function TlaSidebarActionButton({
	icon,
	iconStyle,
	label,
	onClick,
	testId,
}: {
	icon: string
	iconStyle?: CSSProperties
	label: string
	onClick(): void
	testId: string
}) {
	return (
		<button
			className={classNames(styles.sidebarActionButton, styles.hoverable, 'tla-text_ui__regular')}
			onClick={onClick}
			data-testid={testId}
		>
			<TlaIcon icon={icon} style={iconStyle} />
			<span className={styles.sidebarActionButtonLabel}>{label}</span>
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
			// Empty workspace: create a blank file and open it, so selecting a workspace always
			// lands you on a file within it. The welcome file is seeded only when a workspace is
			// first created (see useCreateWorkspaceDialog), so an emptied workspace — like the
			// home workspace — just gets a fresh blank file to rename, not another welcome doc.
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
	const navigate = useNavigate()
	const { addDialog } = useDialogs()

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
						// Seed the workspace's welcome file once, here at creation, and open it
						// directly (not via switchToWorkspace, whose empty-workspace path would
						// otherwise create a blank file before the welcome file lands).
						const res = await app.createWorkspaceWelcomeFile(id)
						if (res.ok) {
							navigate(routes.tlaFile(res.value.fileId))
						}
					}}
				/>
			),
		})
	}, [app, addDialog, navigate])
}
