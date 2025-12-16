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

interface FairyActionRateChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyActionRateChart({ orchestratorAgent, agents }: FairyActionRateChartProps) {
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

	// Get action rate data from tracker (subscribe to atom changes)
	const actionRateData = useValue(
		'action-rate-data',
		() => {
			if (!fairyApp?.actionRateTracker) return []
			return fairyApp.actionRateTracker.getDataPointsAtom().get()
		},
		[fairyApp]
	)

	// Start/stop tracking based on project existence
	useEffect(() => {
		if (!fairyApp?.actionRateTracker) {
			return
		}

		// Stop tracking if no project (project ended)
		if (!project) {
			fairyApp.actionRateTracker.stopTracking()
			return
		}

		// Start tracking with project agents, passing project ID for automatic reset
		fairyApp.actionRateTracker.startTracking(() => {
			const currentProject = orchestratorAgent?.getProject(true)
			if (!currentProject) return []

			// Filter to project members (always include all members)
			return agents.filter((agent) => {
				const isMember = currentProject.members.some((m) => m.id === agent.id)
				return isMember
			})
		}, project.id)
	}, [fairyApp, project, agents, orchestratorAgent])

	// Build per-fairy datasets from action rate data with rolling window average
	const chartData = useMemo((): ChartData & { maxValue?: number } => {
		if (actionRateData.length === 0) {
			return { labels: [], datasets: [], maxValue: 0 }
		}

		const ROLLING_WINDOW_SECONDS = 60

		// Get all unique fairy IDs across all data points
		const fairyMap = new Map<string, { name: string; color: string; values: number[] }>()

		// Initialize fairy map
		for (const dataPoint of actionRateData) {
			for (const fairy of dataPoint.fairies) {
				if (!fairyMap.has(fairy.id)) {
					const color =
						fairyApp?.actionRateTracker?.getHatColorHex(fairy.hatColor) ?? '#888888'
					fairyMap.set(fairy.id, {
						name: fairy.name,
						color,
						values: [],
					})
				}
			}
		}

		// Calculate rolling average actions per minute for each data point
		actionRateData.forEach((dataPoint, index) => {
			// Determine window start (60 seconds before current point)
			const windowStartTime = dataPoint.timestamp - ROLLING_WINDOW_SECONDS * 1000
			const windowStartIndex = actionRateData.findIndex((dp) => dp.timestamp >= windowStartTime)
			const startIndex = windowStartIndex >= 0 ? windowStartIndex : 0

			// Calculate actions per minute for each fairy at this point
			for (const [fairyId, fairyInfo] of fairyMap) {
				let totalActions = 0

				// Sum actions in the window for this fairy
				for (let i = startIndex; i <= index; i++) {
					const dp = actionRateData[i]
					const fairyInDp = dp.fairies.find((f) => f.id === fairyId)
					if (fairyInDp) {
						totalActions += fairyInDp.actionsDelta
					}
				}

				// Calculate window duration
				const windowDuration = index - startIndex + 1 // Number of samples
				const actualWindowSeconds = Math.min(windowDuration, ROLLING_WINDOW_SECONDS)

				// Convert to actions per minute
				const actionsPerMinute =
					actualWindowSeconds > 0 ? (totalActions / actualWindowSeconds) * 60 : 0
				fairyInfo.values.push(actionsPerMinute)
			}
		})

		// Build datasets with rate values
		const datasets: Dataset[] = []
		let maxValue = 0
		for (const [, data] of fairyMap) {
			// Track the maximum value for y-axis scaling
			const maxInDataset = Math.max(...data.values)
			maxValue = Math.max(maxValue, maxInDataset)

			datasets.push({
				name: data.name,
				values: data.values,
				color: data.color,
			})
		}

		// Simple labels - empty strings
		const labels = actionRateData.map(() => '')

		return { labels, datasets, maxValue }
	}, [actionRateData, fairyApp])

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
				title="Action Rate (actions/min)"
				isEmpty={actionRateData.length === 0}
				emptyMessage="Waiting for fairy actions..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}

