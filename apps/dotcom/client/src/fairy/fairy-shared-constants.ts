/**
 * Shared constants for fairy charts and activity monitoring
 */

import { AgentAction, FairyHatColor } from '@tldraw/fairy-shared'

// ============================================================================
// COLOR MAPPINGS
// ============================================================================

/**
 * Map fairy hat colors to hex values for chart visualization
 */
export const HAT_COLOR_HEX: Record<FairyHatColor, string> = {
	pink: '#d946a0',
	purple: '#8b5cf6',
	peach: '#f97316',
	coral: '#f43f5e',
	teal: '#14b8a6',
	gold: '#eab308',
	rose: '#ec4899',
	green: '#22c55e',
	mint: '#2dd4bf',
	sky: '#0ea5e9',
	azure: '#06b6d4',
	periwinkle: '#818cf8',
}

export const ACTION_CATEGORY_KEYS = [
	'Creating',
	'Editing',
	'Planning',
	'Communicating',
	'Other',
] as const
export type AgentActionCategory = (typeof ACTION_CATEGORY_KEYS)[number]

/**
 * Map action type categories to colors
 */
export const CATEGORY_COLORS = {
	Creating: '#5f27cd',
	Editing: '#ee5a6f',
	Planning: '#00d2d3',
	Communicating: '#ff9f43',
	Other: '#888888',
} as const satisfies Record<AgentActionCategory, string>

// ============================================================================
// ACTION TYPE CATEGORIZATION
// ============================================================================

/**
 * Map action types to three high-level categories for chart visualization
 *
 * Categories:
 * - Canvas: All shape/canvas manipulation actions
 * - Communication: Messaging, thinking, and planning actions
 * - Project: Project/task management and navigation actions
 */
export const ACTION_TYPE_CATEGORIES: Record<AgentAction['_type'], AgentActionCategory> = {
	create: 'Creating',
	pen: 'Creating',
	'create-page': 'Creating',

	update: 'Editing',
	delete: 'Editing',
	label: 'Editing',
	move: 'Editing',
	place: 'Editing',
	offset: 'Editing',
	align: 'Editing',
	distribute: 'Editing',
	stack: 'Editing',
	'bring-to-front': 'Editing',
	'send-to-back': 'Editing',
	resize: 'Editing',
	rotate: 'Editing',

	think: 'Planning',
	review: 'Planning',
	'move-position': 'Planning',
	'fly-to-bounds': 'Planning',
	'change-page': 'Planning',
	'start-project': 'Planning',
	'start-duo-project': 'Planning',

	'create-project-task': 'Planning',
	'create-duo-task': 'Planning',
	'create-task': 'Planning',
	'delete-project-task': 'Planning',
	'delete-personal-todo-items': 'Planning',
	'start-task': 'Planning',
	'start-duo-task': 'Planning',

	'await-tasks-completion': 'Planning',
	'await-duo-tasks-completion': 'Planning',

	message: 'Communicating',
	'upsert-personal-todo-item': 'Communicating',
	'end-project': 'Communicating',
	'end-duo-project': 'Communicating',
	'abort-project': 'Communicating',
	'abort-duo-project': 'Communicating',

	'direct-to-start-project-task': 'Communicating',
	'direct-to-start-duo-task': 'Communicating',
	'mark-my-task-done': 'Communicating',
	'mark-task-done': 'Communicating',
	'mark-duo-task-done': 'Communicating',
	'activate-agent': 'Communicating',
	'claim-todo-item': 'Communicating',

	unknown: 'Other',
}

/**
 * Get the category for an action type, defaulting to 'Other' if unknown
 */
export function getActionCategory(actionType: AgentAction['_type']): AgentActionCategory {
	return ACTION_TYPE_CATEGORIES[actionType] || 'Other'
}

// ============================================================================
// CHART CONFIGURATION
// ============================================================================

/**
 * Y-axis padding multiplier - adds 20% padding above max value to prevent
 * lines/bars from touching the top of the chart
 */
export const Y_AXIS_PADDING_MULTIPLIER = 1.2

/**
 * Chart recreation threshold - only recreate the chart when max value
 * increases by 25% or more to prevent infinite loops from tiny fluctuations
 */
export const CHART_RECREATION_THRESHOLD = 1.25

/**
 * Default chart colors
 */
export const DEFAULT_CHART_COLORS = [
	'#5f27cd',
	'#00d2d3',
	'#ff9f43',
	'#ee5a6f',
	'#10ac84',
	'#222f3e',
]
