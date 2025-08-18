import { updateIn } from 'bedit'
import { Collapsible } from 'radix-ui'
import { Fragment, useState } from 'react'
import { uniqueId, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F } from '../../../utils/i18n'
import styles from '../sidebar.module.css'
import { ReorderCursor } from './ReorderCursor'
import { RecentFile } from './sidebar-shared'
import { TlaSidebarDropZone } from './TlaSidebarDropZone'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarFileSection } from './TlaSidebarFileSection'
import { TlaSidebarGroupItem } from './TlaSidebarGroupItem'
import { TlaSidebarInlineInput } from './TlaSidebarInlineInput'

export function TlaSidebarRecentFilesNew() {
	const app = useApp()

	const [isShowingAll, setIsShowingAll] = useState(false)
	const [isCreatingGroup, setIsCreatingGroup] = useState(false)

	// Get group memberships from the server
	const groupMemberships = useValue('groupMemberships', () => app.getGroupMemberships(), [app])

	const results = useValue(
		'recent user files',
		() => {
			const groupMemberships = app.getGroupMemberships()
			const recentFiles = app.getUserRecentFiles()
			if (!recentFiles) return null

			const pinnedFiles: RecentFile[] = []
			const otherFiles: RecentFile[] = []

			for (const item of recentFiles) {
				const { isPinned } = item
				if (isPinned) {
					pinnedFiles.push(item)
				} else if (
					!groupMemberships.some(
						(group) => group.group.id === app.getFile(item.fileId)?.owningGroupId
					)
				) {
					otherFiles.push(item)
				}
			}

			return {
				pinnedFiles,
				otherFiles,
			}
		},
		[app]
	)

	const handleCreateGroup = () => {
		const isMobile = getIsCoarsePointer()
		if (isMobile) {
			const name = window.prompt('Enter a name for the new group')
			if (!name) return
			const id = uniqueId()
			app.z.mutate.group.create({ id, name })
		} else {
			setIsCreatingGroup(true)
		}
	}

	const handleGroupCreateComplete = (name: string) => {
		const id = uniqueId()
		app.z.mutate.group.create({ id, name })
		setIsCreatingGroup(false)
		updateIn(app.sidebarState).expandedGroups.add(id)
	}

	const handleGroupCreateCancel = () => {
		setIsCreatingGroup(false)
	}

	if (!results) throw Error('Could not get files')

	const MAX_FILES_TO_SHOW = groupMemberships.length > 0 ? 6 : +Infinity
	const isOverflowing = results.otherFiles.length > MAX_FILES_TO_SHOW
	const filesToShow = results.otherFiles.slice(0, MAX_FILES_TO_SHOW)
	const hiddenFiles = results.otherFiles.slice(MAX_FILES_TO_SHOW)

	return (
		<Fragment>
			{results.pinnedFiles.length > 0 && (
				<TlaSidebarDropZone id="my-files-pinned-drop-zone">
					<TlaSidebarFileSection title={<F defaultMessage="Favorites" />} onePixelOfPaddingAtTheTop>
						{results.pinnedFiles.map((item, i) => (
							<TlaSidebarFileLink
								context="my-files-pinned"
								key={'file_link_pinned_' + item.fileId}
								item={item}
								testId={`tla-file-link-pinned-${i}`}
							/>
						))}
						{/* Pinned files reorder cursor */}
						<ReorderCursor
							dragStateSelector={(app) => {
								const dragState = app.sidebarState.get().dragState
								return dragState?.type === 'pinned' ? dragState.cursorLineY : null
							}}
						/>
					</TlaSidebarFileSection>
				</TlaSidebarDropZone>
			)}
			{filesToShow.length > 0 && (
				<TlaSidebarDropZone id="my-files-drop-zone">
					<TlaSidebarFileSection
						className={styles.sidebarFileSectionRecent}
						title={<F defaultMessage="My files" />}
					>
						{filesToShow.map((item, i) => (
							<TlaSidebarFileLink
								context="my-files"
								key={'file_link_today_' + item.fileId}
								item={item}
								testId={`tla-file-link-today-${i}`}
							/>
						))}
					</TlaSidebarFileSection>
				</TlaSidebarDropZone>
			)}
			{hiddenFiles.length > 0 && (
				<Collapsible.Root open={isShowingAll}>
					<Collapsible.Content className={styles.CollapsibleContent}>
						{hiddenFiles.map((item, i) => (
							<TlaSidebarFileLink
								context="my-files"
								key={'file_link_today_' + item.fileId}
								item={item}
								testId={`tla-file-link-today-${i}`}
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
			)}
			<hr className={styles.sidebarFileSectionDivider} />
			<TlaSidebarFileSection
				className={styles.sidebarFileSectionGroups}
				title={<F defaultMessage="Groups" />}
				iconButton={
					isCreatingGroup
						? undefined
						: {
								icon: 'plus',
								onClick: handleCreateGroup,
								title: 'Create new group',
							}
				}
			>
				{isCreatingGroup && (
					<TlaSidebarInlineInput
						data-testid="tla-sidebar-create-group-input"
						defaultValue="New group"
						placeholder="Enter group name..."
						onComplete={handleGroupCreateComplete}
						onCancel={handleGroupCreateCancel}
						className={styles.sidebarGroupCreateInput}
						wrapperClassName={styles.sidebarGroupCreateInputWrapper}
					/>
				)}
				{groupMemberships.map((group, i) => (
					// Include the array index in the key to force a remount when the order changes
					// this prevents a bug where the collapsible open animation replays when react moves
					// an open group item within the list. I guess the browser thinks it's a new dom node
					// or whatever.
					// If radix's Collapsible had 'opening' and 'closing' states instead of just 'open' and 'closed'
					// we wouldn't need this.
					<TlaSidebarGroupItem key={`group-${group.group.id}-${i}`} groupId={group.group.id} />
				))}
				{/* Global drag cursor for group reordering */}
				<ReorderCursor
					dragStateSelector={(app) => {
						const dragState = app.sidebarState.get().dragState
						return dragState?.type === 'group' ? dragState.cursorLineY : null
					}}
				/>
			</TlaSidebarFileSection>
		</Fragment>
	)
}
