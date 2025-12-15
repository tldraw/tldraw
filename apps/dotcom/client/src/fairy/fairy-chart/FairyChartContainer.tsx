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
	/** Chart content (rendered when not empty) */
	children: ReactNode
}

export function FairyChartContainer({
	title,
	isEmpty,
	emptyMessage = 'Waiting for data...',
	children,
}: FairyChartContainerProps) {
	if (isEmpty) {
		return (
			<div className="fairy-activity-chart-container">
				<div className="fairy-activity-chart-title">{title}</div>
				<div className="fairy-activity-chart-empty">
					<p>{emptyMessage}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="fairy-activity-chart-container">
			<div className="fairy-activity-chart-title">{title}</div>
			{children}
		</div>
	)
}
