import { patch } from 'patchfork'
import { Collapsible } from 'radix-ui'
import { Fragment, useState } from 'react'
import { useDialogs, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { defineMessages, F, useIntl } from '../../../utils/i18n'
import styles from '../sidebar.module.css'
import { ReorderCursor } from './ReorderCursor'
import { RecentFile } from './sidebar-shared'
import { TlaSidebarDropZone } from './TlaSidebarDropZone'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarGroupItem } from './TlaSidebarGroupItem'

const messages = defineMessages({
	createGroup: {
		id: 'tla.sidebar.createGroup',
		defaultMessage: 'Create new group',
	},
	createGroupInputPlaceholder: {
		id: 'tla.sidebar.createGroupInputPlaceholder',
		defaultMessage: 'Enter group name...',
	},
})

declare global {
	interface Window {
		useDialogForGroupCreation: boolean
	}
}
window.useDialogForGroupCreation = true

export function TlaSidebarRecentFilesNew() {
	const app = useApp()
	const intl = useIntl()
	const { addDialog } = useDialogs()

	const [isCreatingGroup, setIsCreatingGroup] = useState(false)
	// Demo flag to switch between inline input and dialog

	const isShowingAll = useValue('isShowingAll', () => app.sidebarState.get().recentFilesShowMore, [
		app,
	])

	const handleShowMore = () => {
		patch(app.sidebarState).recentFilesShowMore(true)
	}

	const handleShowLess = () => {
		patch(app.sidebarState).recentFilesShowMore(false)
	}

	// Get group memberships from the server
	const groupMemberships = useValue('groupMemberships', () => app.getGroupMemberships(), [app])

	const files = useValue(
		'recent user files',
		() => {
			const groupMemberships = app.getGroupMemberships()
			const recentFiles = app.getUserRecentFiles()
			if (!recentFiles) return null

			const pinnedFiles: RecentFile[] = []
			const otherFiles: RecentFile[] = []

			for (const item of recentFiles) {
				const { isPinned } = item
				if (
					groupMemberships.some((group) => group.groupFiles.some((g) => g.fileId === item.fileId))
				)
					continue
				if (isPinned) {
					pinnedFiles.push(item)
				} else {
					otherFiles.push(item)
				}
			}

			return pinnedFiles.concat(otherFiles)
		},
		[app]
	)

	if (!files) throw Error('Could not get files')

	const MAX_FILES_TO_SHOW = Math.max(
		groupMemberships.length > 0 ? 6 : +Infinity,
		files.filter((f) => f.isPinned).length
	)
	const isOverflowing = files.length > MAX_FILES_TO_SHOW
	const filesToShow = files.slice(0, MAX_FILES_TO_SHOW)
	const hiddenFiles = files.slice(MAX_FILES_TO_SHOW)

	return (
		<Fragment>
			<div style={{ height: 8 }}></div>
			{filesToShow.length > 0 && (
				<TlaSidebarDropZone id="my-files-drop-zone">
					{filesToShow.map((item, i) => (
						<TlaSidebarFileLink
							context="my-files"
							key={'file_link_today_' + item.fileId}
							item={item}
							testId={`tla-file-link-today-${i}`}
						/>
					))}
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
			)}
			<div style={{ height: 12 }}></div>
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
		</Fragment>
	)
}
