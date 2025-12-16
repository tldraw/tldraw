import type { FairyHatColor } from '@tldraw/fairy-shared'
import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { HAT_COLOR_HEX } from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyHorizontalBarChart } from './FairyHorizontalBarChart'
import { filterProjectAgents, getFirstName } from './fairy-chart-helpers'

interface FairyInterActionGapChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

interface FairyGapData {
	id: string
	name: string
	hatColor: FairyHatColor
	avgGapSeconds: number // Average time between completed actions
	actionCount: number // Number of actions (for context)
}

/**
 * Calculate average gap between completed actions for a fairy.
 * Returns average gap in seconds, or 0 if not enough actions.
 */
function calculateAverageActionGap(agent: FairyAgent): { avgGapSeconds: number; actionCount: number } {
	const history = agent.chat.getHistory()

	// Get timestamps of all completed actions
	const actionTimestamps: number[] = []

	for (const item of history) {
		if (item.type === 'action' && item.action.complete && item.timestamp) {
			actionTimestamps.push(item.timestamp)
		}
	}

	// Need at least 2 actions to calculate gaps
	if (actionTimestamps.length < 2) {
		return { avgGapSeconds: 0, actionCount: actionTimestamps.length }
	}

	// Sort timestamps in case they're not in order
	actionTimestamps.sort((a, b) => a - b)

	// Calculate gaps between consecutive actions
	const gaps: number[] = []
	for (let i = 1; i < actionTimestamps.length; i++) {
		const gap = actionTimestamps[i] - actionTimestamps[i - 1]
		gaps.push(gap)
	}

	// Calculate average gap in seconds
	const totalGap = gaps.reduce((sum, gap) => sum + gap, 0)
	const avgGapMs = totalGap / gaps.length
	const avgGapSeconds = Math.round(avgGapMs / 100) / 10 // Round to 1 decimal place

	return { avgGapSeconds, actionCount: actionTimestamps.length }
}

export function FairyInterActionGapChart({
	orchestratorAgent,
	agents,
}: FairyInterActionGapChartProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyHorizontalBarChart | null>(null)

	// Get project to filter agents
	const project = useValue(
		'project',
		() => orchestratorAgent && orchestratorAgent.getProject(true),
		[orchestratorAgent]
	)

	// Calculate average inter-action gap per fairy from their chat history
	const gapData = useValue(
		'inter-action-gap-data',
		(): FairyGapData[] => {
			if (!project) return []

			const projectAgents = filterProjectAgents(agents, project)

			const data = projectAgents.flatMap((agent) => {
				const config = agent.getConfig()
				if (!config) return []

				const { avgGapSeconds, actionCount } = calculateAverageActionGap(agent)

				// Only include fairies with at least 2 actions (need gaps to show)
				if (actionCount < 2) return []

				return [
					{
						id: agent.id,
						name: getFirstName(config.name),
						hatColor: config.hatColor,
						avgGapSeconds,
						actionCount,
					},
				]
			})

			// Sort by average gap ascending (fastest responders at top)
			return data.sort((a, b) => a.avgGapSeconds - b.avgGapSeconds)
		},
		[project, agents]
	)

	// Convert to chart data format with per-bar colors
	const chartData = useMemo(() => {
		if (gapData.length === 0) {
			return { labels: [], datasets: [], barColors: [] }
		}

		return {
			labels: gapData.map((fairy: FairyGapData) => fairy.name),
			datasets: [
				{
					name: 'Avg Gap',
					values: gapData.map((fairy: FairyGapData) => fairy.avgGapSeconds),
				},
			],
			barColors: gapData.map(
				(fairy: FairyGapData) => HAT_COLOR_HEX[fairy.hatColor] ?? '#888888'
			),
		}
	}, [gapData])

	// Calculate overall average for display
	const overallAvgGap = useMemo(() => {
		if (gapData.length === 0) return 0
		const totalGap = gapData.reduce(
			(sum: number, fairy: FairyGapData) => sum + fairy.avgGapSeconds,
			0
		)
		return Math.round((totalGap / gapData.length) * 10) / 10
	}, [gapData])

	// Track previous bar count to detect when we need to recreate chart
	const prevBarCountRef = useRef<number>(0)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current) return

		// Need at least one fairy with gap data to show chart
		const hasData =
			gapData.length > 0 && gapData.some((f: FairyGapData) => f.avgGapSeconds > 0)
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
	}, [chartData, gapData])

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
	const hasActivity = gapData.some((fairy: FairyGapData) => fairy.avgGapSeconds > 0)
	const isEmpty = gapData.length === 0 || !hasActivity

	// Format title with overall average
	const formattedAvg = overallAvgGap > 0 ? ` — Avg: ${overallAvgGap}s` : ''

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title={`Inter-Action Gap (seconds)${formattedAvg}`}
				isEmpty={isEmpty}
				emptyMessage="Need 2+ actions per fairy..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}

