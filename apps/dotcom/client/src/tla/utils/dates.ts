import { FormatDateOptions } from '../utils/i18n'

/**
 * Extract date parts from ISO string and create local date (ignore timezone).
 * Used for date-only values where we don't want timezone conversion.
 */
export function parseDateOnly(dateStr: string): Date {
	const isoDate = new Date(dateStr)
	return new Date(isoDate.getUTCFullYear(), isoDate.getUTCMonth(), isoDate.getUTCDate())
}

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
