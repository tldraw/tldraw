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
	formatThousands,
	getClosestInArray,
	getZeroIndex,
	makePath,
	makeText,
	round,
	scale,
	truncateString,
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
	dotSize?: number
	showDots?: boolean
	showLegend?: boolean
	showTooltip?: boolean
	showGridLines?: boolean
	showXAxisLabels?: boolean
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
	private mousemoveHandler: ((e: MouseEvent) => void) | null = null
	private mouseleaveHandler: (() => void) | null = null

	constructor(container: HTMLElement, options: ChartOptions) {
		this.container = container
		this.data = deepClone(options.data)
		this.options = {
			height: 300,
			colors: DEFAULT_CHART_COLORS,
			dotSize: 4,
			showDots: true,
			showLegend: true,
			showTooltip: true,
			showGridLines: true,
			showXAxisLabels: true,
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
		// Use less bottom padding when X-axis labels are hidden
		const bottomPadding = this.options.showXAxisLabels ? this.paddings.bottom : 10
		this.chartHeight =
			this.height -
			this.margins.top -
			this.margins.bottom -
			this.paddings.top -
			bottomPadding -
			legendHeight
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

	private renderYAxis(group: SVGGElement): void {
		this.yAxis.positions.forEach((pos, i) => {
			if (this.options.showGridLines) {
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
			}

			const label = makeText('y-axis-label', -6, pos, formatThousands(this.yAxis.labels[i]), {
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
			if (this.options.showGridLines) {
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
			}

			if (this.options.showXAxisLabels) {
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
			}
		})
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

			// Create dots
			if (this.options.showDots) {
				yPositions.forEach((y, i) => {
					const dot = createSVGElement('circle', {
						className: `line-dot line-dot-${idx}`,
						cx: this.xAxis.positions[i],
						cy: y,
						r: this.options.dotSize,
						styles: {
							fill: color,
						},
						'data-index': i,
						'data-dataset': idx,
					})
					group.appendChild(dot)
				})
			}
		})
	}

	private renderLegend(group: SVGGElement): void {
		if (!this.options.showLegend) return

		const legendY = this.chartHeight + 25 // Reduced gap from chart
		const iconSize = 10
		const iconTextGap = 6 // Gap between color rect and label text
		const itemGap = 30 // Gap between legend items

		// Estimate text width (rough approximation: ~7px per character)
		const charWidth = 7
		const itemWidths = this.data.datasets.map((dataset) => {
			const textWidth = truncateString(dataset.name, 20).length * charWidth
			return iconSize + iconTextGap + textWidth
		})

		// Calculate total legend width
		const totalWidth =
			itemWidths.reduce((sum, w) => sum + w, 0) + itemGap * (this.data.datasets.length - 1)

		// Start position to center the legend
		let x = (this.chartWidth - totalWidth) / 2

		this.data.datasets.forEach((dataset, idx) => {
			const color = dataset.color || this.colors[idx % this.colors.length]

			const rect = createSVGElement('rect', {
				x: x,
				y: legendY,
				width: iconSize,
				height: iconSize,
				rx: 2,
				fill: color,
			})
			group.appendChild(rect)

			const label = makeText(
				'legend-label',
				x + iconSize + iconTextGap,
				legendY,
				truncateString(dataset.name, 20),
				{
					fontSize: 12,
					fill: '#666',
					dy: 8,
				}
			)
			group.appendChild(label)

			x += itemWidths[idx] + itemGap
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

		// Remove existing handlers if any
		if (this.mousemoveHandler) {
			this.container.removeEventListener('mousemove', this.mousemoveHandler)
		}
		if (this.mouseleaveHandler) {
			this.container.removeEventListener('mouseleave', this.mouseleaveHandler)
		}

		this.mousemoveHandler = (e: MouseEvent) => {
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

		this.mouseleaveHandler = () => {
			this.hideTooltip()
		}

		this.container.addEventListener('mousemove', this.mousemoveHandler)
		this.container.addEventListener('mouseleave', this.mouseleaveHandler)
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
          <strong>${formatThousands(value)}</strong>
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

		// Render components
		this.renderYAxis(mainGroup)
		this.renderXAxis(mainGroup)
		this.renderLines(mainGroup)
		this.renderLegend(mainGroup)

		this.svg.appendChild(mainGroup)
		this.container.appendChild(this.svg)

		// Setup tooltip
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
		// Remove tooltip event listeners
		if (this.mousemoveHandler) {
			this.container.removeEventListener('mousemove', this.mousemoveHandler)
			this.mousemoveHandler = null
		}
		if (this.mouseleaveHandler) {
			this.container.removeEventListener('mouseleave', this.mouseleaveHandler)
			this.mouseleaveHandler = null
		}
		this.container.innerHTML = ''
	}
}
