/**
 * Type definitions for bar charts
 * No runtime code - just TypeScript interfaces
 */

export interface Dataset {
	name: string
	values: number[]
	color?: string
}

export interface ChartData {
	labels: string[]
	datasets: Dataset[]
}

export interface ChartOptions {
	data: ChartData
	height?: number
	colors?: string[]
	showLegend?: boolean
	showTooltip?: boolean
	barSpacing?: number
	stacked?: boolean
}
