import { PerformanceTestResult } from './perf-utils'

export interface AnalyticsConfig {
	enabled: boolean
	projectKey?: string
	apiHost?: string
}

export class PerformanceAnalyticsReporter {
	private config: AnalyticsConfig

	constructor(config: AnalyticsConfig = { enabled: false }) {
		this.config = config
	}

	async reportPerformanceMetrics(
		results: PerformanceTestResult[],
		testContext: {
			testName: string
			timestamp: string
			gitCommit?: string
			branch?: string
			ciEnvironment?: string
		}
	): Promise<void> {
		if (!this.config.enabled) {
			// eslint-disable-next-line no-console
			console.log(
				'Analytics reporting disabled - would have sent:',
				results.length,
				'performance results'
			)
			return
		}

		try {
			const payload = this.formatPayload(results, testContext)
			await this.sendToPostHog(payload)
			// eslint-disable-next-line no-console
			console.log(`Sent ${results.length} performance metrics to PostHog`)
		} catch (error) {
			console.error('Failed to send performance metrics:', error)
		}
	}

	private formatPayload(results: PerformanceTestResult[], testContext: any) {
		return results.map((result) => ({
			event: 'performance_test_result',
			properties: {
				// Test identification
				test_name: testContext.testName,
				interaction: result.interaction,
				timestamp: testContext.timestamp,

				// Environment
				platform: result.environment.platform,
				viewport: result.environment.viewport,
				browser: result.environment.browser,

				// Performance metrics
				avg_fps: result.metrics.averageFps,
				min_fps: result.metrics.minFps,
				max_fps: result.metrics.maxFps,
				total_frames: result.metrics.totalFrames,
				duration_seconds: result.metrics.duration,
				sample_count: result.metrics.samples.length,

				// Comparison results
				baseline_avg_fps: result.comparison.baseline.avgFps,
				fps_change_percent: result.comparison.avgFpsChange,
				is_regression: result.comparison.isRegression,
				is_improvement: result.comparison.isImprovement,
				status: result.comparison.status,

				// CI/Git context
				git_commit: testContext.gitCommit,
				git_branch: testContext.branch,
				ci_environment: testContext.ciEnvironment,

				// Additional metadata
				fps_samples: result.metrics.samples.slice(0, 10), // First 10 samples for analysis
			},
		}))
	}

	private async sendToPostHog(events: any[]): Promise<void> {
		if (!this.config.projectKey) {
			throw new Error('PostHog project key not configured')
		}

		const url = `${this.config.apiHost || 'https://analytics.tldraw.com'}/capture/`

		for (const event of events) {
			const payload = {
				api_key: this.config.projectKey,
				event: event.event,
				properties: {
					...event.properties,
					distinct_id: `e2e-test-${Date.now()}`, // Anonymous test identifier
					$lib: 'tldraw-e2e-perf',
					$lib_version: '1.0.0',
				},
				timestamp: new Date().toISOString(),
			}

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				throw new Error(`PostHog API error: ${response.status} ${response.statusText}`)
			}
		}
	}

	async reportRegressionAlert(result: PerformanceTestResult, testContext: any): Promise<void> {
		if (!this.config.enabled || result.comparison.status !== 'fail') {
			return
		}

		try {
			const alertPayload = {
				event: 'performance_regression_alert',
				properties: {
					test_name: testContext.testName,
					interaction: result.interaction,
					avg_fps_drop: Math.abs(result.comparison.avgFpsChange),
					current_fps: result.metrics.averageFps,
					baseline_fps: result.comparison.baseline.avgFps,
					platform: result.environment.platform,
					browser: result.environment.browser,
					timestamp: testContext.timestamp,
					git_commit: testContext.gitCommit,
					git_branch: testContext.branch,
					alert_message: result.comparison.message,
					severity: result.comparison.avgFpsChange < -20 ? 'high' : 'medium',
				},
			}

			await this.sendToPostHog([alertPayload])
			// eslint-disable-next-line no-console
			console.log(`Sent performance regression alert for ${result.interaction}`)
		} catch (error) {
			console.error('Failed to send regression alert:', error)
		}
	}
}

// Factory function to create analytics reporter with environment-based config
export function createAnalyticsReporter(): PerformanceAnalyticsReporter {
	const config: AnalyticsConfig = {
		enabled: process.env.PERFORMANCE_ANALYTICS_ENABLED === 'true',
		projectKey: 'phc_i8oKgMzgV38sn3GfjswW9mevQ3gFlo7bJXekZFeDN6',
		apiHost: process.env.POSTHOG_API_HOST || 'https://analytics.tldraw.com/ingest',
	}

	return new PerformanceAnalyticsReporter(config)
}

// Helper to collect test context from environment
export function getTestContext(testName: string) {
	return {
		testName,
		timestamp: new Date().toISOString(),
		gitCommit: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
		branch: process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME,
		ciEnvironment: process.env.CI
			? process.env.GITHUB_ACTIONS
				? 'github-actions'
				: 'ci'
			: 'local',
	}
}
