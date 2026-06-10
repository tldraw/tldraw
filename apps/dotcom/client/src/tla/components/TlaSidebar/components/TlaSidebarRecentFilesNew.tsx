import { useValue } from 'tldraw'
import { useActiveWorkspaceId } from '../../../hooks/useActiveWorkspaceId'
import { useApp } from '../../../hooks/useAppState'
import { getRelevantDates } from '../../../utils/dates'
import { F } from '../../../utils/i18n'
import { ReorderCursor } from './ReorderCursor'
import { RecentFile } from './sidebar-shared'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarFileSection } from './TlaSidebarFileSection'
import styles from '../sidebar.module.css'

/**
 * The scrollable lower region of the sidebar: the files of whichever space is
 * currently active (derived from the open file). Pinned files come first, then
 * the remaining files grouped by recency. There is no per-workspace expand/collapse.
 */
export function TlaSidebarRecentFilesNew() {
	const app = useApp()
	const activeWorkspaceId = useActiveWorkspaceId()
	const homeWorkspaceId = app.getHomeWorkspaceId()
	const isHome = activeWorkspaceId === homeWorkspaceId

	const membership = useValue(
		'active workspace',
		() => app.getWorkspaceMembership(activeWorkspaceId),
		[app, activeWorkspaceId]
	)

	const results = useValue(
		'active workspace files',
		() => {
			const files = app.getWorkspaceFilesSorted(activeWorkspaceId)
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

	const workspaceName = isHome ? <F defaultMessage="My files" /> : membership?.group.name

	return (
		<div
			data-drop-target-id={isHome ? homeWorkspaceId : `workspace:${activeWorkspaceId}`}
			data-workspace-id={activeWorkspaceId}
		>
			<div className={styles.sidebarActiveWorkspaceTitle} data-testid="tla-active-workspace-name">
				{workspaceName}
			</div>
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
			{/* Global drag cursor for file reordering */}
			<ReorderCursor />
		</div>
	)
}
