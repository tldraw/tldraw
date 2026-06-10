import { useValue } from 'tldraw'
import { useActiveGroupId } from '../../../hooks/useActiveGroupId'
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
 * the remaining files grouped by recency. There is no per-group expand/collapse.
 */
export function TlaSidebarRecentFilesNew() {
	const app = useApp()
	const activeGroupId = useActiveGroupId()
	const homeGroupId = app.getHomeGroupId()
	const isHome = activeGroupId === homeGroupId

	const group = useValue('active group', () => app.getGroupMembership(activeGroupId), [
		app,
		activeGroupId,
	])

	const results = useValue(
		'active group files',
		() => {
			const files = app.getGroupFilesSorted(activeGroupId)
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
		[app, activeGroupId]
	)

	const groupName = isHome ? <F defaultMessage="My files" /> : group?.group.name

	return (
		<div
			data-drop-target-id={isHome ? homeGroupId : `group:${activeGroupId}`}
			data-group-id={activeGroupId}
		>
			<div className={styles.sidebarActiveGroupTitle} data-testid="tla-active-workspace-name">
				{groupName}
			</div>
			{results.pinnedFiles.length ? (
				<TlaSidebarFileSection
					iconLeft="pin"
					title={<F defaultMessage="Pinned" />}
					onePixelOfPaddingAtTheTop
				>
					{results.pinnedFiles.map((item, i) => (
						<TlaSidebarFileLink
							groupId={activeGroupId}
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
							groupId={activeGroupId}
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
							groupId={activeGroupId}
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
							groupId={activeGroupId}
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
							groupId={activeGroupId}
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
								groupId={activeGroupId}
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
