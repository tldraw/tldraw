import type { FairyHatColor } from '@tldraw/fairy-shared'
import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { HAT_COLOR_HEX } from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyHorizontalBarChart } from './FairyHorizontalBarChart'
import { countCompletedActions, filterProjectAgents, getFirstName } from './fairy-chart-helpers'

interface FairyActionsChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

interface FairyActionCount {
	id: string
	name: string
	hatColor: FairyHatColor
	count: number
}

export function FairyActionsChart({ orchestratorAgent, agents }: FairyActionsChartProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyHorizontalBarChart | null>(null)

	// Get project to filter agents
	const project = useValue(
		'project',
		() => orchestratorAgent && orchestratorAgent.getProject(true),
		[orchestratorAgent]
	)

	// Count completed actions per fairy from their chat history
	const actionCounts = useValue(
		'action-counts',
		(): FairyActionCount[] => {
			if (!project) return []

			const projectAgents = filterProjectAgents(agents, project)

			const counts = projectAgents.flatMap((agent) => {
				const config = agent.getConfig()
				if (!config) return []

				return [
					{
						id: agent.id,
						name: getFirstName(config.name),
						hatColor: config.hatColor,
						count: countCompletedActions(agent),
					},
				]
			})

			// Sort by count descending (leaderboard style)
			return counts.sort((a, b) => b.count - a.count)
		},
		[project, agents]
	)

	// Convert to chart data format with per-bar colors
	const chartData = useMemo(() => {
		if (actionCounts.length === 0) {
			return { labels: [], datasets: [], barColors: [] }
		}

		return {
			labels: actionCounts.map((fairy) => fairy.name),
			datasets: [
				{
					name: 'Actions',
					values: actionCounts.map((fairy) => fairy.count),
				},
			],
			barColors: actionCounts.map((fairy) => HAT_COLOR_HEX[fairy.hatColor] ?? '#888888'),
		}
	}, [actionCounts])

	// Track previous bar count to detect when we need to recreate chart
	const prevBarCountRef = useRef<number>(0)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current) return

		// Need at least one fairy with actions to show chart
		const hasData = actionCounts.length > 0 && actionCounts.some((f) => f.count > 0)
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
	}, [chartData, actionCounts])

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
	const hasActivity = actionCounts.some((fairy) => fairy.count > 0)
	const isEmpty = actionCounts.length === 0 || !hasActivity

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title="Actions Completed"
				isEmpty={isEmpty}
				emptyMessage="Waiting for fairy actions..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}
