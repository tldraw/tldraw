import { useEffect, useMemo, useRef, useState } from 'react'
import { TldrawUiButton, useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { useFairyApp } from '../fairy-app/FairyAppProvider'
import { Y_AXIS_PADDING_MULTIPLIER } from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyLineChart } from './FairyLineChart'
import { shouldRecreateChart } from './fairy-chart-helpers'
import type { ChartData, Dataset } from './fairy-chart-types'

interface FairyActionRateChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

type TimeRange = '1m' | '5m' | '10m'

export function FairyActionRateChart({ orchestratorAgent, agents }: FairyActionRateChartProps) {
	const fairyApp = useFairyApp()
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyLineChart | null>(null)
	const [timeRange, setTimeRange] = useState<TimeRange>('10m')

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

	// Filter data based on selected time range
	const filteredData = useMemo(() => {
		if (actionRateData.length === 0) return []

		const now = Date.now()
		const timeRangeMs = {
			'1m': 1 * 60 * 1000,
			'5m': 5 * 60 * 1000,
			'10m': 10 * 60 * 1000,
		}[timeRange]

		const cutoffTime = now - timeRangeMs
		return actionRateData.filter((dataPoint) => dataPoint.timestamp >= cutoffTime)
	}, [actionRateData, timeRange])

	// Build per-fairy datasets from action rate data with rolling window average
	const chartData = useMemo((): ChartData & { maxValue?: number } => {
		if (filteredData.length === 0) {
			return { labels: [], datasets: [], maxValue: 0 }
		}

		const ROLLING_WINDOW_SECONDS = 60

		// Get all unique fairy IDs across all data points
		const fairyMap = new Map<string, { name: string; color: string; values: number[] }>()

		// Initialize fairy map
		for (const dataPoint of filteredData) {
			for (const fairy of dataPoint.fairies) {
				if (!fairyMap.has(fairy.id)) {
					const color = fairyApp?.actionRateTracker?.getHatColorHex(fairy.hatColor) ?? '#888888'
					fairyMap.set(fairy.id, {
						name: fairy.name,
						color,
						values: [],
					})
				}
			}
		}

		// Calculate rolling average actions per minute for each data point
		filteredData.forEach((dataPoint, index) => {
			// Determine window start (60 seconds before current point)
			const windowStartTime = dataPoint.timestamp - ROLLING_WINDOW_SECONDS * 1000
			const windowStartIndex = filteredData.findIndex((dp) => dp.timestamp >= windowStartTime)
			const startIndex = windowStartIndex >= 0 ? windowStartIndex : 0

			// Calculate actions per minute for each fairy at this point
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
		const labels = filteredData.map(() => '')

		return { labels, datasets, maxValue }
	}, [filteredData, fairyApp])

	// Track previous maxYValue and timeRange to detect when we need to recreate chart
	const prevMaxYValueRef = useRef<number | undefined>(undefined)
	const prevTimeRangeRef = useRef<TimeRange>(timeRange)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current || chartData.datasets.length === 0) return

		// Calculate maxYValue dynamically based on rate values, with padding
		// Adds Y_AXIS_PADDING_MULTIPLIER (20%) to prevent lines from touching the top
		const maxYValue = chartData.maxValue
			? Math.ceil(chartData.maxValue * Y_AXIS_PADDING_MULTIPLIER)
			: undefined

		// Recreate chart if time range changed or maxYValue increased significantly
		const existingChart = chartInstanceRef.current
		const timeRangeChanged = prevTimeRangeRef.current !== timeRange

		if (
			timeRangeChanged ||
			shouldRecreateChart(existingChart, maxYValue, prevMaxYValueRef.current)
		) {
			if (existingChart) {
				existingChart.destroy()
				chartInstanceRef.current = null
			}
			prevTimeRangeRef.current = timeRange
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
	}, [chartData, timeRange])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.destroy()
				chartInstanceRef.current = null
			}
		}
	}, [])

	// Time range selector UI
	const timeRangeSelector = (
		<div className="fairy-chart-time-range-selector">
			{(['1m', '5m', '10m'] as TimeRange[]).map((range) => (
				<TldrawUiButton
					key={range}
					type={timeRange === range ? 'primary' : 'normal'}
					className="fairy-chart-time-range-button"
					onClick={() => setTimeRange(range)}
				>
					{range}
				</TldrawUiButton>
			))}
		</div>
	)

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title="Activity"
				isEmpty={actionRateData.length === 0}
				emptyMessage="Waiting for fairy actions..."
				headerActions={timeRangeSelector}
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}
