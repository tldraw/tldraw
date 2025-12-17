/**
 * FairyLineChart - Standalone Line Chart Implementation
 * Customized for Fairy activity monitoring
 *
 * Inspired by Frappe Charts (https://frappe.io/charts)
 */

import { DEFAULT_CHART_COLORS } from '../fairy-shared-constants'
import {
	calcChartIntervals,
	createSVGElement,
	deepClone,
	floatTwo,
	getZeroIndex,
	makePath,
	scale,
} from './fairy-chart-utils'

// ============================================================================
// LINE CHART CLASS
// ============================================================================

interface Dataset {
	name: string
	values: number[]
	color?: string
}

interface ChartData {
	labels: string[]
	datasets: Dataset[]
}

interface ChartOptions {
	data: ChartData
	height?: number
	colors?: string[]
	maxYValue?: number // Cap the Y-axis at this value
}

export class FairyLineChart {
	private container: HTMLElement
	private svg!: SVGSVGElement
	private data: ChartData
	private options: ChartOptions
	private colors: string[]
	private width = 0
	private height = 0
	private chartHeight = 0
	private chartWidth = 0
	private margins = { top: 10, bottom: 10, left: 20, right: 20 }
	private paddings = { top: 20, bottom: 10, left: 0, right: 0 }
	private yAxis!: {
		labels: number[]
		positions: number[]
		scaleMultiplier: number
		zeroLine: number
	}
	private xAxis!: { labels: string[]; positions: number[] }
	private resizeHandler: () => void

	constructor(container: HTMLElement, options: ChartOptions) {
		this.container = container
		this.data = deepClone(options.data)
		this.options = {
			height: 300,
			colors: DEFAULT_CHART_COLORS,
			...options,
		}
		this.colors = this.options.colors!

		this.resizeHandler = () => this.handleResize()
		window.addEventListener('resize', this.resizeHandler)

		this.render()
	}

	private handleResize(): void {
		this.render()
	}

	private calculateDimensions(): void {
		const rect = this.container.getBoundingClientRect()
		this.width = rect.width
		this.height = this.options.height!

		this.chartHeight =
			this.height -
			this.margins.top -
			this.margins.bottom -
			this.paddings.top -
			this.paddings.bottom
		this.chartWidth =
			this.width - this.margins.left - this.margins.right - this.paddings.left - this.paddings.right
	}

	private calculateYAxis(): void {
		const allValues = this.data.datasets.flatMap((d) => d.values)
		let maxValue = Math.max(...allValues)

		// Cap the max value if maxYValue is set
		if (this.options.maxYValue !== undefined && maxValue > this.options.maxYValue) {
			maxValue = this.options.maxYValue
		}

		// Use a minimum max value to avoid flat lines when all values are 0 or very small
		const effectiveMax = Math.max(maxValue, 10)
		const yIntervals = calcChartIntervals([0, effectiveMax], false)

		const scaleMultiplier = this.chartHeight / (yIntervals[yIntervals.length - 1] - yIntervals[0])
		const intervalHeight = (yIntervals[1] - yIntervals[0]) * scaleMultiplier
		const zeroLine = this.chartHeight - getZeroIndex(yIntervals) * intervalHeight

		this.yAxis = {
			labels: yIntervals,
			positions: yIntervals.map((d) => zeroLine - d * scaleMultiplier),
			scaleMultiplier,
			zeroLine,
		}
	}

	private calculateXAxis(): void {
		const datasetLength = this.data.labels.length
		const unitWidth = this.chartWidth / datasetLength
		const xOffset = unitWidth / 2

		this.xAxis = {
			labels: this.data.labels,
			positions: this.data.labels.map((_, i) => floatTwo(xOffset + i * unitWidth)),
		}
	}

	private createSVGContainer(): void {
		this.svg = createSVGElement('svg', {
			className: 'fairy-line-chart',
			width: this.width,
			height: this.height,
			styles: {
				overflow: 'visible',
			},
		}) as SVGSVGElement
	}

	private renderLines(group: SVGGElement): void {
		this.data.datasets.forEach((dataset, idx) => {
			const color = dataset.color || this.colors[idx % this.colors.length]
			// Clamp values to maxYValue if set, so spikes don't overflow the chart
			const clampedValues = dataset.values.map((val) => {
				if (this.options.maxYValue !== undefined && val > this.options.maxYValue) {
					return this.options.maxYValue
				}
				return val
			})
			const yPositions = clampedValues.map((val) => scale(val, this.yAxis))

			// Create line path
			const pointsList = yPositions.map((y, i) => `${this.xAxis.positions[i]},${y}`)
			const pathStr = 'M' + pointsList.join('L')
			const path = makePath(pathStr, `line-path-${idx}`, color, 'none', 2)
			group.appendChild(path)
		})
	}

	private render(): void {
		// Clear container
		this.container.innerHTML = ''

		// Calculate dimensions
		this.calculateDimensions()
		this.calculateYAxis()
		this.calculateXAxis()

		// Create SVG
		this.createSVGContainer()

		// Create main group with offset
		const mainGroup = createSVGElement('g', {
			transform: `translate(${this.margins.left + this.paddings.left}, ${this.margins.top + this.paddings.top})`,
		}) as SVGGElement

		// Render lines
		this.renderLines(mainGroup)

		this.svg.appendChild(mainGroup)
		this.container.appendChild(this.svg)
	}

	public update(data: ChartData): void {
		this.data = deepClone(data)
		this.render()
	}

	public destroy(): void {
		window.removeEventListener('resize', this.resizeHandler)
		this.container.innerHTML = ''
	}
}
