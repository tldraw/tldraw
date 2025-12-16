import { FairyHatColor, MessageAction, ThinkAction } from '@tldraw/fairy-shared'
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
 * Per-fairy text output data
 */
export interface FairyTextData {
	id: string
	name: string
	hatColor: FairyHatColor
	charsDelta: number // Characters output since last sample
}

/**
 * Data point for text output tracking
 */
export interface TextOutputDataPoint {
	timestamp: number
	fairies: FairyTextData[]
}

/**
 * Get total character count from think and message actions in chat history
 */
function getTextCharacterCount(agent: FairyAgent): number {
	const history = agent.chat.getHistory()
	let totalChars = 0

	for (const item of history) {
		if (item.type === 'action' && item.action.complete) {
			if (item.action._type === 'think') {
				const thinkAction = item.action as ThinkAction
				if (thinkAction.text) {
					totalChars += thinkAction.text.length
				}
			} else if (item.action._type === 'message') {
				const messageAction = item.action as MessageAction
				if (messageAction.text) {
					totalChars += messageAction.text.length
				}
			}
		}
	}

	return totalChars
}

/**
 * Manager for tracking fairy text output over time.
 * Measures characters output per minute in a rolling window from think and message actions.
 */
export class FairyAppTextOutputTracker {
	private dataPoints: Atom<TextOutputDataPoint[]>
	private intervalId: number | null = null
	private readonly SAMPLE_INTERVAL_MS = 1000 // Sample every 1 second
	private readonly REAL_TIME_WINDOW_MS = 10 * 60 * 1000 // Keep last 10 minutes for real-time display
	private readonly ROLLING_WINDOW_SECONDS = 60 // 60-second rolling window for rate calculation
	private lastCharCounts: Map<string, number> = new Map()
	private currentProjectId: string | null = null

	constructor(private _fairyApp: FairyApp) {
		this.dataPoints = atom('fairyAppTextOutputData', [])
	}

	/**
	 * Get hex color for a fairy's hat color
	 */
	getHatColorHex(hatColor: FairyHatColor): string {
		return HAT_COLOR_HEX[hatColor] ?? '#888888'
	}

	/**
	 * Calculate per-fairy character deltas (characters output since last sample)
	 */
	private calculatePerFairyCharDeltas(agents: FairyAgent[]): FairyTextData[] {
		const fairyData: FairyTextData[] = []

		for (const agent of agents) {
			const config = agent.getConfig()
			if (!config) continue

			// Get current total character count from chat history
			const currentCharCount = getTextCharacterCount(agent)
			const lastCharCount = this.lastCharCounts.get(agent.id) ?? currentCharCount

			// Calculate characters output since last sample (1 second ago)
			const charsDelta = currentCharCount - lastCharCount

			// Update last character count
			this.lastCharCounts.set(agent.id, currentCharCount)

			fairyData.push({
				id: agent.id,
				name: config.name.split(' ')[0], // First name only
				hatColor: config.hatColor,
				charsDelta,
			})
		}

		return fairyData
	}

	/**
	 * Calculate rolling average characters per minute for a given fairy across recent data points
	 */
	getCharsPerMinuteForFairy(fairyId: string): number {
		const currentTime = Date.now()
		const currentDataPoints = this.dataPoints.get()
		const windowStartTime = currentTime - this.ROLLING_WINDOW_SECONDS * 1000
		const dataPointsInWindow = currentDataPoints.filter(
			(dp: TextOutputDataPoint) => dp.timestamp >= windowStartTime
		)

		// Sum all char deltas in the window for this fairy
		let totalChars = 0
		for (const dp of dataPointsInWindow) {
			const fairyInDp = dp.fairies.find((f: FairyTextData) => f.id === fairyId)
			if (fairyInDp) {
				totalChars += fairyInDp.charsDelta
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

		// Convert to chars per minute
		return (totalChars / actualWindowSeconds) * 60
	}

	/**
	 * Sample text output for a specific set of agents
	 */
	private sampleTextOutput(agents: FairyAgent[]): void {
		const fairies = this.calculatePerFairyCharDeltas(agents)
		const dataPoint: TextOutputDataPoint = {
			timestamp: Date.now(),
			fairies,
		}

		const currentData = this.dataPoints.get()
		let newData = [...currentData, dataPoint]

		// Keep only data within real-time window (last 10 minutes)
		const cutoffTime = Date.now() - this.REAL_TIME_WINDOW_MS
		newData = newData.filter((dp) => dp.timestamp >= cutoffTime)

		this.dataPoints.set(newData)
	}

	/**
	 * Start tracking text output for specific agents
	 */
	startTracking(getAgents: () => FairyAgent[], projectId?: string): void {
		// Clear data if tracking a different project
		if (projectId && projectId !== this.currentProjectId) {
			this.clearData()
			this.currentProjectId = projectId
		}

		// Clear any existing interval
		this.stopTracking()
		// Clear last char counts when starting fresh
		this.lastCharCounts.clear()

		// Start sampling
		this.intervalId = window.setInterval(() => {
			const agents = getAgents()
			if (agents.length > 0) {
				this.sampleTextOutput(agents)
			}
		}, this.SAMPLE_INTERVAL_MS)
	}

	/**
	 * Stop tracking text output
	 */
	stopTracking(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	/**
	 * Clear all text output data
	 */
	clearData(): void {
		this.dataPoints.set([])
		this.lastCharCounts.clear()
	}

	/**
	 * Get the current text output data points
	 */
	getDataPoints(): TextOutputDataPoint[] {
		return this.dataPoints.get()
	}

	/**
	 * Get the atom for reactive subscriptions
	 */
	getDataPointsAtom(): Atom<TextOutputDataPoint[]> {
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
