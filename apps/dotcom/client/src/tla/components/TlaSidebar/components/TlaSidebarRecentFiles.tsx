import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { getRelevantDates } from '../../../utils/dates'
import { F } from '../../../utils/i18n'
import { TlaSidebarFileSection } from './TlaSidebarFileSection'
import { RecentFile } from './sidebar-shared'

export function TlaSidebarRecentFiles() {
	const app = useApp()
	const results = useValue(
		'recent user files',
		() => {
			return app.getUserRecentFiles()
		},
		[app]
	)

	if (!results) throw Error('Could not get files')

	const { today, yesterday, thisWeek, thisMonth } = getRelevantDates()

	// split the files into today, yesterday, this week, this month, and then by month
	const todayFiles: RecentFile[] = []
	const yesterdayFiles: RecentFile[] = []
	const thisWeekFiles: RecentFile[] = []
	const thisMonthFiles: RecentFile[] = []

	// todo: order by month
	const olderFiles: RecentFile[] = []

	for (const item of results) {
		const { date } = item
		if (date >= today) {
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
	const sortedOlderFiles = olderFiles.sort((a, b) => b.date - a.date)

	return (
		<>
			{todayFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Today" />} items={todayFiles} />
			) : null}
			{yesterdayFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Yesterday" />} items={yesterdayFiles} />
			) : null}
			{thisWeekFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="This week" />} items={thisWeekFiles} />
			) : null}
			{thisMonthFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="This month" />} items={thisMonthFiles} />
			) : null}
			{olderFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Older" />} items={sortedOlderFiles} />
			) : null}
		</>
	)
}
