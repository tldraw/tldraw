import type { FairyHatColor } from '@tldraw/fairy-shared'
import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { HAT_COLOR_HEX } from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyHorizontalBarChart } from './FairyHorizontalBarChart'
import { filterProjectAgents, getFirstName } from './fairy-chart-helpers'

interface FairyCostSummaryChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

interface FairyCostData {
	id: string
	name: string
	hatColor: FairyHatColor
	cost: number
}

export function FairyCostSummaryChart({ orchestratorAgent, agents }: FairyCostSummaryChartProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyHorizontalBarChart | null>(null)

	// Get project to filter agents
	const project = useValue(
		'project',
		() => orchestratorAgent && orchestratorAgent.getProject(true),
		[orchestratorAgent]
	)

	// Get cumulative cost per fairy from their usage trackers
	const costData = useValue(
		'cost-data',
		(): FairyCostData[] => {
			if (!project) return []

			const projectAgents = filterProjectAgents(agents, project)

			const costs = projectAgents.flatMap((agent) => {
				const config = agent.getConfig()
				if (!config) return []

				const { totalCost } = agent.usage.getCumulativeCost()

				return [
					{
						id: agent.id,
						name: getFirstName(config.name),
						hatColor: config.hatColor,
						cost: totalCost,
					},
				]
			})

			// Sort by cost descending (leaderboard style)
			return costs.sort((a, b) => b.cost - a.cost)
		},
		[project, agents]
	)

	// Convert to chart data format with per-bar colors
	const chartData = useMemo(() => {
		if (costData.length === 0) {
			return { labels: [], datasets: [], barColors: [] }
		}

		return {
			labels: costData.map((fairy) => fairy.name),
			datasets: [
				{
					name: 'Cost',
					// Convert to cents for better readability of small values
					values: costData.map((fairy) => Math.round(fairy.cost * 100) / 100),
				},
			],
			barColors: costData.map((fairy) => HAT_COLOR_HEX[fairy.hatColor] ?? '#888888'),
		}
	}, [costData])

	// Calculate total cost for display
	const totalCost = useMemo(() => {
		return costData.reduce((sum, fairy) => sum + fairy.cost, 0)
	}, [costData])

	// Track previous bar count to detect when we need to recreate chart
	const prevBarCountRef = useRef<number>(0)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current) return

		// Need at least one fairy with cost to show chart
		const hasData = costData.length > 0 && costData.some((f) => f.cost > 0)
		if (!hasData) {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.destroy()
				chartInstanceRef.current = null
			}
			prevBarCountRef.current = 0
			return
		}

		// Recreate chart if number of bars changed (colors need to be re-applied)
		const barCountChanged = chartData.labels.length !== prevBarCountRef.current
		if (barCountChanged && chartInstanceRef.current) {
			chartInstanceRef.current.destroy()
			chartInstanceRef.current = null
		}
		prevBarCountRef.current = chartData.labels.length

		// Create or update chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = new FairyHorizontalBarChart(chartContainerRef.current, {
				data: { labels: chartData.labels, datasets: chartData.datasets },
				height: 180,
				showLegend: false,
				showTooltip: false,
				barColors: chartData.barColors,
			})
			return
		}

		chartInstanceRef.current.update(
			{ labels: chartData.labels, datasets: chartData.datasets },
			chartData.barColors
		)
	}, [chartData, costData])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.destroy()
				chartInstanceRef.current = null
			}
		}
	}, [])

	// Don't render if no project
	if (!project) {
		return null
	}

	// Check if there's any activity
	const hasActivity = costData.some((fairy) => fairy.cost > 0)
	const isEmpty = costData.length === 0 || !hasActivity

	// Format total cost for title
	const formattedTotal = totalCost > 0 ? ` — Total: $${totalCost.toFixed(2)}` : ''

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title={`Cost (USD)${formattedTotal}`}
				isEmpty={isEmpty}
				emptyMessage="Waiting for API usage..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}

