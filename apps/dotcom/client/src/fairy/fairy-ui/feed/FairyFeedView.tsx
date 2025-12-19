import { FairyHatColor } from '@tldraw/fairy-shared'
import { memo, useLayoutEffect, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { FairyActionRateChart } from '../../fairy-chart/FairyActionRateChart'
import { getIRCNameForFairy } from '../../fairy-helpers/getIRCNameForFairy'
import { buildFeedItems } from './feedUtils'

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
	showActivityMonitor?: boolean
}

interface FeedItem {
	id: string
	agentName: string
	hat: string
	hatColor: FairyHatColor
	agentId: string
	timestamp: number
	description: string
	isOrchestrator?: boolean
}

const FairyFeedIRCLine = memo(
	({ agentName, hatColor, agentId, timestamp, description, isOrchestrator = false }: FeedItem) => {
		return (
			<div className="fairy-feed-irc-line">
				<span className="fairy-feed-irc-time">[{formatTime(timestamp)}]</span>
				<div className="fairy-feed-irc-name-container">
					<span
						className="fairy-feed-irc-name"
						style={{ color: `var(--tl-color-fairy-${hatColor})` }}
					>
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
			prev.hatColor === next.hatColor &&
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
	const previousItemCountRef = useRef(0)

	const feedItems = useValue(
		'feed-items',
		() => {
			if (!fairyApp) return []
			const allItems = buildFeedItems(agents, orchestratorAgent)
			// Keep only last 1000 items for UI performance
			return allItems.slice(-1000)
		},
		[fairyApp, agents, orchestratorAgent]
	)

	// Small threshold to account for sub-pixel rounding when determining if user is "at bottom"
	const SCROLL_BOTTOM_THRESHOLD = 10

	const getScrollDistanceFromBottom = () => {
		if (!historyRef.current) return 0
		return (
			historyRef.current.scrollHeight -
			historyRef.current.scrollTop -
			historyRef.current.clientHeight
		)
	}

	useLayoutEffect(() => {
		if (!historyRef.current) return

		const currentItemCount = feedItems.length
		const isNewItemAdded = currentItemCount > previousItemCountRef.current
		previousItemCountRef.current = currentItemCount

		// Only auto-scroll when new items are added AND user was at (or near) the bottom
		const wasAtBottom = previousScrollDistanceFromBottomRef.current <= SCROLL_BOTTOM_THRESHOLD
		if (isNewItemAdded && wasAtBottom) {
			historyRef.current.scrollTo(0, historyRef.current.scrollHeight)
			previousScrollDistanceFromBottomRef.current = 0
		}
	}, [feedItems])

	// Keep track of the user's scroll position relative to the bottom
	const handleScroll = () => {
		previousScrollDistanceFromBottomRef.current = getScrollDistanceFromBottom()
	}

	if (feedItems.length === 0) {
		return (
			<>
				<div className="fairy-feed-view-empty">
					<p>No fairy activity yet...</p>
				</div>
			</>
		)
	}

	return (
		<>
			<FairyActionRateChart agents={agents} />
			<div className="fairy-feed-view fairy-feed-irc" ref={historyRef} onScroll={handleScroll}>
				{feedItems.map((item) => (
					<FairyFeedIRCLine key={item.id} {...item} isOrchestrator={item.isOrchestrator} />
				))}
			</div>
		</>
	)
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
