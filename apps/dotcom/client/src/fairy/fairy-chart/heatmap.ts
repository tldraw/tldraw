/**
 * Standalone Heatmap Visualization
 * GitHub-style contribution calendar heatmap
 */

import {
	COL_WIDTH,
	DAY_NAMES_SHORT,
	DEFAULT_HEATMAP_COLORS,
	HEATMAP_DISTRIBUTION_SIZE,
	HEATMAP_SQUARE_SIZE,
	NO_OF_DAYS_IN_WEEK,
	NO_OF_YEAR_MONTHS,
	ROW_HEIGHT,
} from './heatmap-constants.js'

import {
	addDays,
	areInSameMonth,
	calcDistribution,
	clone,
	createSVG,
	getLastDateInMonth,
	getMaxCheckpoint,
	getMonthName,
	getWeeksBetween,
	getYyyyMmDd,
	heatSquare,
	makeSVGGroup,
	makeText,
	NO_OF_MILLIS,
	setDayToSunday,
	toMidnightUTC,
} from './heatmap-utils.js'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface HeatmapData {
	dataPoints: Record<string, number>
	start?: Date
	end?: Date
}

export interface HeatmapOptions {
	data?: HeatmapData
	countLabel?: string
	colors?: readonly string[]
	radius?: number
	discreteDomains?: number
	startSubDomain?: 'Sunday' | 'Monday'
}

interface HeatmapState {
	start: Date
	end: Date
	noOfWeeks: number
	distribution: number[]
	domainConfigs: DomainConfig[]
}

interface DayConfig {
	yyyyMmDd: string
	dataValue?: number
	fill?: string
}

interface DomainConfig {
	index: number
	cols: DayConfig[][]
}

// ============================================================================
// HEATMAP CLASS
// ============================================================================

export default class Heatmap {
	private container: HTMLElement
	private countLabel: string
	private colors: readonly string[]
	private radius: number
	private discreteDomains: number
	private startSubDomainIndex: number

	private state: Partial<HeatmapState>
	private data: Partial<HeatmapData>

	private svg?: SVGSVGElement
	private drawArea?: SVGGElement
	private legendArea?: SVGGElement
	private tooltip?: HTMLDivElement

	/**
	 * Create a heatmap visualization
	 * @param container - Container selector or element
	 * @param options - Configuration options
	 */
	constructor(container: string | HTMLElement, options: HeatmapOptions = {}) {
		// Get container element
		const containerElement =
			typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container

		if (!containerElement) {
			throw new Error('Container not found')
		}

		this.container = containerElement

		// Configuration
		this.countLabel = options.countLabel || ''
		this.colors = options.colors || DEFAULT_HEATMAP_COLORS
		this.radius = options.radius || 0
		this.discreteDomains = options.discreteDomains === 0 ? 0 : 1

		// Week start configuration
		const validStarts: Array<'Sunday' | 'Monday'> = ['Sunday', 'Monday']
		const startSubDomain = validStarts.includes(options.startSubDomain!)
			? options.startSubDomain!
			: 'Sunday'
		this.startSubDomainIndex = validStarts.indexOf(startSubDomain)

		// State
		this.state = {}
		this.data = {}

		// Initialize
		if (options.data) {
			this.setData(options.data)
		}
	}

	/**
	 * Set or update heatmap data
	 * @param data - Data object with dataPoints, start, and end
	 */
	setData(data: HeatmapData): this {
		this.data = this.prepareData(data)
		this.calculate()
		this.render()
		return this
	}

	/**
	 * Prepare and validate data
	 */
	private prepareData(data: HeatmapData): HeatmapData {
		if (data.start && data.end && data.start > data.end) {
			throw new Error('Start date cannot be greater than end date.')
		}

		// Default to 1 year range if not specified
		if (!data.start) {
			data.start = new Date()
			data.start.setFullYear(data.start.getFullYear() - 1)
		}
		data.start = toMidnightUTC(data.start)

		if (!data.end) {
			data.end = new Date()
		}
		data.end = toMidnightUTC(data.end)

		data.dataPoints = data.dataPoints || {}

		// Convert Unix timestamps to date strings if needed
		const firstKey = Object.keys(data.dataPoints)[0]
		if (firstKey && parseInt(firstKey) > 100000) {
			const points: Record<string, number> = {}
			Object.keys(data.dataPoints).forEach((timestampSec) => {
				const date = new Date(parseInt(timestampSec) * NO_OF_MILLIS)
				points[getYyyyMmDd(date)] = data.dataPoints[timestampSec]
			})
			data.dataPoints = points
		}

		return data as HeatmapData
	}

	/**
	 * Calculate state and domain configurations
	 */
	private calculate(): void {
		const s = this.state as HeatmapState

		s.start = clone(this.data.start!)
		s.end = clone(this.data.end!)
		s.noOfWeeks = getWeeksBetween(s.start, s.end)

		// Calculate distribution for color mapping
		const values = Object.values(this.data.dataPoints!)
		s.distribution = calcDistribution(values.length ? values : [0], HEATMAP_DISTRIBUTION_SIZE)

		// Generate domain configurations for each month
		s.domainConfigs = this.getDomains()
	}

	/**
	 * Render the heatmap
	 */
	private render(): void {
		this.container.innerHTML = ''

		// Calculate dimensions
		const spacing = this.discreteDomains ? NO_OF_YEAR_MONTHS : 0
		const width = (this.state.noOfWeeks! + spacing) * COL_WIDTH
		const height = ROW_HEIGHT * NO_OF_DAYS_IN_WEEK + ROW_HEIGHT * 5 // Extra space for labels and legend

		// Create SVG
		this.svg = createSVG('svg', {
			width: width,
			height: height,
			className: 'heatmap-chart',
		})

		// Create main draw area with padding
		this.drawArea = makeSVGGroup('heatmap-draw-area', `translate(40, ${ROW_HEIGHT * 2})`)
		this.svg.appendChild(this.drawArea)

		// Render day labels
		this.renderDayLabels()

		// Render month domains
		this.renderDomains()

		// Create legend area
		this.legendArea = makeSVGGroup('heatmap-legend', `translate(40, ${height - ROW_HEIGHT * 2})`)
		this.svg.appendChild(this.legendArea)
		this.renderLegend()

		// Add to container
		this.container.appendChild(this.svg)

		// Setup tooltips
		this.setupTooltips()
	}

	/**
	 * Render day name labels (Sun, Mon, Tue, etc.)
	 */
	private renderDayLabels(): void {
		let y = 0
		DAY_NAMES_SHORT.forEach((dayName, i) => {
			if ([1, 3, 5].includes(i)) {
				const dayText = makeText('heatmap-day-label', -COL_WIDTH / 2, y, dayName, {
					fontSize: HEATMAP_SQUARE_SIZE,
					dy: 8,
					textAnchor: 'end',
				})
				this.drawArea!.appendChild(dayText)
			}
			y += ROW_HEIGHT
		})
	}

	/**
	 * Render all month domains
	 */
	private renderDomains(): void {
		const lessCol = this.discreteDomains ? 0 : 1
		let xOffset = 0

		this.state.domainConfigs!.forEach((config, i) => {
			// Calculate x position for this month
			if (i > 0) {
				xOffset =
					this.state
						.domainConfigs!.filter((c, j) => j < i)
						.map((c) => c.cols.length - lessCol)
						.reduce((a, b) => a + b, 0) * COL_WIDTH
			}

			this.renderDomain(config, xOffset)
		})
	}

	/**
	 * Render a single month domain
	 */
	private renderDomain(config: DomainConfig, xTranslate: number): void {
		const domainGroup = makeSVGGroup(
			`heat-domain domain-${config.index}`,
			`translate(${xTranslate}, 0)`
		)
		const monthNameHeight = -12
		let x = 0
		let y = 0

		// Render month name on first week
		config.cols.forEach((week, weekNo) => {
			if (weekNo === 1) {
				const monthText = makeText(
					'heatmap-month-label',
					x,
					monthNameHeight,
					getMonthName(config.index, true).toUpperCase(),
					{ fontSize: 9 }
				)
				domainGroup.appendChild(monthText)
			}

			// Render each day in the week
			week.forEach((day, i) => {
				if (day.fill) {
					const data = {
						'data-date': day.yyyyMmDd,
						'data-value': String(day.dataValue),
						'data-day': String(i),
					}
					const square = heatSquare(
						'heatmap-day',
						x,
						y,
						HEATMAP_SQUARE_SIZE,
						this.radius,
						day.fill,
						data
					)
					domainGroup.appendChild(square)
				}
				y += ROW_HEIGHT
			})

			y = 0
			x += COL_WIDTH
		})

		this.drawArea!.appendChild(domainGroup)
	}

	/**
	 * Render color legend
	 */
	private renderLegend(): void {
		let x = 0
		const y = ROW_HEIGHT

		// "Less" label
		const lessText = makeText('heatmap-legend-label', x, y, 'Less', {
			fontSize: HEATMAP_SQUARE_SIZE + 1,
			dy: 9,
		})
		this.legendArea!.appendChild(lessText)

		// Color squares
		x = COL_WIDTH * 2 + COL_WIDTH / 2
		this.colors.slice(0, HEATMAP_DISTRIBUTION_SIZE).forEach((color, i) => {
			const square = heatSquare(
				'heatmap-legend-unit',
				x + (COL_WIDTH + 3) * i,
				y,
				HEATMAP_SQUARE_SIZE,
				this.radius,
				color
			)
			this.legendArea!.appendChild(square)
		})

		// "More" label
		const moreTextX = x + HEATMAP_DISTRIBUTION_SIZE * (COL_WIDTH + 3) + COL_WIDTH / 4
		const moreText = makeText('heatmap-legend-label', moreTextX, y, 'More', {
			fontSize: HEATMAP_SQUARE_SIZE + 1,
			dy: 9,
		})
		this.legendArea!.appendChild(moreText)
	}

	/**
	 * Setup tooltip functionality
	 */
	private setupTooltips(): void {
		// Create tooltip element if it doesn't exist
		if (!this.tooltip) {
			this.tooltip = document.createElement('div')
			this.tooltip.className = 'heatmap-tooltip'
			this.tooltip.style.cssText = `
        position: absolute;
        display: none;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        white-space: nowrap;
      `
			document.body.appendChild(this.tooltip)
		}

		// Mouse events
		this.svg!.addEventListener('mouseover', (e) => {
			if ((e.target as Element).classList.contains('heatmap-day')) {
				this.showTooltip(e as MouseEvent)
			}
		})

		this.svg!.addEventListener('mouseout', (e) => {
			if ((e.target as Element).classList.contains('heatmap-day')) {
				this.hideTooltip()
			}
		})

		this.svg!.addEventListener('mousemove', (e) => {
			if ((e.target as Element).classList.contains('heatmap-day')) {
				this.updateTooltipPosition(e as MouseEvent)
			}
		})
	}

	/**
	 * Show tooltip for a day square
	 */
	private showTooltip(e: MouseEvent): void {
		const daySquare = e.target as SVGElement
		const count = daySquare.getAttribute('data-value')
		const dateString = daySquare.getAttribute('data-date')

		if (!dateString) return

		const dateParts = dateString.split('-')
		const month = getMonthName(parseInt(dateParts[1]) - 1, true)
		const value = count + ' ' + this.countLabel
		const name = month + ' ' + dateParts[2] + ', ' + dateParts[0]

		this.tooltip!.innerHTML = `<strong>${value}</strong> on ${name}`
		this.tooltip!.style.display = 'block'
		this.updateTooltipPosition(e)
	}

	/**
	 * Update tooltip position
	 */
	private updateTooltipPosition(e: MouseEvent): void {
		this.tooltip!.style.left = e.pageX + 10 + 'px'
		this.tooltip!.style.top = e.pageY - 28 + 'px'
	}

	/**
	 * Hide tooltip
	 */
	private hideTooltip(): void {
		this.tooltip!.style.display = 'none'
	}

	/**
	 * Get domain configurations for all months in range
	 */
	private getDomains(): DomainConfig[] {
		const s = this.state as HeatmapState
		const [startMonth, startYear] = [s.start.getMonth(), s.start.getFullYear()]
		const [endMonth, endYear] = [s.end.getMonth(), s.end.getFullYear()]
		const noOfMonths = endMonth - startMonth + 1 + (endYear - startYear) * 12

		const domainConfigs: DomainConfig[] = []
		let startOfMonth = clone(s.start)

		for (let i = 0; i < noOfMonths; i++) {
			let endDate = s.end
			if (!areInSameMonth(startOfMonth, s.end)) {
				const [month, year] = [startOfMonth.getMonth(), startOfMonth.getFullYear()]
				endDate = getLastDateInMonth(month, year)
			}
			domainConfigs.push(this.getDomainConfig(startOfMonth, endDate))

			addDays(endDate, 1)
			startOfMonth = endDate
		}

		return domainConfigs
	}

	/**
	 * Get domain configuration for a single month
	 */
	private getDomainConfig(startDate: Date, endDate?: Date): DomainConfig {
		const [month, year] = [startDate.getMonth(), startDate.getFullYear()]
		const startOfWeek = setDayToSunday(startDate)
		const finalEndDate = endDate ? clone(endDate) : toMidnightUTC(getLastDateInMonth(month, year))

		const domainConfig: DomainConfig = {
			index: month,
			cols: [],
		}

		addDays(finalEndDate, 1)
		const noOfMonthWeeks = getWeeksBetween(startOfWeek, finalEndDate)

		const cols: DayConfig[][] = []
		let col: DayConfig[] = []
		for (let i = 0; i < noOfMonthWeeks; i++) {
			col = this.getCol(startOfWeek, month)
			cols.push(col)

			const lastDay = col[NO_OF_DAYS_IN_WEEK - 1]
			const newStartOfWeek = toMidnightUTC(new Date(lastDay.yyyyMmDd))
			addDays(newStartOfWeek, 1)
			startOfWeek.setTime(newStartOfWeek.getTime())
		}

		// Add extra column if last day has data
		if (col[NO_OF_DAYS_IN_WEEK - 1].dataValue !== undefined) {
			addDays(startOfWeek, 1)
			cols.push(this.getCol(startOfWeek, month, true))
		}

		domainConfig.cols = cols
		return domainConfig
	}

	/**
	 * Get column (week) of day configurations
	 */
	private getCol(startDate: Date, month: number, empty = false): DayConfig[] {
		const s = this.state as HeatmapState
		const currentDate = clone(startDate)
		const col: DayConfig[] = []

		for (let i = 0; i < NO_OF_DAYS_IN_WEEK; i++, addDays(currentDate, 1)) {
			let config: DayConfig
			const currentDateWithinData = currentDate >= s.start && currentDate <= s.end

			if (empty || currentDate.getMonth() !== month || !currentDateWithinData) {
				config = { yyyyMmDd: getYyyyMmDd(currentDate) }
			} else {
				config = this.getSubDomainConfig(currentDate)
			}
			col.push(config)
		}

		return col
	}

	/**
	 * Get configuration for a single day
	 */
	private getSubDomainConfig(date: Date): DayConfig {
		const yyyyMmDd = getYyyyMmDd(date)
		const dataValue = this.data.dataPoints![yyyyMmDd]
		const config: DayConfig = {
			yyyyMmDd: yyyyMmDd,
			dataValue: dataValue || 0,
			fill: this.colors[getMaxCheckpoint(dataValue, this.state.distribution!)],
		}
		return config
	}

	/**
	 * Destroy the heatmap and cleanup
	 */
	destroy(): void {
		if (this.tooltip && this.tooltip.parentNode) {
			this.tooltip.parentNode.removeChild(this.tooltip)
		}
		this.container.innerHTML = ''
	}
}
