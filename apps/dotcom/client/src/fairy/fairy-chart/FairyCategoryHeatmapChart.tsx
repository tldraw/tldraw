import { useEffect, useMemo, useRef } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import {
	ACTION_CATEGORY_KEYS,
	AgentActionCategory,
	CATEGORY_COLORS,
} from '../fairy-shared-constants'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { CategoryHeatmapData, FairyCategoryHeatmap } from './FairyCategoryHeatmap'
import { FairyChartContainer } from './FairyChartContainer'
import { countActionsByCategory, filterProjectAgents, getFirstName } from './fairy-chart-helpers'

interface FairyCategoryHeatmapChartProps {
	orchestratorAgent: FairyAgent | null
	agents: FairyAgent[]
}

interface FairyCategoryData {
	id: string
	name: string
	categoryCounts: Record<AgentActionCategory, number>
}

export function FairyCategoryHeatmapChart({
	orchestratorAgent,
	agents,
}: FairyCategoryHeatmapChartProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const chartInstanceRef = useRef<FairyCategoryHeatmap | null>(null)

	// Get project to filter agents
	const project = useValue(
		'project',
		() => orchestratorAgent && orchestratorAgent.getProject(true),
		[orchestratorAgent]
	)

	// Count actions by category per fairy
	const fairyCategoryData = useValue(
		'fairy-category-data',
		(): FairyCategoryData[] => {
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

			// Sort by total actions descending (most active fairies at top)
			return counts.sort((a, b) => {
				const totalA = Object.values(a.categoryCounts).reduce((sum, count) => sum + count, 0)
				const totalB = Object.values(b.categoryCounts).reduce((sum, count) => sum + count, 0)
				return totalB - totalA
			})
		},
		[project, agents]
	)

	// Transform to heatmap data format
	const heatmapData = useMemo((): CategoryHeatmapData => {
		if (fairyCategoryData.length === 0) {
			return {
				rows: [],
				columns: [],
				dataPoints: {},
			}
		}

		// Build rows (fairy names)
		const rows = fairyCategoryData.map((fairy) => fairy.name)

		// Build columns (all 5 action categories)
		const columns = [...ACTION_CATEGORY_KEYS] as string[]

		// Build dataPoints object ("rowIndex,colIndex" -> count)
		const dataPoints: Record<string, number> = {}
		fairyCategoryData.forEach((fairy, rowIdx) => {
			ACTION_CATEGORY_KEYS.forEach((category, colIdx) => {
				const count = fairy.categoryCounts[category] || 0
				dataPoints[`${rowIdx},${colIdx}`] = count
			})
		})

		return {
			rows,
			columns,
			dataPoints,
		}
	}, [fairyCategoryData])

	// Track previous data structure to detect when we need to recreate chart
	const prevStructureKeyRef = useRef<string>('')

	// Initialize and update chart
	useEffect(() => {
		if (!chartContainerRef.current) return

		// Need at least one fairy with actions to show chart
		const hasData = fairyCategoryData.length > 0
		if (!hasData) {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.destroy()
				chartInstanceRef.current = null
			}
			prevStructureKeyRef.current = ''
			return
		}

		// Create a key to detect structural changes (row/column count)
		const structureKey = `${heatmapData.rows.length}-${heatmapData.columns.length}`
		const structureChanged = structureKey !== prevStructureKeyRef.current

		// Recreate chart if structure changed (row or column count)
		if (structureChanged && chartInstanceRef.current) {
			chartInstanceRef.current.destroy()
			chartInstanceRef.current = null
		}
		prevStructureKeyRef.current = structureKey

		// Create or update chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = new FairyCategoryHeatmap(chartContainerRef.current, {
				data: heatmapData,
				height: 240,
				categoryColors: CATEGORY_COLORS,
				countLabel: 'actions',
				cellSize: 40,
				radius: 3,
			})
			return
		}

		chartInstanceRef.current.update(heatmapData)
	}, [heatmapData, fairyCategoryData])

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
	const isEmpty = fairyCategoryData.length === 0

	return (
		<ChartErrorBoundary>
			<FairyChartContainer
				title="Action categories"
				isEmpty={isEmpty}
				emptyMessage="Waiting for fairy actions..."
			>
				<div ref={chartContainerRef} className="fairy-activity-chart" />
			</FairyChartContainer>
		</ChartErrorBoundary>
	)
}
