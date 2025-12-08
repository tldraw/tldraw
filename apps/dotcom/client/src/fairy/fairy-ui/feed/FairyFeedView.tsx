import { memo, useLayoutEffect, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { getIRCNameForFairy } from '../../fairy-helpers/getIRCNameForFairy'
import { buildFeedItems } from './feedUtils'

/** Saturated IRC colors for consistent unique colors per agent */
const IRC_COLORS = [
	'var(--irc-color-pink)',
	'var(--irc-color-purple)',
	'var(--irc-color-peach)',
	'var(--irc-color-coral)',
	'var(--irc-color-teal)',
	'var(--irc-color-gold)',
	'var(--irc-color-rose)',
	'var(--irc-color-green)',
]

function getIRCColorForAgent(agentId: string): string {
	// Use agent ID to deterministically assign a color
	let hash = 0
	for (let i = 0; i < agentId.length; i++) {
		hash = (hash << 5) - hash + agentId.charCodeAt(i)
		hash = hash & hash // Convert to 32-bit integer
	}
	const colorIndex = Math.abs(hash) % IRC_COLORS.length
	return IRC_COLORS[colorIndex]
}

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
	agentName: string
	hat: string
	agentId: string
	timestamp: number
	description: string
	isOrchestrator?: boolean
}

const FairyFeedIRCLine = memo(
	({ agentName, agentId, timestamp, description, isOrchestrator = false }: FeedItem) => {
		return (
			<div className="fairy-feed-irc-line">
				<span className="fairy-feed-irc-time">[{formatTime(timestamp)}]</span>
				<div className="fairy-feed-irc-name-container">
					<span className="fairy-feed-irc-name" style={{ color: getIRCColorForAgent(agentId) }}>
						{`<${isOrchestrator ? '@' : ''}${formatShortName(agentName, agentId)}>`}
					</span>
				</div>
				<span className="fairy-feed-irc-message">{description}</span>
			</div>
		)
	},
	(prev, next) => {
		// Custom equality check - only re-render if props actually change
		return (
			prev.id === next.id &&
			prev.agentName === next.agentName &&
			prev.agentId === next.agentId &&
			prev.timestamp === next.timestamp &&
			prev.description === next.description &&
			prev.isOrchestrator === next.isOrchestrator
		)
	}
)

export function FairyFeedView({ orchestratorAgent, agents }: FairyFeedViewItem) {
	const fairyApp = useFairyApp()
	const historyRef = useRef<HTMLDivElement>(null)
	const previousScrollDistanceFromBottomRef = useRef(0)

	const project = useValue('project', () => orchestratorAgent && orchestratorAgent.getProject(), [
		orchestratorAgent,
	])

	const feedItems = useValue(
		'feed-items',
		() => {
			if (!project || !fairyApp) return []

			const projectAgents = agents.filter((agent) => project.members.some((m) => m.id === agent.id))
			return buildFeedItems(projectAgents, orchestratorAgent, toFeedDescription)
		},
		[project, fairyApp, agents, orchestratorAgent]
	)

	useLayoutEffect(() => {
		if (!historyRef.current) return

		// If a new prompt is submitted by the user, scroll to the bottom
		const lastItem = feedItems.at(-1)
		if (lastItem) {
			historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
			previousScrollDistanceFromBottomRef.current = 0
			return
		}

		// If the user is scrolled to the bottom, keep them there while new actions appear
		if (previousScrollDistanceFromBottomRef.current <= 0) {
			const scrollDistanceFromBottom =
				historyRef.current.scrollHeight -
				historyRef.current.scrollTop -
				historyRef.current.clientHeight

			if (scrollDistanceFromBottom > 0) {
				historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
			}
		}
	}, [historyRef, feedItems])

	// Keep track of the user's scroll position
	const handleScroll = () => {
		if (!historyRef.current) return
		const scrollDistanceFromBottom =
			historyRef.current.scrollHeight -
			historyRef.current.scrollTop -
			historyRef.current.clientHeight

		previousScrollDistanceFromBottomRef.current = scrollDistanceFromBottom
	}

	if (feedItems.length === 0) {
		return (
			<div className="fairy-feed-view-empty">
				<p>Planning project...</p>
			</div>
		)
	}

	return (
		<div className="fairy-feed-view fairy-feed-irc" ref={historyRef} onScroll={handleScroll}>
			{feedItems.map((item) => (
				<FairyFeedIRCLine key={item.id} {...item} isOrchestrator={item.isOrchestrator} />
			))}
		</div>
	)
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

function formatTime(timestamp: number): string {
	const date = new Date(timestamp)
	const hours = date.getHours().toString().padStart(2, '0')
	const minutes = date.getMinutes().toString().padStart(2, '0')
	return `${hours}:${minutes}`
}

/** Format name as IRC-style screen name (e.g., "xXSteveXx", "Alice_99") */
function formatShortName(name: string, agentId: string): string {
	return getIRCNameForFairy(name, agentId)
}
