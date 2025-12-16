/**
 * Heatmap Constants
 * Standalone configuration constants for heatmap visualization
 */

// Date constants
export const NO_OF_YEAR_MONTHS = 12
export const NO_OF_DAYS_IN_WEEK = 7
export const NO_OF_MILLIS = 1000
export const SEC_IN_DAY = 86400

export const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const

export const MONTH_NAMES_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const

export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
] as const

// Heatmap layout constants
export const HEATMAP_DISTRIBUTION_SIZE = 5 // 5 color intensity levels
export const HEATMAP_SQUARE_SIZE = 10 // 10px squares
export const HEATMAP_GUTTER_SIZE = 2 // 2px spacing between squares

export const COL_WIDTH = HEATMAP_SQUARE_SIZE + HEATMAP_GUTTER_SIZE // 12px
export const ROW_HEIGHT = COL_WIDTH // 12px

// Color schemes (5 colors from light to dark)
export const HEATMAP_COLORS_GREEN = [
	'#ebedf0', // Lightest (empty)
	'#c6e48b',
	'#7bc96f',
	'#239a3b',
	'#196127', // Darkest (most activity)
] as const

export const HEATMAP_COLORS_BLUE = ['#ebedf0', '#c0ddf9', '#73b3f3', '#3886e1', '#17459e'] as const

export const HEATMAP_COLORS_YELLOW = [
	'#ebedf0',
	'#fdf436',
	'#ffc700',
	'#ff9100',
	'#06001c',
] as const

// Default color scheme
export const DEFAULT_HEATMAP_COLORS = HEATMAP_COLORS_GREEN
