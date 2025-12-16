import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { useFairyApp } from '../fairy-app/FairyAppProvider'
import type { ActiveTimeDataPoint } from '../fairy-app/managers/FairyAppActiveTimeTracker'
import { Y_AXIS_PADDING_MULTIPLIER } from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyLineChart } from './FairyLineChart'
import { shouldRecreateChart } from './fairy-chart-helpers'
import type { ChartData, Dataset } from './fairy-chart-types'
import { useProjectChangeDetection } from './useProjectChangeDetection'

interface FairyConcurrentActiveChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyConcurrentActiveChart({
	orchestratorAgent,
	agents,
}: FairyConcurrentActiveChartProps) {
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
		if (chartInstanceRef.current) {
			chartInstanceRef.current.destroy()
			chartInstanceRef.current = null
		}
	})

	// Get active time data from tracker (subscribe to atom changes)
	// Reuses the same tracker as FairyActiveTimeChart
	const activeTimeData = useValue(
		'active-time-data-concurrent',
		() => {
			if (!fairyApp?.activeTimeTracker) return []
			return fairyApp.activeTimeTracker.getDataPointsAtom().get()
		},
		[fairyApp]
	)

	// Start/stop tracking based on project existence
	useEffect(() => {
		if (!fairyApp?.activeTimeTracker) {
			return
		}

		// Stop tracking if no project (project ended)
		if (!project) {
			fairyApp.activeTimeTracker.stopTracking()
			return
		}

		// Start tracking with project agents, passing project ID for automatic reset
		fairyApp.activeTimeTracker.startTracking(() => {
			const currentProject = orchestratorAgent?.getProject(true)
			if (!currentProject) return []

			// Filter to project members
			return agents.filter((agent) => {
				const isMember = currentProject.members.some((m) => m.id === agent.id)
				return isMember
			})
		}, project.id)
	}, [fairyApp, project, agents, orchestratorAgent])

	// Get total fairy count for context
	const totalFairyCount = useMemo(() => {
		if (activeTimeData.length === 0) return 0
		const lastDataPoint = activeTimeData[activeTimeData.length - 1]
		return lastDataPoint.fairies.length
	}, [activeTimeData])

	// Build single dataset showing concurrent active count over time
	const chartData = useMemo((): ChartData & { maxValue?: number } => {
		if (activeTimeData.length === 0) {
			return { labels: [], datasets: [], maxValue: 0 }
		}

		const ROLLING_WINDOW_SECONDS = 10 // Shorter window for more responsive display

		// Calculate smoothed concurrent active count for each data point
		const smoothedValues: number[] = []

		activeTimeData.forEach((dataPoint: ActiveTimeDataPoint, index: number) => {
			// Determine window start (10 seconds before current point)
			const windowStartTime = dataPoint.timestamp - ROLLING_WINDOW_SECONDS * 1000
			const windowStartIndex = activeTimeData.findIndex(
				(dp: ActiveTimeDataPoint) => dp.timestamp >= windowStartTime
			)
			const startIndex = windowStartIndex >= 0 ? windowStartIndex : 0

			// Calculate average concurrent count in the window
			let totalConcurrent = 0
			let sampleCount = 0

			for (let i = startIndex; i <= index; i++) {
				totalConcurrent += activeTimeData[i].concurrentActiveCount
				sampleCount++
			}

			const avgConcurrent = sampleCount > 0 ? totalConcurrent / sampleCount : 0
			smoothedValues.push(avgConcurrent)
		})

		const maxValue = Math.max(...smoothedValues, 1) // At least 1 for scale

		const datasets: Dataset[] = [
			{
				name: 'Active Fairies',
				values: smoothedValues,
				color: '#22c55e', // Green color for active count
			},
		]

		const labels = activeTimeData.map(() => '')

		return { labels, datasets, maxValue }
	}, [activeTimeData])

	// Track previous maxYValue to detect when we need to recreate chart
	const prevMaxYValueRef = useRef<number | undefined>(undefined)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current || chartData.datasets.length === 0) return

		// Calculate maxYValue with padding, minimum of total fairy count
		const maxYValue = Math.max(
			Math.ceil((chartData.maxValue ?? 1) * Y_AXIS_PADDING_MULTIPLIER),
			totalFairyCount
		)

		// Only recreate chart if maxYValue increased significantly
		const existingChart = chartInstanceRef.current
		if (shouldRecreateChart(existingChart, maxYValue, prevMaxYValueRef.current)) {
			existingChart!.destroy()
			chartInstanceRef.current = null
		}

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
				showLegend: false, // Single dataset, no legend needed
				showTooltip: false,
				showGridLines: false,
				showXAxisLabels: false,
				maxYValue,
			})
			return
		}

		chartInstanceRef.current.update(chartData)
	}, [chartData, totalFairyCount])

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

	// Format title with total count for context
	const title = totalFairyCount > 0 ? `Concurrent Active (of ${totalFairyCount})` : 'Concurrent Active'

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title={title}
				isEmpty={activeTimeData.length === 0}
				emptyMessage="Waiting for fairy activity..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}

