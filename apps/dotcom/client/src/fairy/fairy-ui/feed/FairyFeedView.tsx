import {
	AgentAction,
	AgentActionInfo,
	ChatHistoryActionItem,
	Streaming,
	ThreadIndentIcon,
} from '@tldraw/fairy-shared'
import { ReactNode, useMemo } from 'react'
import { RecordsDiff, TLRecord, useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { FairyMiniAvatar } from '../../fairy-sprite/sprites/Avatar'

// Whitelist of action types shown in the feed
const FEED_ACTION_WHITELIST = new Set([
	// Shape creation/deletion (visual changes)
	'create',
	'delete',
	'pen',
	// Project milestones
	'start-project',
	'start-duo-project',
	'end-project',
	'end-duo-project',
	'abort-project',
	'abort-duo-project',
	// Task creation
	'create-project-task',
	'create-duo-task',
	// Task assignments (delegations)
	'direct-to-start-project-task',
	'direct-to-start-duo-task',
	// Task starts
	'start-task',
	'start-duo-task',
	// Task completions
	'mark-my-task-done',
	'mark-duo-task-done',
	'mark-task-done',
	// Messages/delegations
	'message',
])

/** Check if an action should be shown in the feed */
export function shouldShowInFeed(
	actionType: string | undefined,
	actionInfo: { description?: string | null; summary?: string | null }
): boolean {
	if (!actionType) return false
	const hasInfo = actionInfo.description || actionInfo.summary
	return FEED_ACTION_WHITELIST.has(actionType) && !!hasInfo
}

export interface FairyFeedViewItem {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

interface FeedItem {
	id: string
	actionType: string
	agent: FairyAgent
	agentName: string
	timestamp: number
	type: 'action'
	description: string
	diff: RecordsDiff<TLRecord>
	actionInfo: AgentActionInfo
	action: Streaming<AgentAction>
	taskId?: string
	threadId?: string
	isThreadRoot?: boolean
}

interface FairyFeedItemProps {
	agent: FairyAgent
	agentName: string
	timestamp: number
	description: string
}
const FairyFeedItem = ({ agent, agentName, timestamp, description }: FairyFeedItemProps) => {
	return (
		<div className="fairy-feed-view-item">
			<div className="fairy-feed-avatar">
				<FairyMiniAvatar agent={agent} />
			</div>
			<div>
				<div className="fairy-feed-view-item-header">
					<div className="fairy-feed-view-profile">
						<p className="fairy-feed-view-profile-name">{agentName}</p>
					</div>
					<div className="fairy-feed-view-metadata">
						<p className="fairy-feed-view-metadata-item-separator">•</p>
						<p className="fairy-feed-view-timestamp">{formatTimeAgo(timestamp)}</p>
					</div>
				</div>
				<p className="fairy-feed-description">{description}</p>
			</div>
		</div>
	)
}

interface FairyFeedThreadRootProps {
	agent: FairyAgent
	agentName: string
	timestamp: number
	description: string
	children?: ReactNode
}
const FairyFeedThreadRoot = ({
	agent,
	agentName,
	timestamp,
	description,
	children,
}: FairyFeedThreadRootProps) => {
	return (
		<div className="fairy-feed-thread-view">
			<div className="fairy-thread-indent-icon">
				<ThreadIndentIcon />
			</div>
			<div className="fairy-feed-thread-content">
				<FairyFeedItem
					agent={agent}
					agentName={agentName}
					timestamp={timestamp}
					description={description}
				/>
				{children}
			</div>
		</div>
	)
}

const FairyFeedThreadReply = ({ agent, agentName, timestamp, description }: FairyFeedItemProps) => {
	return (
		<FairyFeedItem
			agent={agent}
			agentName={agentName}
			timestamp={timestamp}
			description={description}
		/>
	)
}

export function FairyFeedView({ orchestratorAgent, agents }: FairyFeedViewItem) {
	const fairyApp = useFairyApp()
	const project = useValue('project', () => orchestratorAgent && orchestratorAgent.getProject(), [
		orchestratorAgent,
	])

	const feedItems = useValue(
		'feed-items',
		() => {
			if (!project || !fairyApp) return []

			const projectAgents = agents.filter((agent) => project.members.some((m) => m.id === agent.id))
			const items: FeedItem[] = []
			// Track active task per agent as we process history chronologically
			const activeTaskPerAgent = new Map<string, string | undefined>()

			// First pass: collect all actions with their raw data
			const rawActions: Array<{
				agent: FairyAgent
				agentConfig: any
				historyItem: ChatHistoryActionItem
				timestamp: number
			}> = []

			for (const agent of projectAgents) {
				const history = agent.chat.getHistory()
				const agentConfig = agent.getConfig()

				for (const historyItem of history) {
					if (historyItem.type === 'action' && historyItem.action.complete) {
						const actionItem = historyItem as ChatHistoryActionItem
						rawActions.push({
							agent,
							agentConfig,
							historyItem: actionItem,
							timestamp: actionItem.timestamp ?? Date.now(),
						})
					}
				}
			}

			// Sort all actions chronologically
			rawActions.sort((a, b) => a.timestamp - b.timestamp)

			// Track seen action IDs to prevent duplicates
			const seenActionIds = new Set<string>()

			// Second pass: process actions chronologically and track active tasks
			for (const { agent, agentConfig, historyItem } of rawActions) {
				const actionItem = historyItem
				const actionType = actionItem.action._type
				const actionInfo = agent.actions.getActionInfo(actionItem.action)

				// Generate a unique ID for this action
				const actionId =
					actionItem.id ||
					`action-${agent.id}-${actionItem.timestamp ?? Date.now()}-${Math.random()}`

				// Skip if we've already seen this action (deduplication)
				if (seenActionIds.has(actionId)) {
					continue
				}
				seenActionIds.add(actionId)

				// Use shared helper to check if action should be shown
				if (!actionType || !shouldShowInFeed(actionType, actionInfo)) {
					continue
				}

				const rawDescription = actionInfo.description ?? actionInfo.summary ?? ''
				const description = toFeedDescription(actionType, rawDescription)

				// Extract taskId for threading (with active task tracking)
				let taskId: string | undefined
				if (
					actionType === 'create-project-task' ||
					actionType === 'create-duo-task' ||
					actionType === 'direct-to-start-project-task' ||
					actionType === 'direct-to-start-duo-task' ||
					actionType === 'start-task' ||
					actionType === 'start-duo-task'
				) {
					taskId = actionItem.action.taskId
					// Track that this agent is now working on this task
					// (track for all task-related actions, not just start-task)
					if (taskId) {
						activeTaskPerAgent.set(agent.id, taskId)
					}
				} else if (
					actionType === 'mark-task-done' ||
					actionType === 'mark-duo-task-done' ||
					actionType === 'mark-my-task-done'
				) {
					// Infer taskId from tracked active task
					taskId = activeTaskPerAgent.get(agent.id)
					// Clear active task after completion
					if (taskId) {
						activeTaskPerAgent.delete(agent.id)
					}
				}

				items.push({
					id: actionId,
					actionType,
					agent,
					agentName: agentConfig.name,
					timestamp: actionItem.timestamp ?? Date.now(),
					type: 'action',
					description,
					diff: actionItem.diff,
					actionInfo,
					action: actionItem.action,
					taskId,
				})
			}

			// Build thread groups and structure
			const threadGroups = buildThreadGroups(items)
			const threadedItems = buildThreadStructure(items, threadGroups)

			return threadedItems
		},
		[project, fairyApp, agents]
	)

	// Group items for rendering: collect thread roots with their replies
	const renderItems = useMemo(() => {
		const result: Array<{ item: FeedItem; replies: FeedItem[] }> = []
		const processedIds = new Set<string>()

		for (const item of feedItems) {
			if (processedIds.has(item.id)) continue

			if (item.isThreadRoot) {
				// Collect all replies for this thread root
				const replies = feedItems.filter((i) => i.threadId === item.id)
				result.push({ item, replies })
				processedIds.add(item.id)
				replies.forEach((r) => processedIds.add(r.id))
			} else if (!item.threadId) {
				// Regular item (not a thread root, not a reply)
				result.push({ item, replies: [] })
				processedIds.add(item.id)
			}
		}

		return result
	}, [feedItems])

	if (renderItems.length === 0) {
		return (
			<div className="fairy-feed-view">
				<div className="fairy-feed-view-empty">
					<p>No activity yet</p>
				</div>
			</div>
		)
	}

	return (
		<div className="fairy-feed-view">
			{renderItems.map(({ item, replies }, index) => {
				const isLastItem = index === renderItems.length - 1

				return (
					<div className="fairy-feed-view-items" key={item.id}>
						{replies.length > 0 ? (
							// Thread root with replies
							<>
								<FairyFeedThreadRoot
									agent={item.agent}
									agentName={item.agentName}
									timestamp={item.timestamp}
									description={item.description}
								/>
								{replies.map((reply) => (
									<FairyFeedThreadReply
										key={reply.id}
										agent={reply.agent}
										agentName={reply.agentName}
										timestamp={reply.timestamp}
										description={reply.description}
									/>
								))}
							</>
						) : (
							// Regular item (no thread)
							<FairyFeedItem
								agent={item.agent}
								agentName={item.agentName}
								timestamp={item.timestamp}
								description={item.description}
							/>
						)}
						{!isLastItem && <hr className="fairy-feed-view-item-separator" />}
					</div>
				)
			})}
		</div>
	)
}

/**
 * Group feed items by their taskId.
 */
function buildThreadGroups(items: FeedItem[]): Map<string, FeedItem[]> {
	const threadGroups = new Map<string, FeedItem[]>()

	for (const item of items) {
		if (item.taskId) {
			if (!threadGroups.has(item.taskId)) {
				threadGroups.set(item.taskId, [])
			}
			threadGroups.get(item.taskId)!.push(item)
		}
	}

	return threadGroups
}

/**
 * Build thread structure by identifying roots and attaching thread metadata.
 * Groups task-related actions together and reorders the feed so thread replies
 * appear directly after their root item.
 */
function buildThreadStructure(
	items: FeedItem[],
	threadGroups: Map<string, FeedItem[]>
): FeedItem[] {
	// Sort all items chronologically first
	const sortedItems = [...items].sort((a, b) => a.timestamp - b.timestamp)

	// First, mark thread roots and replies based on taskId grouping
	for (const [_taskId, threadItems] of threadGroups.entries()) {
		// Skip threads with only one item (no need to thread single items)
		if (threadItems.length < 2) {
			continue
		}

		// Sort thread items chronologically
		const sortedThreadItems = [...threadItems].sort((a, b) => a.timestamp - b.timestamp)

		// The first item chronologically becomes the thread root
		const rootItem = sortedThreadItems[0]
		const replies = sortedThreadItems.slice(1)

		// Mark root and attach threadId to all reply items in the thread
		rootItem.isThreadRoot = true
		for (const reply of replies) {
			reply.threadId = rootItem.id
		}
	}

	// Now reorder items so thread replies appear directly after their root
	const result: FeedItem[] = []
	const processedIds = new Set<string>()

	for (const item of sortedItems) {
		// Skip if already processed (as part of a thread)
		if (processedIds.has(item.id)) {
			continue
		}

		// Add this item
		result.push(item)
		processedIds.add(item.id)

		// If this is a thread root, immediately add all its replies
		if (item.isThreadRoot) {
			// Find all replies to this thread root and add them in chronological order
			const replies = sortedItems
				.filter((i) => i.threadId === item.id && !processedIds.has(i.id))
				.sort((a, b) => a.timestamp - b.timestamp)

			for (const reply of replies) {
				result.push(reply)
				processedIds.add(reply.id)
			}
		}
	}

	return result
}

/**
 * Transform action descriptions into past tense suitable for a live feed.
 * Task-related actions already have good past-tense descriptions from their utils.
 * This mainly handles shape creation/deletion which use LLM-generated intents.
 */
function toFeedDescription(actionType: string, description: string): string {
	if (!description) return ''

	// Shape creation/deletion actions use LLM-generated intents - prefix with past tense
	if (actionType === 'create' || actionType === 'pen') {
		return `Drew: ${description}`
	}
	if (actionType === 'delete') {
		return `Deleted: ${description}`
	}

	// All other actions (tasks, projects, etc.) already have past-tense descriptions
	return description
}

function formatTimeAgo(timestamp: number): string {
	const now = Date.now()
	const diffMs = now - timestamp
	const diffMinutes = Math.floor(diffMs / 60000)

	if (diffMinutes < 1) {
		return 'just now'
	}

	if (diffMinutes < 60) {
		return `${diffMinutes}m ago`
	}

	const diffHours = Math.floor(diffMinutes / 60)
	if (diffHours < 24) {
		return `${diffHours}h ago`
	}

	const diffDays = Math.floor(diffHours / 24)
	return `${diffDays}d ago`
}
