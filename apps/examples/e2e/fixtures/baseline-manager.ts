import fs from 'fs'
import path from 'path'
import { FPSMetrics } from './fps-tracker'

export interface PerformanceBaseline {
	avgFps: number
	minFps: number
	maxFps: number
	timestamp: string
	environment: {
		platform: string
		viewport: string
		browser: string
	}
}

export interface BaselineData {
	baselines: {
		[platform: string]: {
			[interaction: string]: PerformanceBaseline
		}
	}
	metadata: {
		lastUpdated: string
		version: string
	}
}

export interface ComparisonResult {
	interaction: string
	current: FPSMetrics
	baseline: PerformanceBaseline
	avgFpsChange: number // Percentage change
	minFpsChange: number
	isRegression: boolean
	isImprovement: boolean
	status: 'pass' | 'warning' | 'fail'
	message: string
}

export interface Environment {
	platform: string
	viewport: string
	browser: string
}

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export class BaselineManager {
	private baselineFilePath: string
	private regressionThreshold = 15 // Percentage
	private warningThreshold = 10 // Percentage

	constructor(baselineDir = path.join(__dirname, '..', 'baselines')) {
		// Ensure baseline directory exists
		if (!fs.existsSync(baselineDir)) {
			fs.mkdirSync(baselineDir, { recursive: true })
		}
		this.baselineFilePath = path.join(baselineDir, 'fps-baselines.json')
	}

	private loadBaselines(): BaselineData {
		if (!fs.existsSync(this.baselineFilePath)) {
			return {
				baselines: {},
				metadata: {
					lastUpdated: new Date().toISOString(),
					version: '1.0.0',
				},
			}
		}

		try {
			const content = fs.readFileSync(this.baselineFilePath, 'utf-8')
			return JSON.parse(content)
		} catch (error) {
			console.warn('Failed to load baseline file, creating new one:', error)
			return {
				baselines: {},
				metadata: {
					lastUpdated: new Date().toISOString(),
					version: '1.0.0',
				},
			}
		}
	}

	private saveBaselines(data: BaselineData): void {
		try {
			const content = JSON.stringify(data, null, 2)
			fs.writeFileSync(this.baselineFilePath, content, 'utf-8')
		} catch (error) {
			throw new Error(`Failed to save baselines: ${error}`)
		}
	}

	private getPlatformKey(env: Environment): string {
		return `${env.platform}-${env.viewport}`
	}

	private calculatePercentageChange(current: number, baseline: number): number {
		if (baseline === 0) return 0
		return ((current - baseline) / baseline) * 100
	}

	updateBaseline(
		interaction: string,
		metrics: FPSMetrics,
		environment: Environment,
		force = false
	): void {
		const data = this.loadBaselines()
		const platformKey = this.getPlatformKey(environment)

		if (!data.baselines[platformKey]) {
			data.baselines[platformKey] = {}
		}

		const existingBaseline = data.baselines[platformKey][interaction]
		const newBaseline: PerformanceBaseline = {
			avgFps: metrics.averageFps,
			minFps: metrics.minFps,
			maxFps: metrics.maxFps,
			timestamp: new Date().toISOString(),
			environment,
		}

		// Only update if it's an improvement, forced, or no existing baseline
		if (!existingBaseline || force || metrics.averageFps > existingBaseline.avgFps) {
			data.baselines[platformKey][interaction] = newBaseline
			data.metadata.lastUpdated = new Date().toISOString()
			this.saveBaselines(data)
			// eslint-disable-next-line no-console
			console.log(`Updated baseline for ${interaction} on ${platformKey}:`, newBaseline)
		}
	}

	compareWithBaseline(
		interaction: string,
		metrics: FPSMetrics,
		environment: Environment,
		autoCreateBaseline = true
	): ComparisonResult {
		const data = this.loadBaselines()
		const platformKey = this.getPlatformKey(environment)
		const baseline = data.baselines[platformKey]?.[interaction]

		if (!baseline) {
			if (autoCreateBaseline) {
				// Automatically create baseline on first run
				this.updateBaseline(interaction, metrics, environment, true)
				return {
					interaction,
					current: metrics,
					baseline: {
						avgFps: metrics.averageFps,
						minFps: metrics.minFps,
						maxFps: metrics.maxFps,
						timestamp: new Date().toISOString(),
						environment,
					},
					avgFpsChange: 0,
					minFpsChange: 0,
					isRegression: false,
					isImprovement: false,
					status: 'pass',
					message: `New baseline created for ${interaction} on ${platformKey}. Average FPS: ${metrics.averageFps}`,
				}
			} else {
				return {
					interaction,
					current: metrics,
					baseline: {
						avgFps: 0,
						minFps: 0,
						maxFps: 0,
						timestamp: '',
						environment,
					},
					avgFpsChange: 0,
					minFpsChange: 0,
					isRegression: false,
					isImprovement: false,
					status: 'warning',
					message: `No baseline found for ${interaction} on ${platformKey}. Consider setting a baseline first.`,
				}
			}
		}

		const avgFpsChange = this.calculatePercentageChange(metrics.averageFps, baseline.avgFps)
		const minFpsChange = this.calculatePercentageChange(metrics.minFps, baseline.minFps)

		const isRegression = avgFpsChange < -this.regressionThreshold
		const isImprovement = avgFpsChange > this.warningThreshold
		const isSignificantChange = Math.abs(avgFpsChange) > this.regressionThreshold

		let status: 'pass' | 'warning' | 'fail' = 'pass'
		let message = `Performance stable. Average FPS: ${metrics.averageFps} (${avgFpsChange.toFixed(1)}% change)`

		if (isRegression) {
			status = 'fail'
			message = `Performance regression detected! Average FPS dropped by ${Math.abs(avgFpsChange).toFixed(1)}% (${baseline.avgFps} → ${metrics.averageFps})`
		} else if (isImprovement) {
			status = 'warning' // Warning to indicate a significant change that might warrant baseline update
			message = `Performance improvement detected! Average FPS improved by ${avgFpsChange.toFixed(1)}% (${baseline.avgFps} → ${metrics.averageFps}). Consider updating baseline.`
		} else if (isSignificantChange) {
			status = 'warning'
			message = `Performance change detected. Average FPS: ${metrics.averageFps} (${avgFpsChange > 0 ? '+' : ''}${avgFpsChange.toFixed(1)}%)`
		}

		return {
			interaction,
			current: metrics,
			baseline,
			avgFpsChange,
			minFpsChange,
			isRegression,
			isImprovement,
			status,
			message,
		}
	}

	getAllBaselines(): BaselineData {
		return this.loadBaselines()
	}

	getBaseline(interaction: string, environment: Environment): PerformanceBaseline | null {
		const data = this.loadBaselines()
		const platformKey = this.getPlatformKey(environment)
		return data.baselines[platformKey]?.[interaction] || null
	}

	deleteBaseline(interaction: string, environment: Environment): boolean {
		const data = this.loadBaselines()
		const platformKey = this.getPlatformKey(environment)

		if (data.baselines[platformKey]?.[interaction]) {
			delete data.baselines[platformKey][interaction]
			data.metadata.lastUpdated = new Date().toISOString()
			this.saveBaselines(data)
			return true
		}
		return false
	}

	setThresholds(regressionThreshold: number, warningThreshold: number): void {
		if (regressionThreshold <= 0 || warningThreshold <= 0) {
			throw new Error('Thresholds must be positive numbers')
		}
		if (warningThreshold > regressionThreshold) {
			throw new Error('Warning threshold must be less than or equal to regression threshold')
		}

		this.regressionThreshold = regressionThreshold
		this.warningThreshold = warningThreshold
	}

	getThresholds(): { regressionThreshold: number; warningThreshold: number } {
		return {
			regressionThreshold: this.regressionThreshold,
			warningThreshold: this.warningThreshold,
		}
	}
}
