import { ZErrorCode } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	uniqueId,
	useContainer,
	useDialogs,
	useGlobalMenuIsOpen,
	useMaybeEditor,
	useValue,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { CreateWorkspaceDialog } from '../../dialogs/CreateWorkspaceDialog'
import { TLA_MENU_POSITION } from '../../tla-menu/tla-menu'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	myWorkspace: { defaultMessage: 'My workspace' },
	createWorkspace: { defaultMessage: 'New workspace' },
})

/**
 * The fixed top region of the sidebar: a dropdown for switching between the
 * home workspace and the user's other workspaces, followed by action rows for
 * the active workspace. Selecting a workspace opens its top file (first pinned
 * file, otherwise the most recent one), which makes it active (the active
 * workspace is derived from the open file).
 */
export function TlaSidebarWorkspaceSwitcher() {
	const app = useApp()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const activeWorkspaceId = useActiveWorkspaceId()
	const isHome = activeWorkspaceId === homeWorkspaceId
	const myWorkspaceLbl = useMsg(messages.myWorkspace)

	const workspaces = useValue(
		'workspaceMemberships',
		() =>
			app
				.getWorkspaceMemberships()
				.filter(
					(g): g is typeof g & { group: NonNullable<(typeof g)['group']> } =>
						g.groupId !== homeWorkspaceId && !!g.group
				),
		[app, homeWorkspaceId]
	)
	const activeWorkspaceName = useValue(
		'active workspace name',
		() => app.getWorkspaceMembership(activeWorkspaceId)?.group?.name,
		[app, activeWorkspaceId]
	)
	const homeWorkspaceName = useValue(
		'home workspace name',
		() => app.getWorkspaceMembership(homeWorkspaceId)?.group?.name,
		[app, homeWorkspaceId]
	)

	// Use a stable, editor-independent menu id. useMenuIsOpen would suffix the id
	// with the active file editor's contextId, but the sidebar receives that editor
	// via globalEditor and it is replaced on every file/workspace switch. That made
	// the switcher's open state churn with — and get cleared by the dispose of — the
	// outgoing editor, so reopening it mid-switch auto-dismissed once the new canvas loaded.
	// We still complete any in-progress canvas interaction on open (the one useful side
	// effect useMenuIsOpen gave us) by running it against the current editor, without
	// scoping the menu state itself to that editor.
	const editor = useMaybeEditor()
	const [isOpen, onOpenChange] = useGlobalMenuIsOpen(
		'sidebar-workspace-switcher',
		useCallback(
			(nextIsOpen: boolean) => {
				if (nextIsOpen) editor?.complete()
			},
			[editor]
		)
	)
	const switchToWorkspace = useSwitchToWorkspace()
	const handleCreateWorkspace = useCreateWorkspaceDialog()
	const createWorkspaceLbl = useMsg(messages.createWorkspace)
	const container = useContainer()

	return (
		<div className={styles.sidebarSection}>
			<div className={styles.sidebarWorkspaceSwitcherRoot}>
				<_DropdownMenu.Root open={isOpen} onOpenChange={onOpenChange}>
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
								{activeWorkspaceName ?? myWorkspaceLbl}
							</span>
							<TlaIcon icon="chevron-up-down" className={styles.sidebarWorkspaceSwitcherChevrons} />
						</button>
					</_DropdownMenu.Trigger>
					<_DropdownMenu.Portal container={container}>
						<_DropdownMenu.Content
							className={classNames('tlui-menu', styles.sidebarWorkspaceSwitcherMenu)}
							side="bottom"
							align="start"
							{...TLA_MENU_POSITION}
						>
							<WorkspaceSwitcherItem
								isActive={isHome}
								onSelect={() => switchToWorkspace(homeWorkspaceId)}
								testId="tla-workspace-switcher-home"
							>
								{homeWorkspaceName ?? myWorkspaceLbl}
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
							<_DropdownMenu.Separator className={styles.sidebarWorkspaceSwitcherSeparator} />
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
									<span className={styles.sidebarTruncatedText}>{createWorkspaceLbl}</span>
								</span>
							</_DropdownMenu.Item>
						</_DropdownMenu.Content>
					</_DropdownMenu.Portal>
				</_DropdownMenu.Root>
			</div>
		</div>
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
			<span className={styles.sidebarWorkspaceSwitcherItemLabel}>
				<TlaIcon icon={isActive ? 'check' : 'none'} />
				<span className={styles.sidebarTruncatedText}>{children}</span>
			</span>
		</_DropdownMenu.Item>
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
			// A workspace created moments ago may still be seeding its welcome file: the
			// createWorkspace mutation lands before the file does, so it briefly appears empty.
			// Await that in-flight seed and open its result rather than racing it with a duplicate
			// blank file. (On seed failure we fall through to the blank-file path below.)
			const pendingWelcome = app.getPendingWorkspaceWelcomeFile(workspaceId)
			if (pendingWelcome) {
				const seeded = await pendingWelcome
				if (seeded.ok) {
					navigate(routes.tlaFile(seeded.value.fileId))
					return
				}
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
						// Seed the workspace's welcome file once, here at creation, and open it
						// directly (not via switchToWorkspace, whose empty-workspace path would
						// otherwise create a blank file before the welcome file lands).
						const res = await app.createWorkspaceWelcomeFile(id)
						if (res.ok) {
							navigate(routes.tlaFile(res.value.fileId))
						} else {
							// Seeding failed; still land the user in the new workspace rather than
							// leaving them stranded. switchToWorkspace creates a blank file for the
							// (now empty) workspace and opens it.
							await switchToWorkspace(id)
						}
					}}
				/>
			),
		})
	}, [app, addDialog, navigate, switchToWorkspace])
}
