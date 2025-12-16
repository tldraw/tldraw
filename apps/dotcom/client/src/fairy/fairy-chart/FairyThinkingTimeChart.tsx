import type { FairyHatColor, ThinkAction } from '@tldraw/fairy-shared'
import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { HAT_COLOR_HEX } from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyHorizontalBarChart } from './FairyHorizontalBarChart'
import { filterProjectAgents, getFirstName } from './fairy-chart-helpers'

interface FairyThinkingTimeChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

interface FairyThinkingData {
	id: string
	name: string
	hatColor: FairyHatColor
	thinkingTimeSeconds: number
}

/**
 * Get total thinking time (in seconds) from a fairy's chat history
 */
function getThinkingTime(agent: FairyAgent): number {
	const history = agent.chat.getHistory()
	let totalMs = 0

	for (const item of history) {
		if (item.type === 'action' && item.action._type === 'think' && item.action.complete) {
			const thinkAction = item.action as ThinkAction & { time?: number }
			if (thinkAction.time) {
				totalMs += thinkAction.time
			}
		}
	}

	return Math.round(totalMs / 1000)
}

export function FairyThinkingTimeChart({ orchestratorAgent, agents }: FairyThinkingTimeChartProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyHorizontalBarChart | null>(null)

	// Get project to filter agents
	const project = useValue(
		'project',
		() => orchestratorAgent && orchestratorAgent.getProject(true),
		[orchestratorAgent]
	)

	// Get thinking time per fairy from their chat history
	const thinkingData = useValue(
		'thinking-time',
		(): FairyThinkingData[] => {
			if (!project) return []

			const projectAgents = filterProjectAgents(agents, project)

			const data = projectAgents.flatMap((agent) => {
				const config = agent.getConfig()
				if (!config) return []

				return [
					{
						id: agent.id,
						name: getFirstName(config.name),
						hatColor: config.hatColor,
						thinkingTimeSeconds: getThinkingTime(agent),
					},
				]
			})

			// Sort by thinking time descending
			return data.sort((a, b) => b.thinkingTimeSeconds - a.thinkingTimeSeconds)
		},
		[project, agents]
	)

	// Convert to chart data format with per-bar colors
	const chartData = useMemo(() => {
		if (thinkingData.length === 0) {
			return { labels: [], datasets: [], barColors: [] }
		}

		return {
			labels: thinkingData.map((fairy: FairyThinkingData) => fairy.name),
			datasets: [
				{
					name: 'Thinking Time',
					values: thinkingData.map((fairy: FairyThinkingData) => fairy.thinkingTimeSeconds),
				},
			],
			barColors: thinkingData.map(
				(fairy: FairyThinkingData) => HAT_COLOR_HEX[fairy.hatColor] ?? '#888888'
			),
		}
	}, [thinkingData])

	// Calculate total thinking time for display
	const totalThinkingTime = useMemo(() => {
		return thinkingData.reduce(
			(sum: number, fairy: FairyThinkingData) => sum + fairy.thinkingTimeSeconds,
			0
		)
	}, [thinkingData])

	// Track previous bar count to detect when we need to recreate chart
	const prevBarCountRef = useRef<number>(0)

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current) return

		// Need at least one fairy with thinking time to show chart
		const hasData =
			thinkingData.length > 0 &&
			thinkingData.some((f: FairyThinkingData) => f.thinkingTimeSeconds > 0)
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
	}, [chartData, thinkingData])

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
	const hasActivity = thinkingData.some((fairy: FairyThinkingData) => fairy.thinkingTimeSeconds > 0)
	const isEmpty = thinkingData.length === 0 || !hasActivity

	// Format total for title
	const formattedTotal = totalThinkingTime > 0 ? ` — Total: ${totalThinkingTime}s` : ''

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title={`Thinking Time (seconds)${formattedTotal}`}
				isEmpty={isEmpty}
				emptyMessage="Waiting for fairy thinking..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}
