import { NEW_WORKSPACE_TEMPLATE_ID, TEMPLATE_PREFIX, ZErrorCode } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TldrawUiMenuContextProvider, uniqueId, useDialogs, useMenuIsOpen, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F, useMsg } from '../../../utils/i18n'
import { CreateWorkspaceDialog } from '../../dialogs/CreateWorkspaceDialog'
import { messages } from './sidebar-shared'
import { WorkspaceMenuContent, TlaSidebarWorkspaceMenu } from './TlaSidebarWorkspaceMenu'
import styles from '../sidebar.module.css'

/**
 * The fixed top region of the sidebar: a flat list of the spaces the user can
 * switch between — "My files" (the home group) followed by their workspaces,
 * then a button to create a new workspace. Selecting a space opens its most
 * recent file, which makes that space active (the active space is derived from
 * the open file). Each non-active entry is also a drop target for moving files.
 */
export function TlaSidebarWorkspaceList() {
	const app = useApp()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const workspaceMemberships = useValue(
		'workspaceMemberships',
		() => app.getWorkspaceMemberships(),
		[app]
	)
	const workspaces = workspaceMemberships.filter((g) => g.groupId !== homeWorkspaceId)

	return (
		<div className={styles.sidebarWorkspaceList}>
			<TlaSidebarWorkspaceListItem
				workspaceId={homeWorkspaceId}
				label={<F defaultMessage="My files" />}
			/>
			{workspaces.map((g) => (
				<TlaSidebarWorkspaceListItem
					key={`workspace-${g.group.id}`}
					workspaceId={g.group.id}
					label={g.group.name}
				/>
			))}
			<TlaSidebarCreateWorkspaceButton />
		</div>
	)
}

function TlaSidebarWorkspaceListItem({
	workspaceId,
	label,
}: {
	workspaceId: string
	label: ReactNode
}) {
	const app = useApp()
	const navigate = useNavigate()
	const activeWorkspaceId = useActiveWorkspaceId()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const isActive = activeWorkspaceId === workspaceId
	const isHome = workspaceId === homeWorkspaceId
	const [, handleContextMenuOpenChange] = useMenuIsOpen(`workspace-context-menu-${workspaceId}`)

	const showDropState = useValue(
		'workspace drop state',
		() => {
			// The active space is never a valid move target (its files already live
			// there); dragging within it is a reorder/unpin, not a move.
			if (isActive) return false
			const dragState = app.sidebarState.get().dragState
			if (!dragState?.hasDragStarted) return false
			return (
				dragState.type === 'file' &&
				dragState.operation.move?.targetId === workspaceId &&
				!dragState.operation.reorder
			)
		},
		[app, workspaceId, isActive]
	)

	const welcomeFileName = useMsg(messages.newWorkspaceFileName)

	const handleClick = useCallback(async () => {
		const files = app.getWorkspaceFilesSorted(workspaceId)
		if (files.length) {
			navigate(routes.tlaFile(files[0]!.fileId))
			return
		}
		// Empty space: create a file in it and open that, so selecting a space
		// always lands you on a file within it. A workspace's first file is seeded
		// from the new-workspace template, whose canvas introduces workspaces; it
		// arrives named, so it skips the inline rename that blank files get. The
		// home space gets a regular blank file.
		const res = isHome
			? await app.createFile({ workspaceId })
			: await app.createFile({
					workspaceId,
					name: welcomeFileName,
					createSource: `${TEMPLATE_PREFIX}/${NEW_WORKSPACE_TEMPLATE_ID}`,
				})
		if (res.ok) {
			if (isHome && !getIsCoarsePointer()) {
				app.sidebarState.update((prev) => ({
					...prev,
					renameState: { fileId: res.value.fileId, workspaceId },
				}))
			}
			navigate(routes.tlaFile(res.value.fileId))
		}
	}, [app, workspaceId, navigate, isHome, welcomeFileName])

	// The active space's files render in the list below, which is the drop target
	// for reordering. To avoid a duplicate drop-target id, the active space's nav
	// entry is not itself a drop target (you can't move a file into its own space).
	const dropTargetProps = isActive
		? {}
		: workspaceId === homeWorkspaceId
			? { 'data-drop-target-id': homeWorkspaceId }
			: { 'data-drop-target-id': `workspace:${workspaceId}`, 'data-workspace-id': workspaceId }

	const row = (
		<div
			className={classNames(styles.sidebarFileListItem, styles.hoverable, {
				[styles.dropping]: showDropState,
			})}
			data-active={isActive}
			data-element="workspace-link"
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === 'Enter') handleClick()
			}}
			{...dropTargetProps}
		>
			<div className={styles.sidebarFileListItemContent}>
				<div
					className={classNames(
						styles.sidebarFileListItemLabel,
						'tla-text_ui__regular',
						'notranslate'
					)}
				>
					{label}
				</div>
			</div>
			{!isHome && (
				<div onClick={(e) => e.stopPropagation()}>
					<TlaSidebarWorkspaceMenu
						workspaceId={workspaceId}
						className={styles.sidebarFileListItemMenuTrigger}
					/>
				</div>
			)}
		</div>
	)

	// "My files" (home group) has no context menu — it can't be renamed, shared, etc.
	if (isHome) return row

	return (
		<_ContextMenu.Root onOpenChange={handleContextMenuOpenChange} modal={false}>
			<_ContextMenu.Trigger asChild>{row}</_ContextMenu.Trigger>
			<_ContextMenu.Content className="tlui-menu tlui-scrollable">
				<TldrawUiMenuContextProvider type="context-menu" sourceId="context-menu">
					<WorkspaceMenuContent workspaceId={workspaceId} />
				</TldrawUiMenuContextProvider>
			</_ContextMenu.Content>
		</_ContextMenu.Root>
	)
}

function TlaSidebarCreateWorkspaceButton() {
	const app = useApp()
	const { addDialog } = useDialogs()

	const handleCreateWorkspace = useCallback(() => {
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
						}
					}}
				/>
			),
		})
	}, [app, addDialog])

	return (
		<button
			className={classNames(styles.sidebarFileListItem, styles.hoverable)}
			style={{ border: 'none', background: 'none', color: 'var(--tla-color-text-3)' }}
			onClick={handleCreateWorkspace}
			data-testid="tla-create-workspace"
		>
			<div className={styles.sidebarFileListItemContent}>
				<div
					className={classNames(styles.sidebarFileListItemLabel, 'tla-text_ui__regular')}
					style={{ color: 'var(--tla-color-text-3)' }}
				>
					<F defaultMessage="Create a workspace +" />
				</div>
			</div>
		</button>
	)
}
