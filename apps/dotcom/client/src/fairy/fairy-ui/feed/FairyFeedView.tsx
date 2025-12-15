import { FairyHatColor } from '@tldraw/fairy-shared'
import { memo, useLayoutEffect, useRef, useState } from 'react'
import { TldrawUiButton, TldrawUiButtonIcon, useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { useFairyApp } from '../../fairy-app/FairyAppProvider'
import { FairyActionsByTypeChart } from '../../fairy-chart/FairyActionsByTypeChart'
import { FairyActionsChart } from '../../fairy-chart/FairyActionsChart'
import { FairyVelocityChart } from '../../fairy-chart/FairyVelocityChart'
import { getIRCNameForFairy } from '../../fairy-helpers/getIRCNameForFairy'
import { buildFeedItems } from './feedUtils'

type ChartType = 'velocity' | 'actions' | 'actions-by-type'

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

const CHART_ORDER: ChartType[] = ['velocity', 'actions', 'actions-by-type']

/** Chart carousel component for switching between different chart views */
function ChartCarousel({
	orchestratorAgent,
	agents,
}: {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}) {
	const [activeChart, setActiveChart] = useState<ChartType>('velocity')

	const cycle = (direction: 1 | -1) => {
		setActiveChart((prev) => {
			const currentIndex = CHART_ORDER.indexOf(prev)
			const nextIndex = (currentIndex + direction + CHART_ORDER.length) % CHART_ORDER.length
			return CHART_ORDER[nextIndex]
		})
	}

	// Keep both charts mounted to preserve velocity tracking state,
	// Use visibility instead of display to preserve dimensions and avoid re-render delay
	return (
		<div className="fairy-chart-carousel">
			<div className="fairy-chart-carousel-chevron-container">
				<TldrawUiButton
					type="icon"
					className="fairy-chart-carousel-chevron fairy-chart-carousel-chevron-left"
					onClick={() => cycle(-1)}
					title="Previous chart"
				>
					<TldrawUiButtonIcon icon="chevron-left" small />
				</TldrawUiButton>
			</div>
			<div className="fairy-chart-carousel-content">
				<div
					style={{
						visibility: activeChart === 'velocity' ? 'visible' : 'hidden',
						position: activeChart === 'velocity' ? 'relative' : 'absolute',
						width: '100%',
					}}
				>
					<FairyVelocityChart orchestratorAgent={orchestratorAgent} agents={agents} />
				</div>
				<div
					style={{
						visibility: activeChart === 'actions' ? 'visible' : 'hidden',
						position: activeChart === 'actions' ? 'relative' : 'absolute',
						width: '100%',
					}}
				>
					<FairyActionsChart orchestratorAgent={orchestratorAgent} agents={agents} />
				</div>
				<div
					style={{
						visibility: activeChart === 'actions-by-type' ? 'visible' : 'hidden',
						position: activeChart === 'actions-by-type' ? 'relative' : 'absolute',
						width: '100%',
					}}
				>
					<FairyActionsByTypeChart orchestratorAgent={orchestratorAgent} agents={agents} />
				</div>
			</div>
			<div className="fairy-chart-carousel-chevron-container">
				<TldrawUiButton
					type="icon"
					className="fairy-chart-carousel-chevron fairy-chart-carousel-chevron-right"
					onClick={() => cycle(1)}
					title="Next chart"
				>
					<TldrawUiButtonIcon icon="chevron-right" small />
				</TldrawUiButton>
			</div>
		</div>
	)
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

export function FairyFeedView({
	orchestratorAgent,
	agents,
	showActivityMonitor = false,
}: FairyFeedViewItem) {
	const fairyApp = useFairyApp()
	const historyRef = useRef<HTMLDivElement>(null)
	const previousScrollDistanceFromBottomRef = useRef(0)
	const previousItemCountRef = useRef(0)

	const project = useValue(
		'project',
		() => orchestratorAgent && orchestratorAgent.getProject(true), // Include soft-deleted projects
		[orchestratorAgent]
	)

	const feedItems = useValue(
		'feed-items',
		() => {
			if (!project || !fairyApp) return []

			const projectAgents = agents.filter((agent) => project.members.some((m) => m.id === agent.id))
			return buildFeedItems(projectAgents, orchestratorAgent)
		},
		[project, fairyApp, agents, orchestratorAgent]
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
				{showActivityMonitor && (
					<ChartCarousel orchestratorAgent={orchestratorAgent} agents={agents} />
				)}
				<div className="fairy-feed-view-empty">
					<p>Planning project...</p>
				</div>
			</>
		)
	}

	return (
		<>
			{showActivityMonitor && (
				<ChartCarousel orchestratorAgent={orchestratorAgent} agents={agents} />
			)}
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
