import { FairyHatColor } from '@tldraw/fairy-shared'
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
 * Per-fairy active state data
 */
export interface FairyActiveData {
	id: string
	name: string
	hatColor: FairyHatColor
	isActive: boolean // Was active during this sample (completed an action)
}

/**
 * Data point for active time tracking
 */
export interface ActiveTimeDataPoint {
	timestamp: number
	fairies: FairyActiveData[]
	concurrentActiveCount: number // How many fairies were active at this sample
}

/**
 * Manager for tracking fairy active time percentage.
 * A fairy is considered "active" if they completed an action since the last sample.
 * Also tracks concurrent active count for team-level busyness.
 */
export class FairyAppActiveTimeTracker {
	private dataPoints: Atom<ActiveTimeDataPoint[]>
	private intervalId: number | null = null
	private readonly SAMPLE_INTERVAL_MS = 1000 // Sample every 1 second
	private readonly REAL_TIME_WINDOW_MS = 10 * 60 * 1000 // Keep last 10 minutes
	private readonly ROLLING_WINDOW_SECONDS = 60 // 60-second rolling window for percentage
	private lastActionCounts: Map<string, number> = new Map()
	private currentProjectId: string | null = null

	constructor(private _fairyApp: FairyApp) {
		this.dataPoints = atom('fairyAppActiveTimeData', [])
	}

	/**
	 * Get hex color for a fairy's hat color
	 */
	getHatColorHex(hatColor: FairyHatColor): string {
		return HAT_COLOR_HEX[hatColor] ?? '#888888'
	}

	/**
	 * Determine if each fairy was active (completed an action since last sample)
	 */
	private calculatePerFairyActiveState(agents: FairyAgent[]): FairyActiveData[] {
		const fairyData: FairyActiveData[] = []

		for (const agent of agents) {
			const config = agent.getConfig()
			if (!config) continue

			// Get current total action count from chat history
			const currentActionCount = countCompletedActions(agent)
			const lastActionCount = this.lastActionCounts.get(agent.id) ?? currentActionCount

			// Fairy is "active" if they completed any action since last sample
			const isActive = currentActionCount > lastActionCount

			// Update last action count
			this.lastActionCounts.set(agent.id, currentActionCount)

			fairyData.push({
				id: agent.id,
				name: config.name.split(' ')[0], // First name only
				hatColor: config.hatColor,
				isActive,
			})
		}

		return fairyData
	}

	/**
	 * Get active time percentage for a fairy over the rolling window
	 */
	getActiveTimePercentForFairy(fairyId: string): number {
		const currentTime = Date.now()
		const currentDataPoints = this.dataPoints.get()
		const windowStartTime = currentTime - this.ROLLING_WINDOW_SECONDS * 1000
		const dataPointsInWindow = currentDataPoints.filter((dp) => dp.timestamp >= windowStartTime)

		if (dataPointsInWindow.length === 0) return 0

		let activeSamples = 0
		let totalSamples = 0

		for (const dp of dataPointsInWindow) {
			const fairyInDp = dp.fairies.find((f) => f.id === fairyId)
			if (fairyInDp) {
				totalSamples++
				if (fairyInDp.isActive) activeSamples++
			}
		}

		return totalSamples > 0 ? (activeSamples / totalSamples) * 100 : 0
	}

	/**
	 * Get average concurrent active count over the rolling window
	 */
	getAverageConcurrentActive(): number {
		const currentTime = Date.now()
		const currentDataPoints = this.dataPoints.get()
		const windowStartTime = currentTime - this.ROLLING_WINDOW_SECONDS * 1000
		const dataPointsInWindow = currentDataPoints.filter((dp) => dp.timestamp >= windowStartTime)

		if (dataPointsInWindow.length === 0) return 0

		const totalActive = dataPointsInWindow.reduce((sum, dp) => sum + dp.concurrentActiveCount, 0)
		return totalActive / dataPointsInWindow.length
	}

	/**
	 * Sample active time for a specific set of agents
	 */
	private sampleActiveTime(agents: FairyAgent[]): void {
		const fairies = this.calculatePerFairyActiveState(agents)
		const concurrentActiveCount = fairies.filter((f) => f.isActive).length

		const dataPoint: ActiveTimeDataPoint = {
			timestamp: Date.now(),
			fairies,
			concurrentActiveCount,
		}

		const currentData = this.dataPoints.get()
		let newData = [...currentData, dataPoint]

		// Keep only data within real-time window (last 10 minutes)
		const cutoffTime = Date.now() - this.REAL_TIME_WINDOW_MS
		newData = newData.filter((dp) => dp.timestamp >= cutoffTime)

		this.dataPoints.set(newData)
	}

	/**
	 * Start tracking active time for specific agents
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
			const agents = getAgents()
			if (agents.length > 0) {
				this.sampleActiveTime(agents)
			}
		}, this.SAMPLE_INTERVAL_MS)
	}

	/**
	 * Stop tracking active time
	 */
	stopTracking(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	/**
	 * Clear all active time data
	 */
	clearData(): void {
		this.dataPoints.set([])
		this.lastActionCounts.clear()
	}

	/**
	 * Get the current active time data points
	 */
	getDataPoints(): ActiveTimeDataPoint[] {
		return this.dataPoints.get()
	}

	/**
	 * Get the atom for reactive subscriptions
	 */
	getDataPointsAtom(): Atom<ActiveTimeDataPoint[]> {
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

