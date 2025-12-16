/**
 * FairyCategoryHeatmap - Categorical 2D Grid Heatmap
 * Shows fairy activity intensity across action categories
 *
 * Grid layout: rows = fairies, columns = action categories
 * Cell intensity = action count (5 levels based on distribution)
 */

import type { AgentActionCategory } from '../fairy-shared-constants'
import { createSVGElement, makeText, truncateString } from './fairy-chart-utils'
import { calcDistribution, getMaxCheckpoint, heatSquare } from './heatmap-utils'

// ============================================================================
// TYPES
// ============================================================================

export interface CategoryHeatmapData {
	rows: string[] // Fairy names (Y-axis)
	columns: string[] // Category names (X-axis)
	dataPoints: Record<string, number> // "rowIndex,colIndex" -> count
}

export interface FairyCategoryHeatmapOptions {
	data: CategoryHeatmapData
	height?: number
	colors?: readonly string[] // Intensity gradient (5 levels)
	categoryColors?: Record<AgentActionCategory, string> // Column header colors
	cellSize?: number // Width/height of each cell
	radius?: number // Border radius
	showRowLabels?: boolean
	showColumnLabels?: boolean
	countLabel?: string // "actions", "items", etc.
}

// Default intensity colors (light to dark)
const DEFAULT_HEATMAP_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] as const

// ============================================================================
// HEATMAP CLASS
// ============================================================================

export class FairyCategoryHeatmap {
	private container: HTMLElement
	private svg!: SVGSVGElement
	private data: CategoryHeatmapData
	private options: Required<Omit<FairyCategoryHeatmapOptions, 'categoryColors'>> & {
		categoryColors?: Record<string, string>
	}
	private width = 0
	private height = 0
	private distribution: number[] = []
	private margins = { top: 10, bottom: 10, left: 20, right: 20 }
	private paddings = { top: 70, bottom: 10, left: 90, right: 10 }
	private tooltip!: HTMLElement
	private tooltipShown = false
	private resizeHandler: () => void
	private mousemoveHandler: ((e: MouseEvent) => void) | null = null
	private mouseleaveHandler: (() => void) | null = null

	constructor(container: HTMLElement, options: FairyCategoryHeatmapOptions) {
		this.container = container
		this.data = options.data
		this.options = {
			height: 240,
			colors: DEFAULT_HEATMAP_COLORS,
			categoryColors: options.categoryColors,
			cellSize: 40,
			radius: 3,
			showRowLabels: true,
			showColumnLabels: true,
			countLabel: 'actions',
			...options,
		}

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
		this.height = this.options.height

		// For heatmap, height is calculated based on number of rows
		const numRows = this.data.rows.length
		const gridHeight = numRows * this.options.cellSize
		this.height =
			gridHeight + this.margins.top + this.margins.bottom + this.paddings.top + this.paddings.bottom
	}

	/**
	 * Calculate color distribution for intensity levels
	 * Maps values to 5 intensity levels using distribution
	 */
	private calculateDistribution(): void {
		// Collect all non-zero values
		const allValues = Object.values(this.data.dataPoints).filter((v) => v > 0)

		if (allValues.length === 0) {
			this.distribution = [0, 0, 0, 0, 0]
			return
		}

		// Calculate distribution (5 levels)
		this.distribution = calcDistribution(allValues, 5)
	}

	/**
	 * Get color for a cell value based on intensity distribution
	 */
	private getColorForValue(value: number | undefined): string {
		if (value === undefined || value === 0) {
			return this.options.colors[0] // Lightest shade for zero
		}

		const level = getMaxCheckpoint(value, this.distribution)
		return this.options.colors[level]
	}

	private createSVGContainer(): void {
		this.svg = createSVGElement('svg', {
			className: 'fairy-category-heatmap',
			width: this.width,
			height: this.height,
			styles: {
				overflow: 'visible',
			},
		}) as SVGSVGElement
	}

	/**
	 * Render column labels (category names at top, rotated 45°)
	 */
	private renderColumnLabels(group: SVGGElement): void {
		if (!this.options.showColumnLabels) return

		const cellSize = this.options.cellSize
		const columns = this.data.columns

		columns.forEach((column, colIdx) => {
			const x = colIdx * cellSize + cellSize / 2
			const y = -10

			// Get category color if available
			const categoryColor = this.options.categoryColors?.[column as AgentActionCategory] || '#666'

			// Create rotated text
			const text = makeText('column-label', x, y, truncateString(column, 15), {
				fontSize: 11,
				fill: categoryColor,
				textAnchor: 'start',
				dy: 4,
			})
			text.setAttribute('transform', `rotate(-45, ${x}, ${y})`)
			group.appendChild(text)
		})
	}

	/**
	 * Render row labels (fairy names on left side)
	 */
	private renderRowLabels(group: SVGGElement): void {
		if (!this.options.showRowLabels) return

		const cellSize = this.options.cellSize
		const rows = this.data.rows

		rows.forEach((row, rowIdx) => {
			const x = -8
			const y = rowIdx * cellSize + cellSize / 2

			const label = makeText('row-label', x, y, truncateString(row, 12), {
				fontSize: 11,
				fill: '#666',
				textAnchor: 'end',
				dy: 4,
			})
			group.appendChild(label)
		})
	}

	/**
	 * Render heatmap grid cells
	 */
	private renderGrid(group: SVGGElement): void {
		const cellSize = this.options.cellSize
		const radius = this.options.radius
		const rows = this.data.rows
		const columns = this.data.columns

		rows.forEach((row, rowIdx) => {
			columns.forEach((column, colIdx) => {
				const x = colIdx * cellSize
				const y = rowIdx * cellSize
				const key = `${rowIdx},${colIdx}`
				const value = this.data.dataPoints[key] || 0
				const color = this.getColorForValue(value)

				const cell = heatSquare('heatmap-cell', x, y, cellSize, radius, color, {
					'data-row': rowIdx,
					'data-col': colIdx,
					'data-value': value,
				})
				group.appendChild(cell)
			})
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

			const cellSize = this.options.cellSize
			const colIdx = Math.floor(relX / cellSize)
			const rowIdx = Math.floor(relY / cellSize)

			// Check if within valid grid bounds
			if (
				rowIdx >= 0 &&
				rowIdx < this.data.rows.length &&
				colIdx >= 0 &&
				colIdx < this.data.columns.length
			) {
				this.showTooltipAt(e, rowIdx, colIdx)
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

	private showTooltipAt(e: MouseEvent, rowIdx: number, colIdx: number): void {
		const row = this.data.rows[rowIdx]
		const column = this.data.columns[colIdx]
		const key = `${rowIdx},${colIdx}`
		const value = this.data.dataPoints[key] || 0

		const categoryColor = this.options.categoryColors?.[column as AgentActionCategory] || '#666'

		const html = `
			<div style="font-weight: bold; margin-bottom: 4px;">${row} × ${column}</div>
			<div style="display: flex; align-items: center;">
				<div style="width: 10px; height: 10px; background: ${categoryColor}; border-radius: 2px; margin-right: 6px;"></div>
				<strong>${value}</strong>
				<span style="margin-left: 4px;">${this.options.countLabel}</span>
			</div>
		`

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
		this.calculateDistribution()

		this.createSVGContainer()

		const mainGroup = createSVGElement('g', {
			transform: `translate(${this.margins.left + this.paddings.left}, ${
				this.margins.top + this.paddings.top
			})`,
		}) as SVGGElement

		this.renderColumnLabels(mainGroup)
		this.renderRowLabels(mainGroup)
		this.renderGrid(mainGroup)

		this.svg.appendChild(mainGroup)
		this.container.appendChild(this.svg)

		this.createTooltip()
		this.setupTooltipEvents()
	}

	public setData(data: CategoryHeatmapData): this {
		this.data = data
		return this
	}

	public update(data: CategoryHeatmapData): void {
		this.data = data
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
