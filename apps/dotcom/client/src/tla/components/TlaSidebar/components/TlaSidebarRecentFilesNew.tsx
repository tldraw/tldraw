import { Collapsible } from 'radix-ui'
import { Fragment } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { F } from '../../../utils/i18n'
import styles from '../sidebar.module.css'
import { ReorderCursor } from './ReorderCursor'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarGroupItem } from './TlaSidebarGroupItem'

export function TlaSidebarRecentFilesNew() {
	const app = useApp()
	// Demo flag to switch between inline input and dialog

	const isShowingAll = useValue('isShowingAll', () => app.sidebarState.get().recentFilesShowMore, [
		app,
	])

	const handleShowMore = () => {
		app.sidebarState.update((prev) => ({ ...prev, recentFilesShowMore: true }))
	}

	const handleShowLess = () => {
		app.sidebarState.update((prev) => ({ ...prev, recentFilesShowMore: false }))
	}

	// Get group memberships from the server
	const groupMemberships = useValue('groupMemberships', () => app.getGroupMemberships(), [app])

	const files = useValue('my files', () => app.getMyFiles(), [app])
	const homeGroupId = app.getHomeGroupId()
	const showMyFilesDropState = useValue(
		'showMyFilesDropState',
		() => {
			const dragState = app.sidebarState.get().dragState
			if (!dragState?.hasDragStarted) return false
			return (
				dragState.type === 'file' &&
				dragState.operation.move?.targetId === homeGroupId &&
				!dragState.operation.reorder
			)
		},
		[app, homeGroupId]
	)

	if (!files) throw Error('Could not get files')
	const numPinnedFiles = files.filter((f) => f.isPinned).length

	const MAX_FILES_TO_SHOW = Math.max(
		groupMemberships.length > 0 ? 6 : +Infinity,
		numPinnedFiles + 4
	)
	const slop = 2
	const isOverflowing = files.length > MAX_FILES_TO_SHOW + slop
	const filesToShow = isOverflowing ? files.slice(0, MAX_FILES_TO_SHOW) : files
	const hiddenFiles = isOverflowing ? files.slice(MAX_FILES_TO_SHOW) : []

	return (
		<Fragment>
			<div
				data-drop-target-id={homeGroupId}
				className={showMyFilesDropState ? styles.dropping : ''}
			>
				<div
					style={{ fontSize: 12, paddingLeft: 8, paddingTop: 12, color: 'var(--tla-color-text-3)' }}
				>
					<F defaultMessage="My files" />
				</div>
				<div style={{ height: 8 }}></div>
				{filesToShow.length > 0 &&
					filesToShow.map((item, i) => (
						<TlaSidebarFileLink
							groupId={homeGroupId}
							key={'file_link_today_' + item.fileId}
							item={item}
							testId={`tla-file-link-today-${i}`}
						/>
					))}
				{hiddenFiles.length > 0 && (
					<Collapsible.Root open={isShowingAll}>
						<Collapsible.Content className={styles.CollapsibleContent}>
							{hiddenFiles.map((item, i) => (
								<TlaSidebarFileLink
									groupId={homeGroupId}
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
			</div>
			<div style={{ height: 12 }}></div>
			{groupMemberships.map((group, i) =>
				group.groupId === app.getHomeGroupId() ? null : (
					// Include the array index in the key to force a remount when the order changes
					// this prevents a bug where the collapsible open animation replays when react moves
					// an open group item within the list. I guess the browser thinks it's a new dom node
					// or whatever.
					// If radix's Collapsible had 'opening' and 'closing' states instead of just 'open' and 'closed'
					// we wouldn't need this.
					<TlaSidebarGroupItem
						key={`group-${group.group.id}-${i}`}
						groupId={group.group.id}
						index={i}
					/>
				)
			)}
			{/* Global drag cursor for group reordering */}
			<ReorderCursor />
		</Fragment>
	)
}
