import { ReactElement, useCallback } from 'react'
import { useValue } from 'tldraw'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { getRelevantDates } from '../../../utils/dates'
import { F } from '../../../utils/i18n'
import { RecentFile } from './sidebar-shared'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarFileSection } from './TlaSidebarFileSection'
import { TlaSidebarActionButton } from './TlaSidebarWorkspaceActions'
import styles from '../sidebar.module.css'

interface FileGroup {
	key: string
	title: ReactElement
	files: RecentFile[]
}

/**
 * The scrollable lower region of the sidebar: the files of whichever space is
 * currently active (derived from the open file). Pinned files come first, then
 * the remaining files grouped by recency. There is no per-workspace expand/collapse.
 */
export function TlaSidebarRecentFiles() {
	const app = useApp()
	const activeWorkspaceId = useActiveWorkspaceId()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const isHome = activeWorkspaceId === homeWorkspaceId

	const { groups, isSearching } = useValue(
		'active workspace files',
		() => {
			let files = app.getWorkspaceFilesSorted(activeWorkspaceId)

			// Filter by the sidebar search query, if any. Reading the signal here keeps
			// the list reactive to the query without threading it through props.
			const query = app.sidebarState.get().searchQuery.trim().toLowerCase()
			if (query) {
				files = files.filter((item) => app.getFileName(item.fileId).toLowerCase().includes(query))
			}

			const { today, yesterday, thisWeek, thisMonth } = getRelevantDates()

			const pinnedFiles: RecentFile[] = []
			const todayFiles: RecentFile[] = []
			const yesterdayFiles: RecentFile[] = []
			const thisWeekFiles: RecentFile[] = []
			const thisMonthFiles: RecentFile[] = []
			const olderFiles: RecentFile[] = []

			for (const item of files) {
				const { date, isPinned } = item
				if (isPinned) pinnedFiles.push(item)
				else if (date >= today) todayFiles.push(item)
				else if (date >= yesterday) yesterdayFiles.push(item)
				else if (date >= thisWeek) thisWeekFiles.push(item)
				else if (date >= thisMonth) thisMonthFiles.push(item)
				else olderFiles.push(item)
			}
			olderFiles.sort((a, b) => b.date - a.date)

			const groups: FileGroup[] = [
				{ key: 'pinned', title: <F defaultMessage="Pinned" />, files: pinnedFiles },
				{ key: 'today', title: <F defaultMessage="Today" />, files: todayFiles },
				{ key: 'yesterday', title: <F defaultMessage="Yesterday" />, files: yesterdayFiles },
				{ key: 'this-week', title: <F defaultMessage="This week" />, files: thisWeekFiles },
				{ key: 'this-month', title: <F defaultMessage="This month" />, files: thisMonthFiles },
				{ key: 'older', title: <F defaultMessage="Older" />, files: olderFiles },
			]
			return { groups: groups.filter((g) => g.files.length > 0), isSearching: query.length > 0 }
		},
		[app, activeWorkspaceId]
	)

	const handleClearSearch = useCallback(() => {
		app.sidebarState.update((prev) => ({ ...prev, searchQuery: '' }))
	}, [app])

	return (
		<div
			data-drop-target-id={isHome ? homeWorkspaceId : `workspace:${activeWorkspaceId}`}
			data-workspace-id={activeWorkspaceId}
		>
			{groups.map((group) => (
				<TlaSidebarFileSection
					key={group.key}
					title={group.title}
					iconLeft={group.key === 'pinned' ? 'pin' : undefined}
					onePixelOfPaddingAtTheTop={group.key === 'pinned'}
				>
					{group.files.map((item, i) => (
						<TlaSidebarFileLink
							workspaceId={activeWorkspaceId}
							key={`${group.key}_${item.fileId}`}
							item={item}
							testId={`tla-file-link-${group.key}-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			))}
			{isSearching && groups.length === 0 ? (
				<div className={styles.sidebarSearchEmpty} data-testid="tla-sidebar-search-empty">
					<F defaultMessage="No files found" />
				</div>
			) : null}
			{isSearching ? (
				// The same section wrapper as the workspace action rows, so the button gets the same
				// full width and vertical rhythm. The gap above comes from the file sections' own
				// bottom margin.
				<div className={styles.sidebarSection}>
					<TlaSidebarActionButton
						label={<F defaultMessage="Clear search" />}
						onClick={handleClearSearch}
						testId="tla-sidebar-search-clear-button"
					/>
				</div>
			) : null}
		</div>
	)
}
