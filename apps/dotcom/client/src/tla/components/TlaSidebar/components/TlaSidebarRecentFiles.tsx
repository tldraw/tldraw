import { useValue } from 'tldraw'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { getRelevantDates } from '../../../utils/dates'
import { F } from '../../../utils/i18n'
import { RecentFile } from './sidebar-shared'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarFileSection } from './TlaSidebarFileSection'
import styles from '../sidebar.module.css'

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

	const results = useValue(
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

			return { pinnedFiles, todayFiles, yesterdayFiles, thisWeekFiles, thisMonthFiles, olderFiles }
		},
		[app, activeWorkspaceId]
	)

	const isSearching = useValue(
		'is searching',
		() => app.sidebarState.get().searchQuery.trim().length > 0,
		[app]
	)
	const hasResults = Object.values(results).some((group) => group.length > 0)

	return (
		<div
			data-drop-target-id={isHome ? homeWorkspaceId : `workspace:${activeWorkspaceId}`}
			data-workspace-id={activeWorkspaceId}
		>
			{results.pinnedFiles.length ? (
				<TlaSidebarFileSection
					iconLeft="pin"
					title={<F defaultMessage="Pinned" />}
					onePixelOfPaddingAtTheTop
				>
					{results.pinnedFiles.map((item, i) => (
						<TlaSidebarFileLink
							workspaceId={activeWorkspaceId}
							key={'pinned_' + item.fileId}
							item={item}
							testId={`tla-file-link-pinned-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			) : null}
			{results.todayFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Today" />}>
					{results.todayFiles.map((item, i) => (
						<TlaSidebarFileLink
							workspaceId={activeWorkspaceId}
							key={'today_' + item.fileId}
							item={item}
							testId={`tla-file-link-today-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			) : null}
			{results.yesterdayFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Yesterday" />}>
					{results.yesterdayFiles.map((item, i) => (
						<TlaSidebarFileLink
							workspaceId={activeWorkspaceId}
							key={'yesterday_' + item.fileId}
							item={item}
							testId={`tla-file-link-yesterday-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			) : null}
			{results.thisWeekFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="This week" />}>
					{results.thisWeekFiles.map((item, i) => (
						<TlaSidebarFileLink
							workspaceId={activeWorkspaceId}
							key={'this-week_' + item.fileId}
							item={item}
							testId={`tla-file-link-this-week-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			) : null}
			{results.thisMonthFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="This month" />}>
					{results.thisMonthFiles.map((item, i) => (
						<TlaSidebarFileLink
							workspaceId={activeWorkspaceId}
							key={'this-month_' + item.fileId}
							item={item}
							testId={`tla-file-link-this-month-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			) : null}
			{results.olderFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Older" />}>
					{results.olderFiles
						.sort((a, b) => b.date - a.date)
						.map((item, i) => (
							<TlaSidebarFileLink
								workspaceId={activeWorkspaceId}
								key={'older_' + item.fileId}
								item={item}
								testId={`tla-file-link-older-${i}`}
							/>
						))}
				</TlaSidebarFileSection>
			) : null}
			{isSearching && !hasResults ? (
				<div className={styles.sidebarSearchEmpty} data-testid="tla-sidebar-search-empty">
					<F defaultMessage="No files found" />
				</div>
			) : null}
		</div>
	)
}
