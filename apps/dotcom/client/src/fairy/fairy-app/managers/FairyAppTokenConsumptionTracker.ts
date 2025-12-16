import { FairyHatColor } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
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
 * Per-fairy token consumption data
 */
export interface FairyTokenData {
	id: string
	name: string
	hatColor: FairyHatColor
	tokensDelta: number // Tokens consumed since last sample
}

/**
 * Data point for token consumption tracking
 */
export interface TokenConsumptionDataPoint {
	timestamp: number
	fairies: FairyTokenData[]
}

/**
 * Manager for tracking fairy token consumption over time.
 * Measures tokens consumed per minute in a rolling 60-second window.
 */
export class FairyAppTokenConsumptionTracker {
	private dataPoints: Atom<TokenConsumptionDataPoint[]>
	private intervalId: number | null = null
	private readonly SAMPLE_INTERVAL_MS = 1000 // Sample every 1 second
	private readonly REAL_TIME_WINDOW_MS = 10 * 60 * 1000 // Keep last 10 minutes for real-time display
	private readonly ROLLING_WINDOW_SECONDS = 5 // 60-second rolling window for rate calculation
	private lastTokenCounts: Map<string, number> = new Map()
	private currentProjectId: string | null = null

	constructor(private _fairyApp: FairyApp) {
		this.dataPoints = atom('fairyAppTokenConsumptionData', [])
	}

	/**
	 * Get hex color for a fairy's hat color
	 */
	getHatColorHex(hatColor: FairyHatColor): string {
		return HAT_COLOR_HEX[hatColor] ?? '#888888'
	}

	/**
	 * Calculate per-fairy token deltas (tokens consumed since last sample)
	 */
	private calculatePerFairyTokenDeltas(agents: FairyAgent[]): FairyTokenData[] {
		const fairyData: FairyTokenData[] = []

		let hasNonZeroTokens = false
		for (const agent of agents) {
			const config = agent.getConfig()
			if (!config) continue

			// Get current total token count
			const currentTokenCount = agent.usage.cumulativeUsage.totalTokens
			const lastTokenCount = this.lastTokenCounts.get(agent.id) ?? currentTokenCount

			// Calculate tokens consumed since last sample (1 second ago)
			const tokensDelta = currentTokenCount - lastTokenCount

			// DEBUG: Log token tracking (always log first time to see initial state)
			if (tokensDelta > 0) {
				console.log(
					'[TokenTracker] Token delta for',
					config.name,
					':',
					tokensDelta,
					'(current:',
					currentTokenCount,
					'last:',
					lastTokenCount,
					')'
				)
			} else if (!this.lastTokenCounts.has(agent.id)) {
				console.log(
					'[TokenTracker] Initial token count for',
					config.name,
					':',
					currentTokenCount,
					'(usage object:',
					agent.usage.cumulativeUsage,
					')'
				)
			}

			if (currentTokenCount > 0) hasNonZeroTokens = true

			// Update last token count
			this.lastTokenCounts.set(agent.id, currentTokenCount)

			fairyData.push({
				id: agent.id,
				name: config.name.split(' ')[0], // First name only
				hatColor: config.hatColor,
				tokensDelta,
			})
		}

		// DEBUG: Warn if all tokens are still 0 after several samples
		const sampleCount = this.dataPoints.get().length
		if (sampleCount > 10 && !hasNonZeroTokens) {
			console.warn(
				'[TokenTracker] WARNING: All agents still have 0 tokens after',
				sampleCount,
				'samples. Usage tracking may not be working!'
			)
		}

		return fairyData
	}

	/**
	 * Calculate rolling average tokens per minute for a given fairy across recent data points
	 */
	getTokensPerMinuteForFairy(fairyId: string): number {
		const currentTime = Date.now()
		const currentDataPoints = this.dataPoints.get()
		const windowStartTime = currentTime - this.ROLLING_WINDOW_SECONDS * 1000
		const dataPointsInWindow = currentDataPoints.filter((dp) => dp.timestamp >= windowStartTime)

		// Sum all token deltas in the window for this fairy
		let totalTokens = 0
		for (const dp of dataPointsInWindow) {
			const fairyInDp = dp.fairies.find((f) => f.id === fairyId)
			if (fairyInDp) {
				totalTokens += fairyInDp.tokensDelta
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

		// Convert to tokens per minute
		return (totalTokens / actualWindowSeconds) * 60
	}

	/**
	 * Sample token consumption for a specific set of agents
	 */
	private sampleTokenConsumption(agents: FairyAgent[]): void {
		const fairies = this.calculatePerFairyTokenDeltas(agents)
		const dataPoint: TokenConsumptionDataPoint = {
			timestamp: Date.now(),
			fairies,
		}

		// DEBUG: Log data point summary
		const nonZeroFairies = fairies.filter((f) => f.tokensDelta > 0)
		if (nonZeroFairies.length > 0) {
			console.log('[TokenTracker] Storing data point with non-zero deltas:', nonZeroFairies)
		}

		const currentData = this.dataPoints.get()
		let newData = [...currentData, dataPoint]

		// Keep only data within real-time window (last 10 minutes)
		const cutoffTime = Date.now() - this.REAL_TIME_WINDOW_MS
		newData = newData.filter((dp) => dp.timestamp >= cutoffTime)

		console.log('[TokenTracker] Total data points:', newData.length)

		this.dataPoints.set(newData)
	}

	/**
	 * Start tracking token consumption for specific agents
	 */
	startTracking(getAgents: () => FairyAgent[], projectId?: string): void {
		// Clear data if tracking a different project
		if (projectId && projectId !== this.currentProjectId) {
			this.clearData()
			this.currentProjectId = projectId
		}

		// Clear any existing interval
		this.stopTracking()
		// Clear last token counts when starting fresh
		this.lastTokenCounts.clear()

		// Start sampling
		this.intervalId = window.setInterval(() => {
			const agents = getAgents()
			if (agents.length > 0) {
				this.sampleTokenConsumption(agents)
			}
		}, this.SAMPLE_INTERVAL_MS)
	}

	/**
	 * Stop tracking token consumption
	 */
	stopTracking(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	/**
	 * Clear all token consumption data
	 */
	clearData(): void {
		this.dataPoints.set([])
		this.lastTokenCounts.clear()
	}

	/**
	 * Get the current token consumption data points
	 */
	getDataPoints(): TokenConsumptionDataPoint[] {
		return this.dataPoints.get()
	}

	/**
	 * Get the atom for reactive subscriptions
	 */
	getDataPointsAtom(): Atom<TokenConsumptionDataPoint[]> {
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
