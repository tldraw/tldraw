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
 * Per-fairy distance data
 */
export interface FairyDistanceData {
	id: string
	name: string
	hatColor: FairyHatColor
	distance: number
}

/**
 * Data point for activity tracking
 */
export interface VelocityDataPoint {
	timestamp: number
	fairies: FairyDistanceData[]
}

/**
 * Manager for tracking fairy activity over time.
 * Measures position changes between samples to show actual movement per fairy.
 */
export class FairyAppVelocityTracker {
	private dataPoints: Atom<VelocityDataPoint[]>
	private intervalId: number | null = null
	private readonly MAX_DATA_POINTS = 60 // Keep last 60 data points
	private readonly SAMPLE_INTERVAL_MS = 1000 // Sample every 1 second
	private lastPositions: Map<string, { x: number; y: number }> = new Map()

	constructor(private _fairyApp: FairyApp) {
		this.dataPoints = atom('fairyAppVelocityData', [])
	}

	/**
	 * Calculate distance between two points
	 */
	private calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
		const dx = p2.x - p1.x
		const dy = p2.y - p1.y
		return Math.sqrt(dx * dx + dy * dy)
	}

	/**
	 * Get hex color for a fairy's hat color
	 */
	getHatColorHex(hatColor: FairyHatColor): string {
		return HAT_COLOR_HEX[hatColor] ?? '#888888'
	}

	/**
	 * Calculate per-fairy movement data
	 */
	private calculatePerFairyMovement(agents: FairyAgent[]): FairyDistanceData[] {
		const fairyData: FairyDistanceData[] = []

		for (const agent of agents) {
			const entity = agent.getEntity()
			const config = agent.getConfig()
			if (!entity || !config) continue

			const currentPos = entity.position
			const lastPos = this.lastPositions.get(agent.id)

			let distance = 0
			if (lastPos) {
				distance = this.calculateDistance(lastPos, currentPos)
			}

			// Update last position
			this.lastPositions.set(agent.id, { x: currentPos.x, y: currentPos.y })

			fairyData.push({
				id: agent.id,
				name: config.name.split(' ')[0], // First name only
				hatColor: config.hatColor,
				distance: Math.round(distance * 100) / 100,
			})
		}

		return fairyData
	}

	/**
	 * Sample movement for a specific set of agents (e.g., project fairies)
	 */
	private sampleMovement(agents: FairyAgent[]): void {
		const fairies = this.calculatePerFairyMovement(agents)
		const dataPoint: VelocityDataPoint = {
			timestamp: Date.now(),
			fairies,
		}

		const currentData = this.dataPoints.get()
		const newData = [...currentData, dataPoint]

		// Keep only the last MAX_DATA_POINTS
		if (newData.length > this.MAX_DATA_POINTS) {
			newData.shift()
		}

		this.dataPoints.set(newData)
	}

	/**
	 * Start tracking movement for specific agents
	 */
	startTracking(getAgents: () => FairyAgent[]): void {
		// Clear any existing interval
		this.stopTracking()
		// Clear last positions when starting fresh
		this.lastPositions.clear()

		// Start sampling
		this.intervalId = window.setInterval(() => {
			const agents = getAgents()
			if (agents.length > 0) {
				this.sampleMovement(agents)
			}
		}, this.SAMPLE_INTERVAL_MS)
	}

	/**
	 * Stop tracking velocity
	 */
	stopTracking(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
	}

	/**
	 * Clear all velocity data
	 */
	clearData(): void {
		this.dataPoints.set([])
	}

	/**
	 * Get the current velocity data points
	 */
	getDataPoints(): VelocityDataPoint[] {
		return this.dataPoints.get()
	}

	/**
	 * Get the atom for reactive subscriptions
	 */
	getDataPointsAtom(): Atom<VelocityDataPoint[]> {
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
