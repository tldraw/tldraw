/**
 * Shared container component for fairy activity charts
 *
 * Provides consistent layout, title, and empty state handling
 * across all chart types.
 */

import { ReactNode } from 'react'

interface FairyChartContainerProps {
	/** Chart title displayed above the chart */
	title: string
	/** Whether the chart has no data to display */
	isEmpty: boolean
	/** Custom message to show when empty (default: "Waiting for data...") */
	emptyMessage?: string
	/** Optional actions to display alongside the title */
	headerActions?: ReactNode
	/** Chart content (rendered when not empty) */
	children: ReactNode
}

export function FairyChartContainer({
	title,
	isEmpty,
	emptyMessage = 'Waiting for data...',
	headerActions,
	children,
}: FairyChartContainerProps) {
	const header = (
		<div className="fairy-activity-chart-header">
			<div className="fairy-activity-chart-title">{title}</div>
			{headerActions && <div className="fairy-activity-chart-actions">{headerActions}</div>}
		</div>
	)

	return (
		<div className="fairy-activity-chart-container">
			{header}
			{isEmpty ? (
				<div className="fairy-activity-chart-empty">
					<p>{emptyMessage}</p>
				</div>
			) : (
				children
			)}
		</div>
	)
}
