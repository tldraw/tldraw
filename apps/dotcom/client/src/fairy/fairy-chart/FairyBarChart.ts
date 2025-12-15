/**
 * FairyBarChart - Standalone Bar Chart Implementation
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
	getClosestInArray,
	getZeroIndex,
	isValidNumber,
	makeText,
	round,
	scale,
	truncateString,
} from './fairy-chart-utils'

// ============================================================================
// BAR CHART CLASS
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
	showLegend?: boolean
	showTooltip?: boolean
	barSpacing?: number
	stacked?: boolean
}

export class FairyBarChart {
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
	private paddings = { top: 20, bottom: 40, left: 50, right: 10 }
	private yAxis!: {
		labels: number[]
		positions: number[]
		scaleMultiplier: number
		zeroLine: number
	}
	private xAxis!: { labels: string[]; positions: number[] }
	private tooltip!: HTMLElement
	private tooltipShown = false
	private resizeHandler: () => void

	constructor(container: HTMLElement, options: ChartOptions) {
		this.container = container
		this.data = deepClone(options.data)
		this.options = {
			height: 300,
			colors: DEFAULT_CHART_COLORS,
			showLegend: true,
			showTooltip: true,
			barSpacing: 0.5,
			stacked: false,
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

		const legendHeight = this.options.showLegend ? 30 : 0
		this.chartHeight =
			this.height -
			this.margins.top -
			this.margins.bottom -
			this.paddings.top -
			this.paddings.bottom -
			legendHeight
		this.chartWidth =
			this.width - this.margins.left - this.margins.right - this.paddings.left - this.paddings.right
	}

	private calculateYAxis(): void {
		const allValues = this.data.datasets.flatMap((d) => d.values)
		const yIntervals = calcChartIntervals(allValues, false)
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
			className: 'fairy-bar-chart',
			width: this.width,
			height: this.height,
			styles: {
				overflow: 'visible',
			},
		}) as SVGSVGElement
	}

	private renderYAxis(group: SVGGElement): void {
		this.yAxis.positions.forEach((pos, i) => {
			const line = createSVGElement('line', {
				x1: 0,
				x2: this.chartWidth,
				y1: pos,
				y2: pos,
				styles: {
					stroke: '#E2E6E9',
					'stroke-width': '1',
				},
			})
			group.appendChild(line)

			const label = makeText('y-axis-label', -6, pos, round(this.yAxis.labels[i]).toString(), {
				fontSize: 10,
				fill: '#666',
				textAnchor: 'end',
				dy: 3,
			})
			group.appendChild(label)
		})
	}

	private renderXAxis(group: SVGGElement): void {
		const maxLabelLength = Math.floor(this.chartWidth / this.data.labels.length / 7)

		this.xAxis.positions.forEach((pos, i) => {
			const line = createSVGElement('line', {
				x1: pos,
				x2: pos,
				y1: 0,
				y2: this.chartHeight + 6,
				styles: {
					stroke: '#E2E6E9',
					'stroke-width': '1',
				},
			})
			group.appendChild(line)

			let label = this.xAxis.labels[i]
			if (label.length > maxLabelLength) {
				label = label.slice(0, maxLabelLength - 3) + '...'
			}

			const text = makeText('x-axis-label', pos, this.chartHeight + 6, label, {
				fontSize: 10,
				fill: '#666',
				textAnchor: 'middle',
				dy: 10,
			})
			group.appendChild(text)
		})
	}

	private renderBars(group: SVGGElement): void {
		const datasetLength = this.data.labels.length
		const unitWidth = this.chartWidth / datasetLength
		const barsWidth = unitWidth * (1 - this.options.barSpacing!)
		const numDatasets = this.data.datasets.length
		const barWidth = this.options.stacked ? barsWidth : barsWidth / numDatasets

		// Validate barWidth once before rendering any bars
		if (!isValidNumber(barWidth, true)) {
			return
		}

		this.data.datasets.forEach((dataset, datasetIdx) => {
			const color = dataset.color || this.colors[datasetIdx % this.colors.length]

			dataset.values.forEach((value, i) => {
				const yPos = scale(value, this.yAxis)
				const xPos = this.xAxis.positions[i]

				let barX: number
				if (this.options.stacked) {
					barX = xPos - barsWidth / 2
				} else {
					barX = xPos - barsWidth / 2 + barWidth * datasetIdx
				}

				let height: number
				let y: number
				if (yPos <= this.yAxis.zeroLine) {
					height = this.yAxis.zeroLine - yPos
					y = yPos
				} else {
					height = yPos - this.yAxis.zeroLine
					y = this.yAxis.zeroLine
				}

				if (!isValidNumber(barX)) barX = 0
				if (!isValidNumber(y)) y = 0
				if (!isValidNumber(height, true)) height = 0

				const rect = createSVGElement('rect', {
					className: `bar bar-${datasetIdx}`,
					x: barX,
					y: y,
					width: barWidth,
					height: height,
					styles: {
						fill: color,
					},
					'data-index': i,
					'data-dataset': datasetIdx,
				})
				group.appendChild(rect)
			})
		})
	}

	private renderLegend(group: SVGGElement): void {
		if (!this.options.showLegend) return

		const legendY = this.chartHeight + this.paddings.bottom + 10
		let x = 0
		const itemWidth = 150

		this.data.datasets.forEach((dataset, idx) => {
			const color = dataset.color || this.colors[idx % this.colors.length]

			const rect = createSVGElement('rect', {
				x: x,
				y: legendY,
				width: 12,
				height: 12,
				rx: 3,
				fill: color,
			})
			group.appendChild(rect)

			const label = makeText('legend-label', x + 12, legendY, truncateString(dataset.name, 20), {
				fontSize: 12,
				fill: '#666',
				dx: 8,
				dy: 9,
			})
			group.appendChild(label)

			x += itemWidth
		})
	}

	private createTooltip(): void {
		this.tooltip = document.createElement('div')
		this.tooltip.className = 'fairy-tooltip'
		this.tooltip.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
    `
		this.container.style.position = 'relative'
		this.container.appendChild(this.tooltip)
	}

	private setupTooltipEvents(): void {
		if (!this.options.showTooltip) return

		const mousemoveHandler = (e: MouseEvent) => {
			const rect = this.svg.getBoundingClientRect()
			const offsetX = this.margins.left + this.paddings.left
			const offsetY = this.margins.top + this.paddings.top
			const relX = e.clientX - rect.left - offsetX
			const relY = e.clientY - rect.top - offsetY

			if (relY >= 0 && relY <= this.chartHeight) {
				this.showTooltipAt(relX)
			} else {
				this.hideTooltip()
			}
		}

		const mouseleaveHandler = () => {
			this.hideTooltip()
		}

		this.container.addEventListener('mousemove', mousemoveHandler)
		this.container.addEventListener('mouseleave', mouseleaveHandler)
	}

	private showTooltipAt(relX: number): void {
		const index = getClosestInArray(relX, this.xAxis.positions)
		if (index < 0) return

		const label = this.data.labels[index]
		let html = `<div style="font-weight: bold; margin-bottom: 4px;">${label}</div>`

		this.data.datasets.forEach((dataset, idx) => {
			const color = dataset.color || this.colors[idx % this.colors.length]
			const value = dataset.values[index]
			html += `
        <div style="display: flex; align-items: center; margin-top: 4px;">
          <div style="width: 10px; height: 10px; background: ${color}; border-radius: 2px; margin-right: 6px;"></div>
          <span style="margin-right: 6px;">${dataset.name}:</span>
          <strong>${value}</strong>
        </div>
      `
		})

		this.tooltip.innerHTML = html
		this.tooltip.style.opacity = '1'

		const tooltipRect = this.tooltip.getBoundingClientRect()
		const containerRect = this.container.getBoundingClientRect()
		const xPos = this.xAxis.positions[index] + this.margins.left + this.paddings.left

		let left = xPos - tooltipRect.width / 2
		if (left < 0) left = 0
		if (left + tooltipRect.width > containerRect.width) {
			left = containerRect.width - tooltipRect.width
		}

		const yPositions = this.data.datasets.map((d) => scale(d.values[index], this.yAxis))
		const minY = Math.min(...yPositions)
		const top = minY + this.margins.top + this.paddings.top - tooltipRect.height - 10

		this.tooltip.style.left = left + 'px'
		this.tooltip.style.top = top + 'px'
		this.tooltipShown = true
	}

	private hideTooltip(): void {
		if (this.tooltipShown) {
			this.tooltip.style.opacity = '0'
			this.tooltipShown = false
		}
	}

	private render(): void {
		this.container.innerHTML = ''

		this.calculateDimensions()
		this.calculateYAxis()
		this.calculateXAxis()

		this.createSVGContainer()

		const mainGroup = createSVGElement('g', {
			transform: `translate(${this.margins.left + this.paddings.left}, ${
				this.margins.top + this.paddings.top
			})`,
		}) as SVGGElement

		this.renderYAxis(mainGroup)
		this.renderXAxis(mainGroup)
		this.renderBars(mainGroup)
		this.renderLegend(mainGroup)

		this.svg.appendChild(mainGroup)
		this.container.appendChild(this.svg)

		if (this.options.showTooltip) {
			this.createTooltip()
			this.setupTooltipEvents()
		}
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
