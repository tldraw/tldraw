/**
 * Type definitions for line charts
 * No runtime code - just TypeScript interfaces
 */

/**
 * A single dataset (line series) in a chart
 */
export interface Dataset {
	/** Display name for this dataset */
	name: string
	/** Data values for each point in the series */
	values: number[]
	/** Optional color override (hex format) */
	color?: string
}

/**
 * Complete chart data including labels and all datasets
 */
export interface ChartData {
	/** X-axis labels for each data point */
	labels: string[]
	/** All datasets to display */
	datasets: Dataset[]
}

/**
 * Configuration options for chart rendering
 */
export interface ChartOptions {
	/** Chart data to display */
	data: ChartData
	/** Chart height in pixels (default: 300) */
	height?: number
	/** Default colors for datasets without explicit colors */
	colors?: string[]
	/** Size of data point dots in pixels (default: 4) */
	dotSize?: number
	/** Whether to show data point dots (default: true) */
	showDots?: boolean
	/** Whether to show legend (default: true) */
	showLegend?: boolean
	/** Whether to show tooltip on hover (default: true) */
	showTooltip?: boolean
	/** Whether to show grid lines (default: true) */
	showGridLines?: boolean
	/** Whether to show X-axis labels (default: true) */
	showXAxisLabels?: boolean
}
