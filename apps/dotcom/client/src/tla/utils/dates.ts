import { FormatDateOptions } from '../utils/i18n'

export function getRelevantDates() {
	const now = new Date()

	return {
		today: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
		yesterday: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime(),
		thisWeek: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime(),
		thisMonth: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
		thisYear: new Date(now.getFullYear(), 0, 1).getTime(),
	}
}

export function getDateFormat(date: Date): FormatDateOptions {
	const { yesterday, thisMonth, thisYear } = getRelevantDates()
	const d = date.getTime()

	if (d >= yesterday) {
		return {
			weekday: 'short',
			hour: 'numeric',
			minute: 'numeric',
		}
	} else if (d >= thisMonth) {
		return {
			month: 'short',
			weekday: 'short',
			day: 'numeric',
			hour: 'numeric',
		}
	} else if (d >= thisYear) {
		return {
			month: 'short',
			weekday: 'short',
			day: 'numeric',
			hour: 'numeric',
		}
	}
	return {
		year: 'numeric',
		month: 'short',
		weekday: 'short',
		day: 'numeric',
	}
}
