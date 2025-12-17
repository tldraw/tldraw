/**
 * Helper functions for fairy chart components
 */

import { AgentAction } from '@tldraw/fairy-shared'
import type { FairyAgent } from '../fairy-agent/FairyAgent'
import { CHART_RECREATION_THRESHOLD, getActionCategory } from '../fairy-shared-constants'
import type { FairyLineChart } from './FairyLineChart'

// ============================================================================
// CHART RECREATION LOGIC
// ============================================================================

/**
 * Determine if a chart should be recreated based on max value changes
 *
 * Only recreates if max value increased significantly to prevent infinite loops
 * while still updating when values grow
 */
export function shouldRecreateChart(
	existingChart: FairyLineChart | null,
	currentMax: number | undefined,
	previousMax: number | undefined,
	threshold: number = CHART_RECREATION_THRESHOLD
): boolean {
	if (!existingChart || currentMax === undefined || previousMax === undefined) {
		return false
	}
	// Only recreate if max value increased significantly (default: 25% increase)
	return currentMax > previousMax * threshold
}

// ============================================================================
// FAIRY ACTION COUNTING
// ============================================================================

/**
 * Count completed actions by category for a fairy agent
 *
 * @param agent - The fairy agent to count actions for
 * @returns A record mapping category names to action counts
 */
export function countActionsByCategory(agent: FairyAgent): Record<string, number> {
	return agent.chat
		.getHistory()
		.filter((item) => item.type === 'action' && item.action.complete)
		.reduce(
			(counts, item) => {
				const category = getActionCategory((item as { action: AgentAction }).action._type)
				counts[category] = (counts[category] || 0) + 1
				return counts
			},
			{} as Record<string, number>
		)
}

/**
 * Count total completed actions for a fairy agent
 */
export function countCompletedActions(agent: FairyAgent): number {
	return agent.chat.getHistory().filter((item) => item.type === 'action' && item.action.complete)
		.length
}

// ============================================================================
// NAME UTILITIES
// ============================================================================

/**
 * Extract first name from a full name, with fallback to full name
 *
 * @param fullName - The full name (e.g., "Alice Wonder")
 * @returns The first name (e.g., "Alice") or full name if no space exists
 */
export function getFirstName(fullName: string): string {
	const parts = fullName.split(' ')
	return parts[0] || fullName
}

// ============================================================================
// PROJECT HELPERS
// ============================================================================

/**
 * Check if a project is a duo project (orchestrator moves in duo mode)
 */
export function isDuoProject(project: { members: Array<{ role: string }> } | null): boolean {
	if (!project) return false
	return project.members.some((member) => member.role === 'duo-orchestrator')
}

/**
 * Filter agents to project members (always include all members)
 */
export function filterProjectAgents(
	agents: FairyAgent[],
	project: { members: Array<{ id: string }> } | null
): FairyAgent[] {
	if (!project) return []

	return agents.filter((agent) => {
		// Must be a project member
		const isMember = project.members.some((m) => m.id === agent.id)
		return isMember
	})
}
