import { fileOpen } from 'browser-fs-access'
import classNames from 'classnames'
import { Collapsible, ContextMenu as _ContextMenu } from 'radix-ui'
import { memo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TLDRAW_FILE_EXTENSION,
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
import { useDragTracking } from '../../../hooks/useDragTracking'
import { useIsDragging } from '../../../hooks/useIsDragging'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F, defineMessages, useMsg } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { AddFileLinkDialog } from '../../dialogs/AddFileLinkDialog'
import { GroupSettingsDialog } from '../../dialogs/GroupSettingsDialog'
import styles from '../sidebar.module.css'
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
			const pinned = groupFiles.filter((f) => !!app.getFileState(f.fileId)?.isPinned)
			const unpinned = groupFiles.filter((f) => !app.getFileState(f.fileId)?.isPinned)
			return pinned.concat(unpinned)
		},
		[app, groupId]
	)
	const expansionState = useValue(
		'expansionState',
		() => app.sidebarState.get().expandedGroups[groupId] ?? 'closed',
		[app, groupId]
	)

	const isShowingAll = expansionState === 'expanded_show_more'

	const handleShowMore = useCallback(() => {
		app.sidebarState.update((prev) => ({
			...prev,
			expandedGroups: { ...prev.expandedGroups, [groupId]: 'expanded_show_more' },
		}))
	}, [app, groupId])

	const handleShowLess = useCallback(() => {
		app.sidebarState.update((prev) => ({
			...prev,
			expandedGroups: { ...prev.expandedGroups, [groupId]: 'expanded_show_less' },
		}))
	}, [app, groupId])

	if (!group) return null

	const numPinnedFiles = files.filter((f) => !!app.getFileState(f.fileId)?.isPinned).length

	const MAX_FILES_TO_SHOW = numPinnedFiles + 4
	const slop = 2
	const isOverflowing = files.length > MAX_FILES_TO_SHOW + slop
	const filesToShow = isOverflowing ? files.slice(0, MAX_FILES_TO_SHOW) : files
	const hiddenFiles = isOverflowing ? files.slice(MAX_FILES_TO_SHOW) : []

	if (filesToShow.length === 0)
		return <GroupEmptyState groupId={groupId} onCreateFile={onCreateFile} />

	return (
		<Collapsible.Root open={isShowingAll}>
			{filesToShow.map((item) => (
				<TlaSidebarFileLink
					groupId={groupId}
					key={`group-file-${item.fileId}`}
					className={styles.sidebarGroupItemFile}
					item={item}
					testId={`tla-group-file-${item.fileId}`}
				/>
			))}

			{isOverflowing && (
				<>
					<Collapsible.Content className={styles.CollapsibleContent}>
						{hiddenFiles.map((item) => (
							<TlaSidebarFileLink
								groupId={groupId}
								key={`group-file-${item.fileId}`}
								className={styles.sidebarGroupItemFile}
								item={item}
								testId={`tla-group-file-${item.fileId}`}
							/>
						))}
					</Collapsible.Content>
					<Collapsible.Trigger asChild>
						{isShowingAll ? (
							<button className={styles.showAllButton} onClick={handleShowLess}>
								<F defaultMessage="Show less" />
							</button>
						) : (
							<button className={styles.showAllButton} onClick={handleShowMore}>
								<F defaultMessage="Show more" />
							</button>
						)}
					</Collapsible.Trigger>
				</>
			)}
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
	const navigate = useNavigate()
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

	const handleImportFilesClick = useCallback(async () => {
		trackEvent('import-tldr-file', { source: 'sidebar' })

		try {
			const tldrawFiles = await fileOpen({
				extensions: [TLDRAW_FILE_EXTENSION],
				multiple: true,
				description: 'tldraw project',
			})

			app.uploadTldrFiles(
				tldrawFiles,
				(fileId) => {
					navigate(routes.tlaFile(fileId), { state: { mode: 'create' } })
				},
				groupId
			)
		} catch {
			// user cancelled
			return
		}
	}, [trackEvent, app, navigate, groupId])

	const handleAddLinkToSharedFileClick = useCallback(() => {
		addDialog({
			component: ({ onClose }) => <AddFileLinkDialog onClose={onClose} groupId={groupId} />,
		})
	}, [addDialog, groupId])

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

const blankImg = document.createElement('img')
blankImg.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

export function TlaSidebarGroupItem({ groupId, index }: { groupId: string; index: number }) {
	const [menuIsOpen] = useMenuIsOpen(`group-menu-${groupId}-sidebar`)
	const [contextMenuIsOpen] = useMenuIsOpen(`group-context-menu-${groupId}`)
	const app = useApp()
	const [_, handleContextMenuOpenChange] = useMenuIsOpen(`group-context-menu-${groupId}`)
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const rCanCreate = useRef(true)

	const { startDragTracking } = useDragTracking()

	const isDragging = useIsDragging(groupId)
	// disable dragging on mobile
	const isCoarsePointer = getIsCoarsePointer()

	const expansionState = useValue(
		'expansionState',
		() => {
			return app.sidebarState.get().expandedGroups[groupId] ?? 'closed'
		},
		[app, groupId]
	)

	const isExpanded = expansionState !== 'closed'

	const isNoAnimation = useValue(
		'isNoAnimation',
		() => app.sidebarState.get().noAnimationGroups.includes(groupId),
		[app, groupId]
	)
	useEffect(() => {
		if (isNoAnimation) {
			setTimeout(() => {
				app.sidebarState.update((prev) => ({
					...prev,
					noAnimationGroups: prev.noAnimationGroups.filter((id) => id !== groupId),
				}))
			}, 350)
		}
	}, [isNoAnimation, app, groupId])

	const setIsExpanded = useCallback(
		(isExpanded: boolean) => {
			if (isExpanded) {
				app.sidebarState.update((prev) => ({
					...prev,
					expandedGroups: { ...prev.expandedGroups, [groupId]: 'expanded_show_less' },
				}))
				// Clear group file ordering when expanding to refresh the order (like recent files on page reload)
				app.clearGroupFileOrdering(groupId)
			} else {
				app.sidebarState.update((prev) => ({
					...prev,
					expandedGroups: { ...prev.expandedGroups, [groupId]: 'closed' },
				}))
			}
		},
		[app, groupId]
	)

	const group = useValue('group', () => app.getGroupMembership(groupId), [app, groupId])

	const handleCreateFile = useCallback(async () => {
		if (!rCanCreate.current) return

		const res = await app.createFile({ groupId })

		if (res.ok) {
			const isMobile = getIsCoarsePointer()
			if (!isMobile) {
				app.sidebarState.update((prev) => ({
					...prev,
					renameState: { fileId: res.value.fileId, groupId },
				}))
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

	const showDroppingState = useValue(
		'showDroppingState',
		() => {
			const dragState = app.sidebarState.get().dragState
			if (!dragState) return false
			return (
				dragState.type === 'file' &&
				dragState.operation.move?.targetId === groupId &&
				!dragState.operation.reorder
			)
		},
		[app, groupId]
	)

	if (!group) return null

	return (
		<_ContextMenu.Root onOpenChange={handleContextMenuOpenChange} modal={false}>
			<_ContextMenu.Trigger>
				<Collapsible.Root
					className={classNames(styles.sidebarGroupItem, {
						[styles.dropping]: showDroppingState,
					})}
					open={isExpanded}
					data-is-empty={isEmpty}
					data-group-index={index}
					data-menu-open={menuIsOpen || contextMenuIsOpen}
					data-group-id={group.groupId}
					data-drop-target-id={`group:${group.groupId}`}
					data-no-animation={isNoAnimation}
					data-is-dragging={isDragging}
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
							draggable={!isCoarsePointer}
							onClick={() => setIsExpanded(!isExpanded)}
							onDragStart={
								isCoarsePointer
									? undefined
									: (event) => {
											event.dataTransfer.effectAllowed = 'move'
											event.dataTransfer.setData('text/plain', group.groupId)
											event.dataTransfer.setDragImage(blankImg, 0, 0)
											startDragTracking({
												groupId: group.groupId,
												clientX: event.clientX,
												clientY: event.clientY,
											})
										}
							}
						>
							<div
								className={styles.sidebarGroupItemTitle}
								style={{
									marginLeft: isExpanded ? 0 : 0,
									transition: 'margin-left 0.14s ease-in-out',
								}}
							>
								<TlaIcon icon={isExpanded ? 'folder-open' : 'folder'} style={{ top: -1 }} />
								{group.group.name}
							</div>
							<div
								className={styles.sidebarGroupItemButtons}
								onClick={(e) => e.stopPropagation()}
								style={{ cursor: 'default' }}
							>
								<button
									className={styles.sidebarGroupItemButton}
									onClick={handleCreateFile}
									title="New file"
									type="button"
								>
									<TlaIcon icon="edit" />
								</button>
								<TlaSidebarGroupMenu groupId={groupId} />
							</div>
						</div>
					</Collapsible.Trigger>
					<Collapsible.Content className={styles.CollapsibleContent}>
						<GroupFileList groupId={groupId} onCreateFile={handleCreateFile} />
					</Collapsible.Content>
				</Collapsible.Root>
			</_ContextMenu.Trigger>
			<_ContextMenu.Content className="tlui-menu tlui-scrollable">
				<TldrawUiMenuContextProvider type="context-menu" sourceId="context-menu">
					<GroupMenuContent groupId={groupId} />
				</TldrawUiMenuContextProvider>
			</_ContextMenu.Content>
		</_ContextMenu.Root>
	)
}
