/**
 * Type definitions for line charts
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
	dotSize?: number
	showDots?: boolean
	showLegend?: boolean
	showTooltip?: boolean
	showGridLines?: boolean
	showXAxisLabels?: boolean
}
