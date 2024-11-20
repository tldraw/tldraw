import { FormatDateOptions } from 'react-intl'

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

/**
 * Returns the date format options based on the given date.
 * If the date is within the last week, it returns a format with weekday, hour, and minute..
 * Otherwise, it returns a format with month, weekday, day, and hour.
 *
 * @param {Date} date - The date to format.
 * @returns {FormatDateOptions} The date format options.
 */
export function getDateFormat(date: Date): FormatDateOptions {
	const { yesterday, thisMonth, thisYear } = getRelevantDates()
	const d = date.getTime()

	if (d >= yesterday) {
		return {
			weekday: 'long',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
		}
	} else if (d >= thisMonth) {
		return {
			month: 'short',
			weekday: 'long',
			day: 'numeric',
			hour: 'numeric',
		}
	} else if (d >= thisYear) {
		return {
			month: 'short',
			weekday: 'long',
			day: 'numeric',
			hour: 'numeric',
		}
	}
	return {
		month: 'short',
		weekday: 'long',
		day: 'numeric',
		year: 'numeric',
	}
}
