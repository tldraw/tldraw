import { AgentId, FairyHatColor } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { countCompletedActions } from '../../fairy-chart/fairy-chart-helpers'
import { FairyApp } from '../FairyApp'

/**
 * Map fairy hat colors to hex values (IRC-style saturated colors for better readability)
 */
const HAT_COLOR_HEX: Record<FairyHatColor, string> = {
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
 * Per-fairy action data
 */
export interface FairyActionData {
	id: string
	name: string
	hatColor: FairyHatColor
	actionsDelta: number // Actions completed since last sample
}

/**
 * Data point for action rate tracking
 */
export interface ActionRateDataPoint {
	timestamp: number
	fairies: FairyActionData[]
}

/**
 * Manager for tracking fairy action rate over time.
 * Measures completed actions per minute in a rolling window.
 * More responsive than token tracking since actions stream in real-time.
 */
export class FairyAppActionRateTracker {
	private dataPoints: Atom<ActionRateDataPoint[]>
	private intervalId: number | null = null
	private readonly SAMPLE_INTERVAL_MS = 1000 // Sample every 1 second
	private readonly REAL_TIME_WINDOW_MS = 10 * 60 * 1000 // Keep last 10 minutes for real-time display
	private readonly ROLLING_WINDOW_SECONDS = 60 // 60-second rolling window for rate calculation
	private lastActionCounts: Map<AgentId, number> = new Map()
	private currentProjectId: string | null = null

	constructor(private _fairyApp: FairyApp) {
		this.dataPoints = atom('fairyAppActionRateData', [])
	}

	/**
	 * Get hex color for a fairy's hat color
	 */
	getHatColorHex(hatColor: FairyHatColor): string {
		return HAT_COLOR_HEX[hatColor] ?? '#888888'
	}

	/**
	 * Calculate per-fairy action deltas (actions completed since last sample)
	 */
	private calculatePerFairyActionDeltas(agents: FairyAgent[]): FairyActionData[] {
		const fairyData: FairyActionData[] = []

		for (const agent of agents) {
			const config = agent.getConfig()
			if (!config) continue

			// Get current total action count from chat history
			const currentActionCount = countCompletedActions(agent)
			const lastActionCount = this.lastActionCounts.get(agent.id) ?? currentActionCount

			// Calculate actions completed since last sample (1 second ago)
			const actionsDelta = currentActionCount - lastActionCount

			// Update last action count
			this.lastActionCounts.set(agent.id, currentActionCount)

			fairyData.push({
				id: agent.id,
				name: config.name.split(' ')[0], // First name only
				hatColor: config.hatColor,
				actionsDelta,
			})
		}

		return fairyData
	}

	/**
	 * Calculate rolling average actions per minute for a given fairy across recent data points
	 */
	getActionsPerMinuteForFairy(fairyId: string): number {
		const currentTime = Date.now()
		const currentDataPoints = this.dataPoints.get()
		const windowStartTime = currentTime - this.ROLLING_WINDOW_SECONDS * 1000
		const dataPointsInWindow = currentDataPoints.filter((dp) => dp.timestamp >= windowStartTime)

		// Sum all action deltas in the window for this fairy
		let totalActions = 0
		for (const dp of dataPointsInWindow) {
			const fairyInDp = dp.fairies.find((f) => f.id === fairyId)
			if (fairyInDp) {
				totalActions += fairyInDp.actionsDelta
			}
		}

		// Calculate actual window duration (in case we don't have 60 seconds of data yet)
		const actualWindowSeconds =
			dataPointsInWindow.length > 0
				? Math.min(
						this.ROLLING_WINDOW_SECONDS,
						(currentTime - dataPointsInWindow[0].timestamp) / 1000
					)
				: 1

		// Convert to actions per minute
		return (totalActions / actualWindowSeconds) * 60
	}

	/**
	 * Sample action rate for a specific set of agents
	 */
	private sampleActionRate(agents: FairyAgent[]): void {
		const fairies = this.calculatePerFairyActionDeltas(agents)
		const dataPoint: ActionRateDataPoint = {
			timestamp: Date.now(),
			fairies,
		}

		const currentData = this.dataPoints.get()
		let newData = [...currentData, dataPoint]

		// Keep only data within real-time window (last 10 minutes)
		const cutoffTime = Date.now() - this.REAL_TIME_WINDOW_MS
		newData = newData.filter((dp) => dp.timestamp >= cutoffTime)

		this.dataPoints.set(newData)

		// Cleanup lastActionCounts for agents no longer being tracked
		this.cleanupStaleActionCounts(agents)
	}

	/**
	 * Remove action count entries for agents that no longer exist
	 */
	private cleanupStaleActionCounts(currentAgents: FairyAgent[]): void {
		const currentAgentIds = new Set(currentAgents.map((a) => a.id))
		for (const id of this.lastActionCounts.keys()) {
			if (!currentAgentIds.has(id)) {
				this.lastActionCounts.delete(id)
			}
		}
	}

	/**
	 * Start tracking action rate for specific agents
	 */
	startTracking(getAgents: () => FairyAgent[], projectId?: string): void {
		// Clear data if tracking a different project
		if (projectId && projectId !== this.currentProjectId) {
			this.clearData()
			this.currentProjectId = projectId
		}

		// Clear any existing interval
		this.stopTracking()
		// Clear last action counts when starting fresh
		this.lastActionCounts.clear()

		// Start sampling
		this.intervalId = window.setInterval(() => {
			try {
				const agents = getAgents()
				if (agents.length > 0) {
					this.sampleActionRate(agents)
				}
			} catch (error) {
				console.error('Error sampling action rate:', error)
			}
		}, this.SAMPLE_INTERVAL_MS)
	}

	/**
	 * Stop tracking action rate
	 */
	stopTracking(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	/**
	 * Clear all action rate data
	 */
	clearData(): void {
		this.dataPoints.set([])
		this.lastActionCounts.clear()
	}

	/**
	 * Get the current action rate data points
	 */
	getDataPoints(): ActionRateDataPoint[] {
		return this.dataPoints.get()
	}

	/**
	 * Get the atom for reactive subscriptions
	 */
	getDataPointsAtom(): Atom<ActionRateDataPoint[]> {
		return this.dataPoints
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this.stopTracking()
		this.clearData()
	}
}
