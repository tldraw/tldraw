import { FairyHatColor } from '@tldraw/fairy-shared'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { shouldShowInFeed } from './FairyFeedView'

export interface FeedItemData {
	id: string
	agentName: string
	hat: string
	hatColor: FairyHatColor
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
	orchestratorAgent: FairyAgent | null
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

				// Prefer ircMessage over description for feed display
				const description =
					actionInfo.ircMessage ?? actionInfo.description ?? actionInfo.summary ?? ''

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
		// Create deterministic ID based on action properties for effective deduplication
		const actionId = `action-${agent.id}-${timestamp}-${description}`

		// Skip if we've already seen this action (deduplication)
		if (seenActionIds.has(actionId)) {
			continue
		}
		seenActionIds.add(actionId)

		items.push({
			id: actionId,
			agentName: agentConfig.name,
			hat: agentConfig.outfit?.hat ?? 'bald',
			hatColor: agentConfig.hatColor,
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
	// Check all agents for unseen items (global mode)
	for (const agent of agents) {
		const history = agent.chat.getHistory()
		for (const item of history) {
			if (item.type === 'action' && item.action.complete) {
				const actionType = item.action._type
				const actionInfo = agent.actions.getActionInfo(item.action)

				// Only count as unseen if it would actually appear in the feed
				// Use Date.now() fallback to match buildFeedItems behavior
				if (
					shouldShowInFeed(actionType, actionInfo) &&
					(item.timestamp ?? Date.now()) > lastSeenFeedTimestamp
				) {
					return true
				}
			}
		}
	}
	return false
}
