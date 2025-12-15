import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { AgentActionCategory, CATEGORY_COLORS } from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { FairyChartContainer } from './FairyChartContainer'
import { FairyClusteredHorizontalBarChart } from './FairyClusteredHorizontalBarChart'
import { countActionsByCategory, filterProjectAgents, getFirstName } from './fairy-chart-helpers'

interface FairyActionsByTypeChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

interface FairyActionTypeCounts {
	id: string
	name: string
	categoryCounts: Record<AgentActionCategory, number>
}

export function FairyActionsByTypeChart({
	orchestratorAgent,
	agents,
}: FairyActionsByTypeChartProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyClusteredHorizontalBarChart | null>(null)

	// Get project to filter agents
	const project = useValue(
		'project',
		() => orchestratorAgent && orchestratorAgent.getProject(true),
		[orchestratorAgent]
	)

	// Count actions by category per fairy
	const actionTypeCounts = useValue(
		'action-type-counts',
		(): FairyActionTypeCounts[] => {
			if (!project) return []

			const projectAgents = filterProjectAgents(agents, project)

			const counts = projectAgents.flatMap((agent) => {
				const config = agent.getConfig()
				if (!config) return []

				const categoryCounts = countActionsByCategory(agent)

				// Only include fairies that have at least one action
				const totalActions = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)
				if (totalActions === 0) return []

				return [
					{
						id: agent.id,
						name: getFirstName(config.name),
						categoryCounts,
					},
				]
			})

			// Sort by total actions descending (leaderboard style)
			return counts.sort((a, b) => {
				const totalA = Object.values(a.categoryCounts).reduce((sum, count) => sum + count, 0)
				const totalB = Object.values(b.categoryCounts).reduce((sum, count) => sum + count, 0)
				return totalB - totalA
			})
		},
		[project, agents]
	)

	// Get all unique categories across all fairies, sorted by total usage
	const allCategories: AgentActionCategory[] = useMemo(() => {
		const categoryTotals: Partial<Record<AgentActionCategory, number>> = {}

		for (const fairy of actionTypeCounts) {
			for (const [_category, count] of Object.entries(fairy.categoryCounts)) {
				const category = _category as AgentActionCategory
				categoryTotals[category] = (categoryTotals[category] || 0) + count
			}
		}

		// Sort by total count descending, then by name for consistency
		return Object.entries(categoryTotals)
			.sort((a, b) => {
				if (b[1] !== a[1]) return b[1] - a[1]
				return a[0].localeCompare(b[0])
			})
			.map(([category]) => category as AgentActionCategory)
		// Show all 3 categories (or fewer if not all are present)
	}, [actionTypeCounts])

	// Convert to chart data format with multiple datasets (one per category)
	const chartData = useMemo(() => {
		if (actionTypeCounts.length === 0 || allCategories.length === 0) {
			return { labels: [], datasets: [] }
		}

		const datasets = allCategories.map((category) => ({
			name: category,
			values: actionTypeCounts.map((fairy) => fairy.categoryCounts[category] || 0),
			color: CATEGORY_COLORS[category] || '#888888',
		}))

		return {
			labels: actionTypeCounts.map((fairy) => fairy.name),
			datasets,
		}
	}, [actionTypeCounts, allCategories])

	// Track previous data structure to detect when we need to recreate chart
	const prevDataKeyRef = useRef<string>('')

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current) return

		// Need at least one fairy with actions to show chart
		const hasData =
			actionTypeCounts.length > 0 &&
			actionTypeCounts.some((f) => Object.values(f.categoryCounts).some((count) => count > 0))
		if (!hasData) {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.destroy()
				chartInstanceRef.current = null
			}
			prevDataKeyRef.current = ''
			return
		}

		// Create a key to detect structural changes (labels or datasets count)
		const dataKey = `${chartData.labels.length}-${chartData.datasets.length}`
		const dataKeyChanged = dataKey !== prevDataKeyRef.current

		// Recreate chart if structure changed (labels or datasets count)
		if (dataKeyChanged && chartInstanceRef.current) {
			chartInstanceRef.current.destroy()
			chartInstanceRef.current = null
		}
		prevDataKeyRef.current = dataKey

		// Create or update chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = new FairyClusteredHorizontalBarChart(chartContainerRef.current, {
				data: chartData,
				height: 180,
				showLegend: true,
				showTooltip: false,
				barSpacing: 0.15,
			})
			return
		}

		chartInstanceRef.current.update(chartData)
	}, [chartData, actionTypeCounts])

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
	const hasActivity = actionTypeCounts.some((fairy) =>
		Object.values(fairy.categoryCounts).some((count) => count > 0)
	)
	const isEmpty = actionTypeCounts.length === 0 || !hasActivity

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title="Actions by Type"
				isEmpty={isEmpty}
				emptyMessage="Waiting for fairy actions..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}
