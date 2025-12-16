import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { useFairyApp } from '../fairy-app/FairyAppProvider'
import type { ActiveTimeDataPoint, FairyActiveData } from '../fairy-app/managers/FairyAppActiveTimeTracker'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyLineChart } from './FairyLineChart'
import { shouldRecreateChart } from './fairy-chart-helpers'
import type { ChartData, Dataset } from './fairy-chart-types'
import { useProjectChangeDetection } from './useProjectChangeDetection'

interface FairyActiveTimeChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

export function FairyActiveTimeChart({ orchestratorAgent, agents }: FairyActiveTimeChartProps) {
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
	const activeTimeData = useValue(
		'active-time-data',
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

	// Build per-fairy datasets showing rolling active time percentage
	const chartData = useMemo((): ChartData & { maxValue?: number } => {
		if (activeTimeData.length === 0) {
			return { labels: [], datasets: [], maxValue: 0 }
		}

		const ROLLING_WINDOW_SECONDS = 60

		// Get all unique fairy IDs across all data points
		const fairyMap = new Map<string, { name: string; color: string; values: number[] }>()

		// Initialize fairy map
		for (const dataPoint of activeTimeData) {
			for (const fairy of dataPoint.fairies) {
				if (!fairyMap.has(fairy.id)) {
					const color = fairyApp?.activeTimeTracker?.getHatColorHex(fairy.hatColor) ?? '#888888'
					fairyMap.set(fairy.id, {
						name: fairy.name,
						color,
						values: [],
					})
				}
			}
		}

		// Calculate rolling active percentage for each data point
		activeTimeData.forEach((dataPoint: ActiveTimeDataPoint, index: number) => {
			// Determine window start (60 seconds before current point)
			const windowStartTime = dataPoint.timestamp - ROLLING_WINDOW_SECONDS * 1000
			const windowStartIndex = activeTimeData.findIndex(
				(dp: ActiveTimeDataPoint) => dp.timestamp >= windowStartTime
			)
			const startIndex = windowStartIndex >= 0 ? windowStartIndex : 0

			// Calculate active percentage for each fairy at this point
			for (const [fairyId, fairyInfo] of fairyMap) {
				let activeSamples = 0
				let totalSamples = 0

				// Count active samples in the window for this fairy
				for (let i = startIndex; i <= index; i++) {
					const dp = activeTimeData[i]
					const fairyInDp = dp.fairies.find((f: FairyActiveData) => f.id === fairyId)
					if (fairyInDp) {
						totalSamples++
						if (fairyInDp.isActive) activeSamples++
					}
				}

				// Calculate percentage
				const activePercent = totalSamples > 0 ? (activeSamples / totalSamples) * 100 : 0
				fairyInfo.values.push(activePercent)
			}
		})

		// Build datasets
		const datasets: Dataset[] = []
		let maxValue = 0
		for (const [, data] of fairyMap) {
			const maxInDataset = Math.max(...data.values)
			maxValue = Math.max(maxValue, maxInDataset)

			datasets.push({
				name: data.name,
				values: data.values,
				color: data.color,
			})
		}

		const labels = activeTimeData.map(() => '')

		return { labels, datasets, maxValue }
	}, [activeTimeData, fairyApp])

	// Track previous maxYValue to detect when we need to recreate chart
	const prevMaxYValueRef = useRef<number | undefined>(undefined)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current || chartData.datasets.length === 0) return

		// Max is always 100% for percentage chart
		const maxYValue = 100

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
				showLegend: true,
				showTooltip: false,
				showGridLines: false,
				showXAxisLabels: false,
				maxYValue,
			})
			return
		}

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
				title="Active Time (%)"
				isEmpty={activeTimeData.length === 0}
				emptyMessage="Waiting for fairy activity..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}

