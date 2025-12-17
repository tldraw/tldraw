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

interface FairyActionRateChartProps {
	agents: FairyAgent[]
}

const TIME_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

export function FairyActionRateChart({ agents }: FairyActionRateChartProps) {
	const fairyApp = useFairyApp()
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyLineChart | null>(null)

	// Get action rate data from tracker (subscribe to atom changes)
	const actionRateData = useValue(
		'action-rate-data',
		() => {
			if (!fairyApp?.actionRateTracker) return []
			return fairyApp.actionRateTracker.getDataPointsAtom().get()
		},
		[fairyApp]
	)

	// Start/stop tracking all agents globally (when chart mounts/unmounts)
	useEffect(() => {
		if (!fairyApp?.actionRateTracker) {
			return
		}

		// Start tracking all agents globally when chart mounts (dialog opens)
		fairyApp.actionRateTracker.startTracking(
			() => agents, // Track all agents
			undefined // No project ID (global mode)
		)

		// Stop tracking when chart unmounts (dialog closes)
		return () => {
			fairyApp.actionRateTracker.stopTracking()
		}
	}, [fairyApp, agents])

	// Filter data to the time window
	const filteredData = useMemo(() => {
		if (actionRateData.length === 0) return []

		const now = Date.now()
		const cutoffTime = now - TIME_WINDOW_MS
		return actionRateData.filter((dataPoint) => dataPoint.timestamp >= cutoffTime)
	}, [actionRateData])

	// Build per-fairy datasets from action rate data with rolling window average
	const chartData = useMemo((): ChartData & { maxValue?: number } => {
		if (filteredData.length === 0 || !fairyApp?.actionRateTracker) {
			return { labels: [], datasets: [], maxValue: 0 }
		}

		const ROLLING_WINDOW_SECONDS = 60

		// Get all unique fairy IDs across all data points
		const fairyMap = new Map<string, { name: string; color: string; values: number[] }>()

		// Initialize fairy map with colors from tracker
		for (const dataPoint of filteredData) {
			for (const fairy of dataPoint.fairies) {
				if (!fairyMap.has(fairy.id)) {
					const color = fairyApp.actionRateTracker.getHatColorHex(fairy.hatColor)
					fairyMap.set(fairy.id, {
						name: fairy.name,
						color,
						values: [],
					})
				}
			}
		}

		// Calculate rolling average actions per minute for each historical data point
		filteredData.forEach((dataPoint, index) => {
			// Determine window start (60 seconds before current point)
			const windowStartTime = dataPoint.timestamp - ROLLING_WINDOW_SECONDS * 1000
			const windowStartIndex = filteredData.findIndex((dp) => dp.timestamp >= windowStartTime)
			const startIndex = windowStartIndex >= 0 ? windowStartIndex : 0

			// Calculate actions per minute for each fairy at this historical point
			for (const [fairyId, fairyInfo] of fairyMap) {
				let totalActions = 0

				// Sum actions in the window for this fairy
				for (let i = startIndex; i <= index; i++) {
					const dp = filteredData[i]
					const fairyInDp = dp.fairies.find((f) => f.id === fairyId)
					if (fairyInDp) {
						totalActions += fairyInDp.actionsDelta
					}
				}

				// Calculate actual elapsed time in the window using timestamps
				const actualWindowMs = dataPoint.timestamp - filteredData[startIndex].timestamp
				const actualWindowSeconds = Math.max(actualWindowMs / 1000, 1)

				// Convert to actions per minute
				const actionsPerMinute = (totalActions / actualWindowSeconds) * 60
				fairyInfo.values.push(actionsPerMinute)
			}
		})

		// Build datasets with rate values
		const datasets: Dataset[] = []
		let maxValue = 0
		for (const [, data] of fairyMap) {
			const maxInDataset = Math.max(...data.values, 0)
			maxValue = Math.max(maxValue, maxInDataset)

			datasets.push({
				name: data.name,
				values: data.values,
				color: data.color,
			})
		}

		// Simple labels - empty strings
		const labels = filteredData.map(() => '')

		return { labels, datasets, maxValue }
	}, [filteredData, fairyApp])

	// Track previous maxYValue and timeRange to detect when we need to recreate chart
	const prevMaxYValueRef = useRef<number | undefined>(undefined)

	// Destroy chart when data becomes empty (container div is unmounted by FairyChartContainer)
	// This prevents stale chart instance from rendering to a removed DOM element
	useEffect(() => {
		if (actionRateData.length === 0 && chartInstanceRef.current) {
			chartInstanceRef.current.destroy()
			chartInstanceRef.current = null
			prevMaxYValueRef.current = undefined
		}
	}, [actionRateData.length])

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current || chartData.datasets.length === 0) return

		// Calculate maxYValue dynamically based on rate values, with padding
		// Adds Y_AXIS_PADDING_MULTIPLIER (20%) to prevent lines from touching the top
		const maxYValue = chartData.maxValue
			? Math.ceil(chartData.maxValue * Y_AXIS_PADDING_MULTIPLIER)
			: undefined

		// Recreate chart if maxYValue increased significantly
		if (shouldRecreateChart(chartInstanceRef.current, maxYValue, prevMaxYValueRef.current)) {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.destroy()
				chartInstanceRef.current = null
			}
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

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title=""
				isEmpty={actionRateData.length === 0}
				emptyMessage="Waiting for fairy actions..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}
