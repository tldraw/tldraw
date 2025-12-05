import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { shouldShowInFeed } from './FairyFeedView'

export interface FeedItemData {
	id: string
	agentName: string
	hat: string
	agentId: string
	timestamp: number
	description: string
	isOrchestrator?: boolean
}

/**
 * Build feed items from agents' chat history.
 * Filters actions based on shouldShowInFeed and deduplicates.
 */
export function buildFeedItems(
	agents: FairyAgent[],
	orchestratorAgent: FairyAgent | null,
	transformDescription: (actionType: string, description: string) => string
): FeedItemData[] {
	const items: FeedItemData[] = []

	// First pass: collect all actions with their raw data
	const rawActions: Array<{
		agent: FairyAgent
		agentConfig: any
		actionType: string
		actionInfo: any
		timestamp: number
		description: string
	}> = []

	for (const agent of agents) {
		const history = agent.chat.getHistory()
		const agentConfig = agent.getConfig()

		for (const historyItem of history) {
			if (historyItem.type === 'action' && historyItem.action.complete) {
				const actionType = historyItem.action._type
				const actionInfo = agent.actions.getActionInfo(historyItem.action)

				// Use shared helper to check if action should be shown
				if (!actionType || !shouldShowInFeed(actionType, actionInfo)) {
					continue
				}

				const rawDescription = actionInfo.description ?? actionInfo.summary ?? ''
				const description = transformDescription(actionType, rawDescription)

				rawActions.push({
					agent,
					agentConfig,
					actionType,
					actionInfo,
					timestamp: historyItem.timestamp ?? Date.now(),
					description,
				})
			}
		}
	}

	// Sort all actions chronologically
	rawActions.sort((a, b) => a.timestamp - b.timestamp)

	// Track seen action IDs to prevent duplicates
	const seenActionIds = new Set<string>()

	// Second pass: convert to feed items
	for (const { agent, agentConfig, timestamp, description } of rawActions) {
		const actionId = `action-${agent.id}-${timestamp}-${Math.random()}`

		// Skip if we've already seen this action (deduplication)
		if (seenActionIds.has(actionId)) {
			continue
		}
		seenActionIds.add(actionId)

		items.push({
			id: actionId,
			agentName: agentConfig.name,
			hat: agentConfig.outfit?.hat ?? 'bald',
			agentId: agent.id,
			isOrchestrator: agent.id === orchestratorAgent?.id,
			timestamp,
			description,
		})
	}

	// Sort items chronologically
	return items.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Check if there are any unseen feed items since a given timestamp.
 * This filters using the same logic as the feed view to ensure consistency.
 */
export function hasUnseenFeedItems(
	agents: FairyAgent[],
	orchestratorAgent: FairyAgent | null,
	lastSeenFeedTimestamp: number
): boolean {
	if (!orchestratorAgent) return false
	const project = orchestratorAgent.getProject()
	if (!project) return false

	// Check if any agent has actions newer than lastSeenFeedTimestamp
	// Use the same filtering logic as FairyFeedView to avoid false positives
	for (const agent of agents) {
		if (!project.members.some((m) => m.id === agent.id)) continue
		const history = agent.chat.getHistory()
		for (const item of history) {
			if (item.type === 'action' && item.action.complete) {
				const actionType = item.action._type
				const actionInfo = agent.actions.getActionInfo(item.action)

				// Only count as unseen if it would actually appear in the feed
				if (
					shouldShowInFeed(actionType, actionInfo) &&
					(item.timestamp ?? 0) > lastSeenFeedTimestamp
				) {
					return true
				}
			}
		}
	}
	return false
}
