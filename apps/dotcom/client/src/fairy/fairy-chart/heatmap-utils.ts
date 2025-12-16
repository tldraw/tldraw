/**
 * Heatmap Utilities
 * Date manipulation, distribution calculations, and SVG drawing helpers
 */

import { MONTH_NAMES, NO_OF_DAYS_IN_WEEK, NO_OF_MILLIS, SEC_IN_DAY } from './heatmap-constants.js'

// ============================================================================
// DATE UTILITIES
// ============================================================================

function treatAsUtc(date: Date): Date {
	const result = new Date(date)
	result.setMinutes(result.getMinutes() - result.getTimezoneOffset())
	return result
}

export function toMidnightUTC(date: Date): Date {
	const result = new Date(date)
	result.setUTCHours(0, result.getTimezoneOffset(), 0, 0)
	return result
}

export function getYyyyMmDd(date: Date): string {
	const dd = date.getDate()
	const mm = date.getMonth() + 1
	return [date.getFullYear(), (mm > 9 ? '' : '0') + mm, (dd > 9 ? '' : '0') + dd].join('-')
}

export function clone(date: Date): Date {
	return new Date(date.getTime())
}

export function addDays(date: Date, numberOfDays: number): void {
	date.setDate(date.getDate() + numberOfDays)
}

export function getWeeksBetween(startDate: Date, endDate: Date): number {
	const weekStartDate = setDayToSunday(startDate)
	return Math.ceil(getDaysBetween(weekStartDate, endDate) / NO_OF_DAYS_IN_WEEK)
}

export function getDaysBetween(startDate: Date, endDate: Date): number {
	const millisecondsPerDay = SEC_IN_DAY * NO_OF_MILLIS
	return (treatAsUtc(endDate).getTime() - treatAsUtc(startDate).getTime()) / millisecondsPerDay
}

export function areInSameMonth(startDate: Date, endDate: Date): boolean {
	return (
		startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()
	)
}

export function getMonthName(i: number, short = false): string {
	const monthName = MONTH_NAMES[i]
	return short ? monthName.slice(0, 3) : monthName
}

export function getLastDateInMonth(month: number, year: number): Date {
	return new Date(year, month + 1, 0)
}

export function setDayToSunday(date: Date): Date {
	const newDate = clone(date)
	const day = newDate.getDay()
	if (day !== 0) {
		addDays(newDate, -1 * day)
	}
	return newDate
}

// ============================================================================
// DISTRIBUTION CALCULATIONS
// ============================================================================

/**
 * Calculate distribution thresholds for color mapping
 * @param values - Array of data values
 * @param distributionSize - Number of distribution levels (typically 5)
 * @returns Array of threshold values
 */
export function calcDistribution(values: number[], distributionSize: number): number[] {
	const dataMaxValue = Math.max(...values)
	const distributionStep = 1 / (distributionSize - 1)
	const distribution: number[] = []

	for (let i = 0; i < distributionSize; i++) {
		const checkpoint = dataMaxValue * (distributionStep * i)
		distribution.push(checkpoint)
	}

	return distribution
}

/**
 * Get color index for a value based on distribution
 * @param value - Data value
 * @param distribution - Distribution thresholds
 * @returns Color index (0 to distributionSize-1)
 */
export function getMaxCheckpoint(value: number | undefined, distribution: number[]): number {
	if (value === undefined) return 0
	return distribution.filter((d) => d < value).length
}

// ============================================================================
// SVG DRAWING UTILITIES
// ============================================================================

interface SVGAttributes {
	[key: string]: string | number | undefined
	className?: string
	innerHTML?: string
}

/**
 * Create an SVG element with attributes
 * @param tag - SVG tag name
 * @param attributes - Element attributes
 * @returns Created SVG element
 */
export function createSVG<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attributes: SVGAttributes
): SVGElementTagNameMap[K] {
	const element = document.createElementNS('http://www.w3.org/2000/svg', tag)

	for (let key in attributes) {
		const val = attributes[key]

		if (key === 'className') {
			key = 'class'
		}

		if (key === 'innerHTML') {
			element.textContent = String(val)
		} else {
			element.setAttribute(key, String(val))
		}
	}

	return element
}

interface TextOptions {
	fontSize?: number
	dy?: number
	textAnchor?: string
}

/**
 * Create an SVG text element
 * @param className - CSS class name
 * @param x - X position
 * @param y - Y position
 * @param text - Text content
 * @param options - Additional options (fontSize, dy, textAnchor, etc.)
 * @returns Text element
 */
export function makeText(
	className: string,
	x: number,
	y: number,
	text: string,
	options: TextOptions = {}
): SVGTextElement {
	const args: SVGAttributes = {
		className: className,
		x: x,
		y: y,
		innerHTML: text,
	}

	if (options.fontSize) args['font-size'] = options.fontSize
	if (options.dy) args.dy = options.dy
	if (options.textAnchor) args['text-anchor'] = options.textAnchor

	return createSVG('text', args)
}

/**
 * Create a heatmap square (SVG rect)
 * @param className - CSS class name
 * @param x - X position
 * @param y - Y position
 * @param size - Square size
 * @param radius - Corner radius
 * @param fill - Fill color
 * @param data - Custom data attributes
 * @returns Rectangle element
 */
export function heatSquare(
	className: string,
	x: number,
	y: number,
	size: number,
	radius: number,
	fill = 'none',
	data: Record<string, string | number> = {}
): SVGRectElement {
	const args: SVGAttributes = {
		className: className,
		x: x,
		y: y,
		width: size,
		height: size,
		rx: radius,
		fill: fill,
	}

	// Add custom data attributes
	Object.keys(data).forEach((key) => {
		args[key] = data[key]
	})

	return createSVG('rect', args)
}

/**
 * Create an SVG group element
 * @param className - CSS class name
 * @param transform - Transform attribute
 * @returns Group element
 */
export function makeSVGGroup(className: string, transform = ''): SVGGElement {
	const args: SVGAttributes = { className: className }
	if (transform) args.transform = transform
	return createSVG('g', args)
}

export { NO_OF_MILLIS }
