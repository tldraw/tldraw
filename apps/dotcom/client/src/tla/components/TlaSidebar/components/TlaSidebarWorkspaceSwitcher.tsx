import classNames from 'classnames'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { ReactNode, useCallback } from 'react'
import {
	defineMessages,
	useContainer,
	useGlobalMenuIsOpen,
	useMaybeEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { TLA_MENU_POSITION } from '../../tla-menu/tla-menu-position'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { useCreateWorkspaceDialog, useSwitchToWorkspace } from './useWorkspaceActions'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	myWorkspace: { defaultMessage: 'My workspace' },
	createWorkspace: { defaultMessage: 'New workspace' },
})

/**
 * The fixed top region of the sidebar: a dropdown for switching between the
 * home workspace and the user's other workspaces, followed by action rows for
 * the active workspace. Selecting a workspace opens the file the user most
 * recently had open in it (or its top file if they've visited none), which makes
 * it active (the active workspace is derived from the open file).
 */
export function TlaSidebarWorkspaceSwitcher() {
	const msg = useTranslation()
	const app = useApp()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const activeWorkspaceId = useActiveWorkspaceId()
	const isHome = activeWorkspaceId === homeWorkspaceId
	const myWorkspaceLbl = msg(messages.myWorkspace)

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
							// When the switcher closes because another menu is opening (e.g. a file's
							// "…" menu), don't restore focus to our trigger — that focus shift would
							// dismiss the just-opened menu, making it flash. A plain Escape/outside
							// close (no other menu open) still restores focus for keyboard users.
							onCloseAutoFocus={(e) => {
								if (editor?.menus.hasAnyOpenMenus()) e.preventDefault()
							}}
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
									<span className={styles.sidebarTruncatedText}>
										{msg(messages.createWorkspace)}
									</span>
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
