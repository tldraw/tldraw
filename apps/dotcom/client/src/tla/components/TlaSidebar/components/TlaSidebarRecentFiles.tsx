import { Fragment } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { getRelevantDates } from '../../../utils/dates'
import { F } from '../../../utils/i18n'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarFileSection } from './TlaSidebarFileSection'
import { RecentFile } from './sidebar-shared'

export function TlaSidebarRecentFiles() {
	const app = useApp()

	const results = useValue(
		'recent user files',
		() => {
			const recentFiles = app.getUserRecentFiles()
			if (!recentFiles) return null

			const { today, yesterday, thisWeek, thisMonth } = getRelevantDates()

			const pinnedFiles: RecentFile[] = []

			// split the files into today, yesterday, this week, this month, and then by month
			const todayFiles: RecentFile[] = []
			const yesterdayFiles: RecentFile[] = []
			const thisWeekFiles: RecentFile[] = []
			const thisMonthFiles: RecentFile[] = []

			// todo: order by month
			const olderFiles: RecentFile[] = []

			for (const item of recentFiles) {
				const { date, isPinned } = item
				if (isPinned) {
					pinnedFiles.push(item)
				} else if (date >= today) {
					todayFiles.push(item)
				} else if (date >= yesterday) {
					yesterdayFiles.push(item)
				} else if (date >= thisWeek) {
					thisWeekFiles.push(item)
				} else if (date >= thisMonth) {
					thisMonthFiles.push(item)
				} else {
					olderFiles.push(item)
				}
			}

			return {
				pinnedFiles,
				todayFiles,
				yesterdayFiles,
				thisWeekFiles,
				thisMonthFiles,
				olderFiles,
			}
		},
		[app]
	)

	if (!results) throw Error('Could not get files')

	return (
		<Fragment>
			{results.pinnedFiles.length ? (
				<TlaSidebarFileSection
					iconLeft="pin"
					title={<F defaultMessage="Pinned" />}
					onePixelOfPaddingAtTheTop
				>
					{results.pinnedFiles.map((item, i) => (
						<TlaSidebarFileLink
							key={'file_link_pinned_' + item.fileId}
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
							key={'file_link_today_' + item.fileId}
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
							key={'file_link_yesterday_' + item.fileId}
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
							key={'file_link_this-week_' + item.fileId}
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
							key={'file_link_this-month_' + item.fileId}
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
								key={'file_link_older' + item.fileId}
								item={item}
								testId={`tla-file-link-older-${i}`}
							/>
						))}
				</TlaSidebarFileSection>
			) : null}
		</Fragment>
	)
}
