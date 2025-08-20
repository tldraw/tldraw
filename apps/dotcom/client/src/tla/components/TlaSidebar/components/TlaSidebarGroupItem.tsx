import { useDraggable } from '@dnd-kit/core'
import { setIn, updateIn } from 'bedit'
import { Collapsible, ContextMenu as _ContextMenu } from 'radix-ui'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	tltime,
	useMenuIsOpen,
	useToasts,
	useValue,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F, defineMessages, useMsg } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
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

const TriangleIcon = ({ angle = 0 }: { angle?: number }) => {
	return (
		<svg
			width="8"
			height="8"
			viewBox="4 4 8 8"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			style={{
				transform: `rotate(${angle + 180}deg)`,
			}}
		>
			<path
				d="M5.12764 7.30697C4.8722 6.97854 5.10625 6.5 5.52232 6.5H10.4777C10.8938 6.5 11.1278 6.97854 10.8724 7.30697L8.39468 10.4926C8.1945 10.7499 7.8055 10.7499 7.60532 10.4926L5.12764 7.30697Z"
				fill="currentColor"
			/>
		</svg>
	)
}

function GroupEmptyState() {
	return (
		<div className={styles.sidebarGroupItemEmpty}>
			<F
				{...messages.groupEmpty}
				values={{
					br: () => <br />,
					create: (chunks) => (
						<button className={styles.sidebarGroupItemButtonInline}>
							{chunks} <TlaIcon icon="edit" className={styles.sidebarGroupEmptyStateIcon} />
						</button>
					),
					invite: (chunks) => (
						<button className={styles.sidebarGroupItemButtonInline}>
							{chunks} <TlaIcon icon="copy" className={styles.sidebarGroupEmptyStateIcon} />
						</button>
					),
				}}
			/>
		</div>
	)
}

const GroupFileList = memo(function GroupFileList({ groupId }: { groupId: string }) {
	const app = useApp()
	const group = useValue('group', () => app.getGroupMembership(groupId), [app, groupId])
	const [isShowingAll, setIsShowingAll] = useState(false)

	if (!group) return null

	let files = group.groupFiles.map((gf) => gf.file)
	files = files.slice().sort((a, b) => b.updatedAt - a.updatedAt)

	const MAX_FILES_TO_SHOW = 4
	const isOverflowing = files.length > MAX_FILES_TO_SHOW
	const filesToShow = files.slice(0, MAX_FILES_TO_SHOW)
	const hiddenFiles = files.slice(MAX_FILES_TO_SHOW)

	if (filesToShow.length === 0) return <GroupEmptyState />

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
						<button className={styles.showAllButton} onClick={() => setIsShowingAll(false)}>
							<F defaultMessage="Show less" />
						</button>
					) : (
						<button className={styles.showAllButton} onClick={() => setIsShowingAll(true)}>
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
	const { addToast } = useToasts()
	const trackEvent = useTldrawAppUiEvents()
	const copiedMsg = useMsg(groupMessages.copied)
	const copyInviteLinkMsg = useMsg(groupMessages.copyInviteLink)
	const settingsMsg = useMsg(groupMessages.settings)
	const importFilesMsg = useMsg(groupMessages.importFiles)
	const addLinkToSharedFileMsg = useMsg(groupMessages.addLinkToSharedFile)

	const group = useValue('group', () => app.getGroupMembership(groupId), [app, groupId])

	const handleCopyInviteLinkClick = useCallback(() => {
		if (!group?.group.inviteSecret) return

		const inviteText = `app.z.mutate.group.acceptInvite({ inviteSecret: '${group.group.inviteSecret}' })`
		navigator.clipboard.writeText(inviteText)
		addToast({
			id: 'copied-invite-link',
			title: copiedMsg,
		})
		trackEvent('copy-share-link', { source: 'sidebar' })
	}, [group, addToast, copiedMsg, trackEvent])

	const handleSettingsClick = useCallback(() => {
		// TODO: Implement group settings dialog
		trackEvent('open-share-menu', { source: 'sidebar' })
	}, [trackEvent])

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

export function TlaSidebarGroupItem({ groupId }: { groupId: string }) {
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

	const isExpanded = useValue(
		'isExpanded',
		() => {
			return app.sidebarState.get().expandedGroups.has(groupId)
		},
		[app, groupId]
	)

	const isNoAnimation = useValue(
		'isNoAnimation',
		() => app.sidebarState.get().noAnimationGroups.has(groupId),
		[app, groupId]
	)
	useEffect(() => {
		if (isNoAnimation) {
			setTimeout(() => {
				updateIn(app.sidebarState).noAnimationGroups.delete(groupId)
			}, 350)
		}
	}, [isNoAnimation, app, groupId])

	const setIsExpanded = useCallback(
		(isExpanded: boolean) => {
			if (isExpanded) {
				updateIn(app.sidebarState).expandedGroups.add(groupId)
			} else {
				updateIn(app.sidebarState).expandedGroups.delete(groupId)
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
				setIn(app.sidebarState).renameState({ fileId: res.value.fileId, context: 'group-files' })
			}
			navigate(routes.tlaFile(res.value.fileId))
			setIsExpanded(true)
			trackEvent('create-file', { source: 'sidebar' })
			rCanCreate.current = false
			tltime.setTimeout('can create again', () => (rCanCreate.current = true), 1000)
		}
	}, [app, groupId, navigate, trackEvent, setIsExpanded])

	if (!group) return null

	return (
		<div
			ref={setNodeRef}
			{...attributes}
			className={isDragging ? styles.sidebarGroupItemDragging : undefined}
			data-group-id={group.groupId}
			data-group-index={group.index}
			data-no-animation={isNoAnimation}
		>
			<_ContextMenu.Root onOpenChange={handleContextMenuOpenChange} modal={false}>
				<_ContextMenu.Trigger>
					<TlaSidebarDropZone id={`group-${groupId}-drop-zone`}>
						<Collapsible.Root
							className={styles.sidebarGroupItem}
							open={isExpanded}
							data-dragging={isDragging}
							data-menu-open={menuIsOpen || contextMenuIsOpen}
						>
							<Collapsible.Trigger asChild>
								<div
									className={styles.sidebarGroupItemHeader}
									onClick={() => setIsExpanded(!isExpanded)}
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
									<span className={styles.sidebarGroupItemTitle}>{group.group.name}</span>
									<TriangleIcon angle={isExpanded ? 180 : 90} />
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
								<GroupFileList groupId={groupId} />
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
