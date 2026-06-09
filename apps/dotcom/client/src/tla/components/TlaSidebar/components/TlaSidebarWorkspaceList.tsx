import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TldrawUiMenuContextProvider, uniqueId, useDialogs, useMenuIsOpen, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useActiveGroupId } from '../../../hooks/useActiveGroupId'
import { useApp } from '../../../hooks/useAppState'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F } from '../../../utils/i18n'
import { CreateGroupDialog } from '../../dialogs/CreateGroupDialog'
import { GroupMenuContent, TlaSidebarGroupMenu } from './TlaSidebarGroupMenu'
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
	const homeGroupId = app.getHomeGroupId()
	const groupMemberships = useValue('groupMemberships', () => app.getGroupMemberships(), [app])
	const workspaces = groupMemberships.filter((g) => g.groupId !== homeGroupId)

	return (
		<div className={styles.sidebarWorkspaceList}>
			<TlaSidebarWorkspaceListItem groupId={homeGroupId} label={<F defaultMessage="My files" />} />
			{workspaces.map((g) => (
				<TlaSidebarWorkspaceListItem
					key={`workspace-${g.group.id}`}
					groupId={g.group.id}
					label={g.group.name}
				/>
			))}
			<TlaSidebarCreateWorkspaceButton />
		</div>
	)
}

function TlaSidebarWorkspaceListItem({ groupId, label }: { groupId: string; label: ReactNode }) {
	const app = useApp()
	const navigate = useNavigate()
	const activeGroupId = useActiveGroupId()
	const homeGroupId = app.getHomeGroupId()
	const isActive = activeGroupId === groupId
	const isHome = groupId === homeGroupId
	const [, handleContextMenuOpenChange] = useMenuIsOpen(`group-context-menu-${groupId}`)

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
				dragState.operation.move?.targetId === groupId &&
				!dragState.operation.reorder
			)
		},
		[app, groupId, isActive]
	)

	const handleClick = useCallback(async () => {
		const files = app.getGroupFilesSorted(groupId)
		if (files.length) {
			navigate(routes.tlaFile(files[0]!.fileId))
			return
		}
		// Empty space: create a file in it and open that, so selecting a space
		// always lands you on a file within it.
		const res = await app.createFile({ groupId })
		if (res.ok) {
			if (!getIsCoarsePointer()) {
				app.sidebarState.update((prev) => ({
					...prev,
					renameState: { fileId: res.value.fileId, groupId },
				}))
			}
			app.ensureFileVisibleInSidebar(res.value.fileId)
			navigate(routes.tlaFile(res.value.fileId))
		}
	}, [app, groupId, navigate])

	// The active space's files render in the list below, which is the drop target
	// for reordering. To avoid a duplicate drop-target id, the active space's nav
	// entry is not itself a drop target (you can't move a file into its own space).
	const dropTargetProps = isActive
		? {}
		: groupId === homeGroupId
			? { 'data-drop-target-id': homeGroupId }
			: { 'data-drop-target-id': `group:${groupId}`, 'data-group-id': groupId }

	const row = (
		<div
			className={classNames(styles.sidebarFileListItem, styles.hoverable, {
				[styles.dropping]: showDropState,
			})}
			data-active={isActive}
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
						styles.sidebarRowItemLabel,
						'notranslate'
					)}
				>
					{label}
				</div>
			</div>
			{!isHome && (
				<div onClick={(e) => e.stopPropagation()}>
					<TlaSidebarGroupMenu
						groupId={groupId}
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
					<GroupMenuContent groupId={groupId} />
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
				<CreateGroupDialog
					onClose={onClose}
					onCreate={(name) => {
						const id = uniqueId()
						app.z.mutate.createGroup({ id, name })
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
					className={classNames(styles.sidebarFileListItemLabel, styles.sidebarRowItemLabel)}
					style={{ color: 'var(--tla-color-text-3)' }}
				>
					<F defaultMessage="Create a workspace +" />
				</div>
			</div>
		</button>
	)
}
