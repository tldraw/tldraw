import { useDraggable } from '@dnd-kit/core'
import { patch } from 'patchfork'
import { Collapsible, ContextMenu as _ContextMenu } from 'radix-ui'
import { memo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	tltime,
	useDialogs,
	useMenuIsOpen,
	useValue,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F, defineMessages, useMsg } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { GroupSettingsDialog } from '../../dialogs/GroupSettingsDialog'
import styles from '../sidebar.module.css'
import { TlaSidebarDropZone } from './TlaSidebarDropZone'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { messages } from './sidebar-shared'

const groupMessages = defineMessages({
	copyInviteLink: { defaultMessage: 'Copy invite link' },
	settings: { defaultMessage: 'Settings' },
	importFiles: { defaultMessage: 'Import file…' },
	addLinkToSharedFile: { defaultMessage: 'Add file link…' },
	copied: { defaultMessage: 'Copied invite link' },
})

function GroupEmptyState({ groupId, onCreateFile }: { groupId: string; onCreateFile(): void }) {
	const app = useApp()
	return (
		<div className={styles.sidebarGroupItemEmpty}>
			<F
				{...messages.groupEmpty}
				values={{
					br: () => <br />,
					create: (chunks) => (
						<button className={styles.sidebarGroupItemButtonInline} onClick={onCreateFile}>
							{chunks}
						</button>
					),
					invite: (chunks) => (
						<button
							className={styles.sidebarGroupItemButtonInline}
							onClick={() => app.copyGroupInvite(groupId)}
						>
							{chunks}
						</button>
					),
				}}
			/>
		</div>
	)
}

const GroupFileList = memo(function GroupFileList({
	groupId,
	onCreateFile,
}: {
	groupId: string
	onCreateFile(): void
}) {
	const app = useApp()
	const group = useValue('group', () => app.getGroupMembership(groupId), [app, groupId])
	const files = useValue(
		'group files',
		() => {
			const groupFiles = app.getGroupFilesSorted(groupId)
			const pinned = groupFiles.filter((f) => !!app.getFileState(f.id)?.isPinned)
			const unpinned = groupFiles.filter((f) => !app.getFileState(f.id)?.isPinned)
			return pinned.concat(unpinned)
		},
		[app, groupId]
	)
	const expansionState = useValue(
		'expansionState',
		() => app.sidebarState.get().expandedGroups.get(groupId) ?? 'closed',
		[app, groupId]
	)

	const isShowingAll = expansionState === 'expanded_show_more'

	const handleShowMore = useCallback(() => {
		patch(app.sidebarState).expandedGroups.set(groupId, 'expanded_show_more')
	}, [app, groupId])

	const handleShowLess = useCallback(() => {
		patch(app.sidebarState).expandedGroups.set(groupId, 'expanded_show_less')
	}, [app, groupId])

	if (!group) return null

	const MAX_FILES_TO_SHOW = 4
	const isOverflowing = files.length > MAX_FILES_TO_SHOW
	const filesToShow = files.slice(0, MAX_FILES_TO_SHOW)
	const hiddenFiles = files.slice(MAX_FILES_TO_SHOW)

	if (filesToShow.length === 0)
		return <GroupEmptyState groupId={groupId} onCreateFile={onCreateFile} />

	return (
		<Collapsible.Root open={isShowingAll}>
			{filesToShow.map((file) => (
				<TlaSidebarFileLink
					context="group-files"
					key={`group-file-${file.id}`}
					className={styles.sidebarGroupItemFile}
					item={{
						fileId: file.id,
						date: file.createdAt,
						isPinned: false,
					}}
					testId={`tla-group-file-${file.id}`}
				/>
			))}
			<Collapsible.Content className={styles.CollapsibleContent}>
				{hiddenFiles.map((file) => (
					<TlaSidebarFileLink
						context="group-files"
						key={`group-file-${file.id}`}
						className={styles.sidebarGroupItemFile}
						item={{
							fileId: file.id,
							date: file.createdAt,
							isPinned: false,
						}}
						testId={`tla-group-file-${file.id}`}
					/>
				))}
			</Collapsible.Content>
			<Collapsible.Trigger asChild>
				{isOverflowing &&
					(isShowingAll ? (
						<button className={styles.showAllButton} onClick={handleShowLess}>
							<F defaultMessage="Show less" />
						</button>
					) : (
						<button className={styles.showAllButton} onClick={handleShowMore}>
							<F defaultMessage="Show more" />
						</button>
					))}
			</Collapsible.Trigger>
		</Collapsible.Root>
	)
})

function TlaSidebarGroupMenu({ groupId }: { groupId: string }) {
	return (
		<TldrawUiDropdownMenuRoot id={`group-menu-${groupId}-sidebar`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					<button className={styles.sidebarGroupItemButton} title="More options" type="button">
						<TlaIcon icon="dots-vertical-strong" />
					</button>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
					<GroupMenuContent groupId={groupId} />
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}

function GroupMenuContent({ groupId }: { groupId: string }) {
	const app = useApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const copyInviteLinkMsg = useMsg(groupMessages.copyInviteLink)
	const settingsMsg = useMsg(groupMessages.settings)
	const importFilesMsg = useMsg(groupMessages.importFiles)
	const addLinkToSharedFileMsg = useMsg(groupMessages.addLinkToSharedFile)

	const handleCopyInviteLinkClick = useCallback(() => {
		app.copyGroupInvite(groupId)
	}, [app, groupId])

	const handleSettingsClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <GroupSettingsDialog groupId={groupId} onClose={onClose} />,
		})
		trackEvent('open-share-menu', { source: 'sidebar' })
	}, [addDialog, groupId, trackEvent])

	const handleImportFilesClick = useCallback(() => {
		// TODO: Implement file import functionality
		trackEvent('create-file', { source: 'sidebar' })
	}, [trackEvent])

	const handleAddLinkToSharedFileClick = useCallback(() => {
		// TODO: Implement add link to shared file functionality
		trackEvent('copy-file-link', { source: 'sidebar' })
	}, [trackEvent])

	return (
		<>
			<TldrawUiMenuGroup id="group-actions">
				<TldrawUiMenuItem
					label={copyInviteLinkMsg}
					id="copy-invite-link"
					readonlyOk
					onSelect={handleCopyInviteLinkClick}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="group-settings">
				<TldrawUiMenuItem
					label={settingsMsg}
					id="settings"
					readonlyOk
					onSelect={handleSettingsClick}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="group-import-file-actions">
				<TldrawUiMenuItem
					label={importFilesMsg}
					id="import-files"
					readonlyOk
					onSelect={handleImportFilesClick}
				/>
				<TldrawUiMenuItem
					label={addLinkToSharedFileMsg}
					id="add-link-to-shared-file"
					readonlyOk
					onSelect={handleAddLinkToSharedFileClick}
				/>
			</TldrawUiMenuGroup>
		</>
	)
}

export function TlaSidebarGroupItem({ groupId, index }: { groupId: string; index: number }) {
	const [menuIsOpen] = useMenuIsOpen(`group-menu-${groupId}-sidebar`)
	const [contextMenuIsOpen] = useMenuIsOpen(`group-context-menu-${groupId}`)
	const app = useApp()
	const [_, handleContextMenuOpenChange] = useMenuIsOpen(`group-context-menu-${groupId}`)
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const rCanCreate = useRef(true)

	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: groupId,
		data: {
			type: 'group',
			groupId,
		},
	})

	const expansionState = useValue(
		'expansionState',
		() => {
			return app.sidebarState.get().expandedGroups.get(groupId) ?? 'closed'
		},
		[app, groupId]
	)

	const isExpanded = expansionState !== 'closed'

	const isNoAnimation = useValue(
		'isNoAnimation',
		() => app.sidebarState.get().noAnimationGroups.has(groupId),
		[app, groupId]
	)
	useEffect(() => {
		if (isNoAnimation) {
			setTimeout(() => {
				patch(app.sidebarState).noAnimationGroups.delete(groupId)
			}, 350)
		}
	}, [isNoAnimation, app, groupId])

	const setIsExpanded = useCallback(
		(isExpanded: boolean) => {
			if (isExpanded) {
				patch(app.sidebarState).expandedGroups.set(groupId, 'expanded_show_less')
				// Clear group file ordering when expanding to refresh the order (like recent files on page reload)
				app.clearGroupFileOrdering(groupId)
			} else {
				patch(app.sidebarState).expandedGroups.delete(groupId)
			}
		},
		[app, groupId]
	)

	const group = useValue('group', () => app.getGroupMembership(groupId), [app, groupId])

	const handleCreateFile = useCallback(async () => {
		if (!rCanCreate.current) return

		const res = await app.createGroupFile(groupId)

		if (res.ok) {
			const isMobile = getIsCoarsePointer()
			if (!isMobile) {
				patch(app.sidebarState).renameState({ fileId: res.value.fileId, context: 'group-files' })
			}
			app.ensureFileVisibleInSidebar(res.value.fileId)
			navigate(routes.tlaFile(res.value.fileId))
			setIsExpanded(true)
			trackEvent('create-file', { source: 'sidebar' })
			rCanCreate.current = false
			tltime.setTimeout('can create again', () => (rCanCreate.current = true), 1000)
		}
	}, [app, groupId, navigate, trackEvent, setIsExpanded])

	const isEmpty = useValue('isEmpty', () => app.getGroupFilesSorted(groupId).length === 0, [
		app,
		groupId,
	])

	if (!group) return null

	return (
		<div
			ref={setNodeRef}
			{...attributes}
			className={isDragging ? styles.sidebarGroupItemDragging : undefined}
			data-group-id={group.groupId}
			data-no-animation={isNoAnimation}
		>
			<_ContextMenu.Root onOpenChange={handleContextMenuOpenChange} modal={false}>
				<_ContextMenu.Trigger>
					<TlaSidebarDropZone id={`group-${groupId}-drop-zone`}>
						<Collapsible.Root
							className={styles.sidebarGroupItem}
							open={isExpanded}
							data-dragging={isDragging}
							data-is-empty={isEmpty}
							data-group-index={index}
							data-is-expanded={isExpanded}
							data-menu-open={menuIsOpen || contextMenuIsOpen}
						>
							<Collapsible.Trigger asChild>
								<div
									className={styles.sidebarGroupItemHeader}
									aria-expanded={isExpanded}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											setIsExpanded(!isExpanded)
										}
									}}
									{...listeners}
									style={{ cursor: 'default' }}
								>
									<div
										className={styles.sidebarGroupItemTitle}
										style={{
											marginLeft: isExpanded ? 0 : 0,
											transition: 'margin-left 0.14s ease-in-out',
										}}
										onClick={() => setIsExpanded(!isExpanded)}
									>
										<TlaIcon icon={isExpanded ? 'folder-open' : 'folder'} style={{ top: -1 }} />
										{group.group.name}
									</div>
									<div
										className={styles.sidebarGroupItemButtons}
										onClick={(e) => e.stopPropagation()}
										style={{ cursor: 'default' }}
									>
										<TlaSidebarGroupMenu groupId={groupId} />
										<button
											className={styles.sidebarGroupItemButton}
											onClick={handleCreateFile}
											title="New file"
											type="button"
										>
											<TlaIcon icon="edit" />
										</button>
									</div>
								</div>
							</Collapsible.Trigger>
							<Collapsible.Content className={styles.CollapsibleContent}>
								<GroupFileList groupId={groupId} onCreateFile={handleCreateFile} />
							</Collapsible.Content>
						</Collapsible.Root>
					</TlaSidebarDropZone>
				</_ContextMenu.Trigger>
				<_ContextMenu.Content className="tlui-menu tlui-scrollable">
					<TldrawUiMenuContextProvider type="context-menu" sourceId="context-menu">
						<GroupMenuContent groupId={groupId} />
					</TldrawUiMenuContextProvider>
				</_ContextMenu.Content>
			</_ContextMenu.Root>
		</div>
	)
}
