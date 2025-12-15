/**
 * FairyClusteredHorizontalBarChart - Clustered Horizontal Bar Chart Implementation
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
	isValidNumber,
	makeText,
	round,
	truncateString,
} from './fairy-chart-utils'

// ============================================================================
// CLUSTERED HORIZONTAL BAR CHART CLASS
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
}

export class FairyClusteredHorizontalBarChart {
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
	private paddings = { top: 20, bottom: 30, left: 80, right: 20 }
	private xAxis!: {
		labels: number[]
		positions: number[]
		scaleMultiplier: number
		zeroLine: number
	}
	private yAxis!: { labels: string[]; positions: number[] }
	private tooltip!: HTMLElement
	private tooltipShown = false
	private resizeHandler: () => void
	private mousemoveHandler: ((e: MouseEvent) => void) | null = null
	private mouseleaveHandler: (() => void) | null = null

	constructor(container: HTMLElement, options: ChartOptions) {
		this.container = container
		this.data = deepClone(options.data)
		this.options = {
			height: 180,
			colors: DEFAULT_CHART_COLORS,
			showLegend: true,
			showTooltip: true,
			barSpacing: 0.15,
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

	/**
	 * Calculate X-axis (values) - horizontal scale for bar lengths
	 */
	private calculateXAxis(): void {
		const allValues = this.data.datasets.flatMap((d) => d.values)
		// Always start from 0 for horizontal bar charts
		const xIntervals = calcChartIntervals([0, ...allValues], false)
		const scaleMultiplier = this.chartWidth / (xIntervals[xIntervals.length - 1] - xIntervals[0])

		// Zero line is at the left edge (x = 0)
		const zeroIndex = xIntervals.indexOf(0) >= 0 ? xIntervals.indexOf(0) : 0
		const zeroLine = zeroIndex * ((xIntervals[1] - xIntervals[0]) * scaleMultiplier)

		this.xAxis = {
			labels: xIntervals,
			positions: xIntervals.map((d) => floatTwo(d * scaleMultiplier)),
			scaleMultiplier,
			zeroLine,
		}
	}

	/**
	 * Calculate Y-axis (categories) - vertical positions for labels
	 */
	private calculateYAxis(): void {
		const numLabels = this.data.labels.length
		const unitHeight = this.chartHeight / numLabels
		const yOffset = unitHeight / 2

		this.yAxis = {
			labels: this.data.labels,
			positions: this.data.labels.map((_, i) => floatTwo(yOffset + i * unitHeight)),
		}
	}

	private createSVGContainer(): void {
		this.svg = createSVGElement('svg', {
			className: 'fairy-clustered-horizontal-bar-chart',
			width: this.width,
			height: this.height,
			styles: {
				overflow: 'visible',
			},
		}) as SVGSVGElement
	}

	/**
	 * Render X-axis (value axis at bottom) - labels only, no grid lines
	 */
	private renderXAxis(group: SVGGElement): void {
		this.xAxis.positions.forEach((pos, i) => {
			// X-axis labels at bottom (no grid lines)
			const label = makeText(
				'x-axis-label',
				pos,
				this.chartHeight + 6,
				round(this.xAxis.labels[i]).toString(),
				{ fontSize: 10, fill: '#666', textAnchor: 'middle', dy: 10 }
			)
			group.appendChild(label)
		})
	}

	/**
	 * Render Y-axis (category labels on left) - labels only, no grid lines
	 * Labels are positioned to align with the center of each cluster
	 */
	private renderYAxis(group: SVGGElement): void {
		this.yAxis.positions.forEach((pos, i) => {
			// Labels are centered on the slot position (same as cluster center)
			const label = makeText('y-axis-label', -8, pos, truncateString(this.yAxis.labels[i], 12), {
				fontSize: 11,
				fill: '#666',
				textAnchor: 'end',
				dy: 4,
			})
			group.appendChild(label)
		})
	}

	/**
	 * Render clustered horizontal bars
	 * Multiple bars per label, positioned side-by-side within each cluster
	 */
	private renderBars(group: SVGGElement): void {
		const numLabels = this.data.labels.length
		const numDatasets = this.data.datasets.length
		const unitHeight = this.chartHeight / numLabels
		const barsHeight = unitHeight * (1 - this.options.barSpacing!)
		const barHeight = barsHeight / numDatasets

		this.data.datasets.forEach((dataset, datasetIdx) => {
			const color = dataset.color || this.colors[datasetIdx % this.colors.length]

			dataset.values.forEach((value, i) => {
				const yPos = this.yAxis.positions[i]

				// Calculate bar position within cluster
				// Bars are stacked vertically within each cluster
				const clusterTop = yPos - barsHeight / 2
				const barY = clusterTop + datasetIdx * barHeight

				// Calculate bar width based on value
				let barWidth = value * this.xAxis.scaleMultiplier
				const barX = this.xAxis.zeroLine

				if (!isValidNumber(barY)) return
				if (!isValidNumber(barWidth, true)) barWidth = 0
				if (!isValidNumber(barHeight, true)) return

				const rect = createSVGElement('rect', {
					className: `bar bar-${datasetIdx} bar-label-${i}`,
					x: barX,
					y: barY,
					width: barWidth,
					height: barHeight,
					rx: 2,
					styles: {
						fill: color,
					},
					'data-index': i,
					'data-dataset': datasetIdx,
				})
				group.appendChild(rect)

				// Add value label at end of bar if there's space
				if (barWidth > 30) {
					const valueLabel = makeText(
						'bar-value-label',
						barX + barWidth - 4,
						barY + barHeight / 2,
						value.toString(),
						{
							fontSize: 9,
							fill: '#fff',
							textAnchor: 'end',
							dy: 3,
						}
					)
					group.appendChild(valueLabel)
				}
			})
		})
	}

	private renderLegend(group: SVGGElement): void {
		if (!this.options.showLegend) return

		const legendY = this.chartHeight + this.paddings.bottom + 10
		const rectWidth = 12
		const labelOffset = 16
		const itemSpacing = 24 // Increased spacing between legend items

		// Calculate total width needed for all legend items
		// Estimate text width (rough approximation: ~6px per character, max 90px)
		let totalWidth = 0
		for (const dataset of this.data.datasets) {
			const textWidth = Math.min(truncateString(dataset.name, 15).length * 6, 90)
			totalWidth += rectWidth + labelOffset + textWidth + itemSpacing
		}
		totalWidth -= itemSpacing // Remove last spacing

		// Center the legend by starting at the midpoint minus half the total width
		const startX = (this.chartWidth - totalWidth) / 2
		let x = startX

		this.data.datasets.forEach((dataset, idx) => {
			const color = dataset.color || this.colors[idx % this.colors.length]
			const truncatedName = truncateString(dataset.name, 15)
			const textWidth = Math.min(truncatedName.length * 6, 90)

			const rect = createSVGElement('rect', {
				x: x,
				y: legendY,
				width: rectWidth,
				height: 12,
				rx: 3,
				fill: color,
			})
			group.appendChild(rect)

			const label = makeText('legend-label', x + labelOffset, legendY, truncatedName, {
				fontSize: 11,
				fill: '#666',
				dy: 9,
			})
			group.appendChild(label)

			// Move to next item position: rect + label offset + text width + spacing
			x += rectWidth + labelOffset + textWidth + itemSpacing
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
			const offsetY = this.margins.top + this.paddings.top
			const relY = e.clientY - rect.top - offsetY

			if (relY >= 0 && relY <= this.chartHeight) {
				this.showTooltipAt(e, relY)
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

	private showTooltipAt(e: MouseEvent, relY: number): void {
		// Find closest cluster by Y position
		const numLabels = this.data.labels.length
		const unitHeight = this.chartHeight / numLabels
		const index = Math.floor(relY / unitHeight)

		if (index < 0 || index >= this.data.labels.length) return

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

		let left = e.clientX - containerRect.left + 10
		if (left + tooltipRect.width > containerRect.width) {
			left = e.clientX - containerRect.left - tooltipRect.width - 10
		}

		let top = e.clientY - containerRect.top - tooltipRect.height / 2
		if (top < 0) top = 0
		if (top + tooltipRect.height > containerRect.height) {
			top = containerRect.height - tooltipRect.height
		}

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
		this.calculateXAxis()
		this.calculateYAxis()

		this.createSVGContainer()

		const mainGroup = createSVGElement('g', {
			transform: `translate(${this.margins.left + this.paddings.left}, ${
				this.margins.top + this.paddings.top
			})`,
		}) as SVGGElement

		this.renderXAxis(mainGroup)
		this.renderYAxis(mainGroup)
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
