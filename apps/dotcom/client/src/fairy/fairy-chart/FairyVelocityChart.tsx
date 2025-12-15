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

interface FairyVelocityChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyVelocityChart({ orchestratorAgent, agents }: FairyVelocityChartProps) {
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

	// Get velocity data from tracker (subscribe to atom changes)
	const velocityData = useValue(
		'velocity-data',
		() => {
			if (!fairyApp?.velocityTracker) return []
			return fairyApp.velocityTracker.getDataPointsAtom().get()
		},
		[fairyApp]
	)

	// Start/stop tracking based on project existence
	useEffect(() => {
		if (!fairyApp?.velocityTracker) {
			return
		}

		// Stop tracking if no project (project ended)
		if (!project) {
			fairyApp.velocityTracker.stopTracking()
			return
		}

		// Start tracking with project agents, passing project ID for automatic reset
		// Note: tracking continues even when dialog closes, so we capture full history
		fairyApp.velocityTracker.startTracking(() => {
			const currentProject = orchestratorAgent?.getProject(true)
			if (!currentProject) return []

			// Filter to project members (always include all members)
			return agents.filter((agent) => {
				const isMember = currentProject.members.some((m) => m.id === agent.id)
				return isMember
			})
		}, project.id)
	}, [fairyApp, project, agents, orchestratorAgent])

	// Build per-fairy datasets from velocity data (cumulative)
	const chartData = useMemo((): ChartData & { maxCumulativeValue?: number } => {
		if (velocityData.length === 0) {
			return { labels: [], datasets: [], maxCumulativeValue: 0 }
		}

		// Get all unique fairy IDs across all data points
		const fairyMap = new Map<string, { name: string; color: string; values: (number | null)[] }>()

		// Initialize with empty values for each data point
		for (const dataPoint of velocityData) {
			for (const fairy of dataPoint.fairies) {
				if (!fairyMap.has(fairy.id)) {
					const color = fairyApp?.velocityTracker?.getHatColorHex(fairy.hatColor) ?? '#888888'
					fairyMap.set(fairy.id, {
						name: fairy.name,
						color,
						values: new Array(velocityData.length).fill(null),
					})
				}
			}
		}

		// Fill in values and make them cumulative
		const cumulativeTotals = new Map<string, number>()
		velocityData.forEach((dataPoint, index) => {
			for (const fairy of dataPoint.fairies) {
				const fairyData = fairyMap.get(fairy.id)
				if (fairyData) {
					// Add to cumulative total for this fairy
					const currentTotal = cumulativeTotals.get(fairy.id) || 0
					const newTotal = currentTotal + fairy.distance
					cumulativeTotals.set(fairy.id, newTotal)
					fairyData.values[index] = newTotal
				}
			}
		})

		// Build datasets with cumulative values
		const datasets: Dataset[] = []
		let maxCumulativeValue = 0
		for (const [, data] of fairyMap) {
			const cumulativeValues = data.values.map((v) => v ?? 0)
			// Track the maximum cumulative value for y-axis scaling
			const maxValue = Math.max(...cumulativeValues)
			maxCumulativeValue = Math.max(maxCumulativeValue, maxValue)
			datasets.push({
				name: data.name,
				values: cumulativeValues,
				color: data.color,
			})
		}

		// Simple labels - just show start and end time, or nothing
		const labels = velocityData.map(() => '')

		return { labels, datasets, maxCumulativeValue }
	}, [velocityData, fairyApp])

	// Track previous maxYValue to detect when we need to recreate chart
	const prevMaxYValueRef = useRef<number | undefined>(undefined)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current || chartData.datasets.length === 0) return

		// Calculate maxYValue dynamically based on cumulative values, with padding
		// Adds Y_AXIS_PADDING_MULTIPLIER (20%) to prevent lines from touching the top
		const maxYValue = chartData.maxCumulativeValue
			? Math.ceil(chartData.maxCumulativeValue * Y_AXIS_PADDING_MULTIPLIER)
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

		// Update chart with new cumulative data
		// Note: Values exceeding maxYValue will be clamped by calculateYAxis
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
				title="Distance Covered (px)"
				isEmpty={velocityData.length === 0}
				emptyMessage="Waiting for fairy movement..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}
