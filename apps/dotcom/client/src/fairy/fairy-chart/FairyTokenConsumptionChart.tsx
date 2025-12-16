import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { useFairyApp } from '../fairy-app/FairyAppProvider'
import { Y_AXIS_PADDING_MULTIPLIER } from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyLineChart } from './FairyLineChart'
import { shouldRecreateChart } from './fairy-chart-helpers'
import type { ChartData, Dataset } from './fairy-chart-types'
import { useProjectChangeDetection } from './useProjectChangeDetection'

interface FairyTokenConsumptionChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyTokenConsumptionChart({
	orchestratorAgent,
	agents,
}: FairyTokenConsumptionChartProps) {
	const fairyApp = useFairyApp()
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyLineChart | null>(null)

	// Get project to filter agents
	const project = useValue(
		'project',
		() => orchestratorAgent && orchestratorAgent.getProject(true),
		[orchestratorAgent]
	)

	// Reset chart data when project changes
	useProjectChangeDetection(project, fairyApp, () => {
		// Destroy existing chart instance so it gets recreated fresh
		if (chartInstanceRef.current) {
			chartInstanceRef.current.destroy()
			chartInstanceRef.current = null
		}
	})

	// Get token consumption data from tracker (subscribe to atom changes)
	const tokenData = useValue(
		'token-consumption-data',
		() => {
			if (!fairyApp?.tokenConsumptionTracker) return []
			return fairyApp.tokenConsumptionTracker.getDataPointsAtom().get()
		},
		[fairyApp]
	)

	// Start/stop tracking based on project existence
	useEffect(() => {
		if (!fairyApp?.tokenConsumptionTracker) {
			return
		}

		// Stop tracking if no project (project ended)
		if (!project) {
			fairyApp.tokenConsumptionTracker.stopTracking()
			return
		}

		// Start tracking with project agents, passing project ID for automatic reset
		fairyApp.tokenConsumptionTracker.startTracking(() => {
			const currentProject = orchestratorAgent?.getProject(true)
			if (!currentProject) return []

			// Filter to project members (always include all members)
			return agents.filter((agent) => {
				const isMember = currentProject.members.some((m) => m.id === agent.id)
				return isMember
			})
		}, project.id)
	}, [fairyApp, project, agents, orchestratorAgent])

	// Build per-fairy datasets from token consumption data with rolling window average
	const chartData = useMemo((): ChartData & { maxValue?: number } => {
		console.log('[TokenChart] Building chart data, tokenData.length:', tokenData.length)

		if (tokenData.length === 0) {
			return { labels: [], datasets: [], maxValue: 0 }
		}

		const ROLLING_WINDOW_SECONDS = 60

		// Get all unique fairy IDs across all data points
		const fairyMap = new Map<string, { name: string; color: string; values: number[] }>()

		// Initialize fairy map
		for (const dataPoint of tokenData) {
			for (const fairy of dataPoint.fairies) {
				if (!fairyMap.has(fairy.id)) {
					const color =
						fairyApp?.tokenConsumptionTracker?.getHatColorHex(fairy.hatColor) ?? '#888888'
					console.log(
						'[TokenChart] Adding fairy:',
						fairy.name,
						'color:',
						color,
						'hatColor:',
						fairy.hatColor
					)
					fairyMap.set(fairy.id, {
						name: fairy.name,
						color,
						values: [],
					})
				}
			}
		}

		// Calculate rolling average tokens per minute for each data point
		tokenData.forEach((dataPoint, index) => {
			// Determine window start (60 seconds before current point)
			const windowStartTime = dataPoint.timestamp - ROLLING_WINDOW_SECONDS * 1000
			const windowStartIndex = tokenData.findIndex((dp) => dp.timestamp >= windowStartTime)
			const startIndex = windowStartIndex >= 0 ? windowStartIndex : 0

			// Calculate tokens per minute for each fairy at this point
			for (const [fairyId, fairyInfo] of fairyMap) {
				let totalTokens = 0
				let actualDataPoints = 0

				// Sum tokens in the window for this fairy
				for (let i = startIndex; i <= index; i++) {
					const dp = tokenData[i]
					const fairyInDp = dp.fairies.find((f) => f.id === fairyId)
					if (fairyInDp) {
						totalTokens += fairyInDp.tokensDelta
						actualDataPoints++
					}
				}

				// Calculate window duration
				const windowDuration = index - startIndex + 1 // Number of samples
				const actualWindowSeconds = Math.min(windowDuration, ROLLING_WINDOW_SECONDS)

				// Convert to tokens per minute
				const tokensPerMinute =
					actualWindowSeconds > 0 ? (totalTokens / actualWindowSeconds) * 60 : 0
				fairyInfo.values.push(tokensPerMinute)
			}
		})

		// Build datasets with rate values
		const datasets: Dataset[] = []
		let maxValue = 0
		for (const [, data] of fairyMap) {
			// Track the maximum value for y-axis scaling
			const maxInDataset = Math.max(...data.values)
			maxValue = Math.max(maxValue, maxInDataset)

			// DEBUG: Log dataset info
			const nonZeroValues = data.values.filter((v) => v > 0)
			if (nonZeroValues.length > 0) {
				console.log('[TokenChart] Dataset for', data.name, ':', {
					color: data.color,
					totalPoints: data.values.length,
					nonZeroPoints: nonZeroValues.length,
					maxValue: maxInDataset,
					sampleValues: data.values.slice(-5), // Last 5 values
				})
			}

			datasets.push({
				name: data.name,
				values: data.values,
				color: data.color,
			})
		}

		console.log('[TokenChart] Final chart data:', {
			datasetCount: datasets.length,
			maxValue,
			totalLabels: tokenData.length,
		})

		// Simple labels - empty strings
		const labels = tokenData.map(() => '')

		return { labels, datasets, maxValue }
	}, [tokenData, fairyApp])

	// Track previous maxYValue to detect when we need to recreate chart
	const prevMaxYValueRef = useRef<number | undefined>(undefined)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current || chartData.datasets.length === 0) return

		// Calculate maxYValue dynamically based on rate values, with padding
		// Adds Y_AXIS_PADDING_MULTIPLIER (20%) to prevent lines from touching the top
		const maxYValue = chartData.maxValue
			? Math.ceil(chartData.maxValue * Y_AXIS_PADDING_MULTIPLIER)
			: undefined

		// Only recreate chart if maxYValue increased significantly
		// Uses CHART_RECREATION_THRESHOLD (25%) to prevent infinite loops from tiny fluctuations
		const existingChart = chartInstanceRef.current
		if (shouldRecreateChart(existingChart, maxYValue, prevMaxYValueRef.current)) {
			existingChart!.destroy()
			chartInstanceRef.current = null
		}

		// Update prevMaxYValueRef only when we recreate or on first render
		if (!chartInstanceRef.current || prevMaxYValueRef.current === undefined) {
			prevMaxYValueRef.current = maxYValue
		}

		// Create or update chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = new FairyLineChart(chartContainerRef.current, {
				data: chartData,
				height: 180,
				dotSize: 3,
				showDots: false,
				showLegend: true,
				showTooltip: false,
				showGridLines: false,
				showXAxisLabels: false,
				maxYValue,
			})
			return
		}

		// Update chart with new data
		chartInstanceRef.current.update(chartData)
	}, [chartData])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.destroy()
				chartInstanceRef.current = null
			}
		}
	}, [])

	if (!project) {
		return null
	}

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title="Token consumption (tokens/min)"
				isEmpty={tokenData.length === 0}
				emptyMessage="Waiting for token usage..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}
