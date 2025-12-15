/**
 * Shared constants for fairy charts and activity monitoring
 */

import { FairyHatColor } from '@tldraw/fairy-shared'

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

/**
 * Map action type categories to colors
 */
export const CATEGORY_COLORS: Record<string, string> = {
	Canvas: '#5f27cd',
	Communication: '#00d2d3',
	Project: '#ff9f43',
	Other: '#888888',
}

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
export const ACTION_TYPE_CATEGORIES: Record<string, string> = {
	// Canvas - all shape/canvas manipulation
	create: 'Canvas',
	update: 'Canvas',
	delete: 'Canvas',
	label: 'Canvas',
	move: 'Canvas',
	place: 'Canvas',
	offset: 'Canvas',
	align: 'Canvas',
	distribute: 'Canvas',
	stack: 'Canvas',
	'bring-to-front': 'Canvas',
	'send-to-back': 'Canvas',
	resize: 'Canvas',
	rotate: 'Canvas',
	pen: 'Canvas',

	// Communication - messaging, thinking, planning
	message: 'Communication',
	think: 'Communication',
	review: 'Communication',
	'upsert-personal-todo-item': 'Communication',
	'delete-personal-todo-items': 'Communication',

	// Project - project/task management and navigation
	'start-project': 'Project',
	'start-duo-project': 'Project',
	'end-project': 'Project',
	'end-duo-project': 'Project',
	'abort-project': 'Project',
	'abort-duo-project': 'Project',
	'create-project-task': 'Project',
	'create-duo-task': 'Project',
	'create-task': 'Project',
	'delete-project-task': 'Project',
	'direct-to-start-project-task': 'Project',
	'direct-to-start-duo-task': 'Project',
	'start-task': 'Project',
	'start-duo-task': 'Project',
	'mark-my-task-done': 'Project',
	'mark-task-done': 'Project',
	'mark-duo-task-done': 'Project',
	'await-tasks-completion': 'Project',
	'await-duo-tasks-completion': 'Project',
	'activate-agent': 'Project',
	'enter-orchestration-mode': 'Project',
	'claim-todo-item': 'Project',
	'move-position': 'Project',
	'fly-to-bounds': 'Project',
	'change-page': 'Project',
	'create-page': 'Project',
}

/**
 * Get the category for an action type, defaulting to 'Other' if unknown
 */
export function getActionCategory(actionType: string): string {
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
