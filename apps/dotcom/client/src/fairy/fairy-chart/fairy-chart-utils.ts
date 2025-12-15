/**
 * Shared utility functions for chart implementations
 */

// ============================================================================
// NUMBER UTILITIES
// ============================================================================

/**
 * Round a number to 2 decimal places
 */
export function floatTwo(d: number): number {
	return parseFloat(d.toFixed(2))
}

/**
 * Round a number using exponential notation trick
 */
export function round(d: number): number {
	return Number(Math.round(Number(d + 'e4')) + 'e-4')
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(candidate: any, nonNegative = false): boolean {
	if (Number.isNaN(candidate)) return false
	if (candidate === undefined) return false
	if (!Number.isFinite(candidate)) return false
	if (nonNegative && candidate < 0) return false
	return true
}

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

/**
 * Deep clone an object, handling dates and nested structures
 */
export function deepClone<T>(obj: T): T {
	if (obj instanceof Date) return new Date(obj.getTime()) as any
	if (typeof obj !== 'object' || obj === null) return obj
	const cloned: any = Array.isArray(obj) ? [] : {}
	for (const key in obj) {
		cloned[key] = deepClone(obj[key])
	}
	return cloned
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncateString(txt: string, len: number): string {
	if (!txt) return ''
	if (txt.length > len) return txt.slice(0, len - 3) + '...'
	return txt
}

// ============================================================================
// SVG CREATION FUNCTIONS
// ============================================================================

/**
 * Options for creating text elements
 */
export interface MakeTextOptions {
	fontSize?: number
	dy?: number
	dx?: number
	fill?: string
	textAnchor?: 'start' | 'middle' | 'end'
}

/**
 * Create an SVG element with the given tag and attributes
 */
export function createSVGElement(tag: string, attrs: Record<string, any>): SVGElement {
	const element = document.createElementNS('http://www.w3.org/2000/svg', tag)
	for (const key in attrs) {
		const val = attrs[key]
		if (key === 'innerHTML') {
			element.textContent = val
		} else if (key === 'className') {
			element.setAttribute('class', val)
		} else if (key === 'styles' && typeof val === 'object') {
			Object.keys(val).forEach((prop) => {
				;(element.style as any)[prop] = val[prop]
			})
		} else {
			element.setAttribute(key, val)
		}
	}
	return element
}

/**
 * Create an SVG text element with common styling options
 */
export function makeText(
	className: string,
	x: number,
	y: number,
	content: string,
	options: MakeTextOptions = {}
): SVGTextElement {
	const fontSize = options.fontSize || 10
	const dy = options.dy !== undefined ? options.dy : fontSize / 2
	const fill = options.fill || '#666666'
	const textAnchor = options.textAnchor || 'start'

	const attrs: Record<string, any> = {
		className,
		x,
		y,
		dy: dy + 'px',
		'font-size': fontSize + 'px',
		fill,
		'text-anchor': textAnchor,
		innerHTML: content,
	}

	if (options.dx !== undefined) {
		attrs.dx = options.dx + 'px'
	}

	return createSVGElement('text', attrs) as SVGTextElement
}

/**
 * Create an SVG path element
 */
export function makePath(
	pathStr: string,
	className = '',
	stroke = 'none',
	fill = 'none',
	strokeWidth = 2
): SVGPathElement {
	return createSVGElement('path', {
		className,
		d: pathStr,
		styles: { stroke, fill, 'stroke-width': strokeWidth },
	}) as SVGPathElement
}

// ============================================================================
// CHART SCALE CALCULATIONS
// ============================================================================

/**
 * Normalize a number to mantissa and exponent
 */
export function normalize(x: number): [number, number] {
	if (x === 0) return [0, 0]
	if (isNaN(x)) return [-6755399441055744, 972]
	const sig = x > 0 ? 1 : -1
	if (!isFinite(x)) return [sig * 4503599627370496, 972]
	const absX = Math.abs(x)
	const exp = Math.floor(Math.log10(absX))
	const man = absX / Math.pow(10, exp)
	return [sig * man, exp]
}

/**
 * Calculate chart intervals for a given range
 */
export function getChartRangeIntervals(max: number, min = 0): number[] {
	let upperBound = Math.ceil(max)
	let lowerBound = Math.floor(min)
	let range = upperBound - lowerBound
	let noOfParts = range
	let partSize = 1

	if (range > 5) {
		if (range % 2 !== 0) {
			upperBound++
			range = upperBound - lowerBound
		}
		noOfParts = range / 2
		partSize = 2
	}

	if (range <= 2) {
		noOfParts = 4
		partSize = range / noOfParts
	}

	if (range === 0) {
		noOfParts = 5
		partSize = 1
	}

	const intervals: number[] = []
	for (let i = 0; i <= noOfParts; i++) {
		intervals.push(lowerBound + partSize * i)
	}
	return intervals
}

/**
 * Calculate normalized chart intervals
 */
export function getChartIntervals(maxValue: number, minValue = 0): number[] {
	const [normalMaxValue, exponent] = normalize(maxValue)
	const normalMinValue = minValue ? minValue / Math.pow(10, exponent) : 0
	const normalMaxFixed = parseFloat(normalMaxValue.toFixed(6))

	let intervals = getChartRangeIntervals(normalMaxFixed, normalMinValue)
	intervals = intervals.map((value) => {
		if (exponent < 0) return value / Math.pow(10, -exponent)
		return value * Math.pow(10, exponent)
	})
	return intervals
}

/**
 * Calculate chart intervals from an array of values
 */
export function calcChartIntervals(values: number[], withMinimum = true): number[] {
	const maxValue = Math.max(...values)
	const minValue = Math.min(...values)

	let intervals: number[] = []

	if (maxValue >= 0 && minValue >= 0) {
		intervals = withMinimum ? getChartIntervals(maxValue, minValue) : getChartIntervals(maxValue)
	} else if (maxValue > 0 && minValue < 0) {
		const absMinValue = Math.abs(minValue)
		if (maxValue >= absMinValue) {
			intervals = getChartIntervals(maxValue)
			const intervalSize = intervals[1] - intervals[0]
			let value = 0
			for (let i = 1; value < absMinValue; i++) {
				value += intervalSize
				intervals.unshift(-1 * value)
			}
		} else {
			const posIntervals = getChartIntervals(absMinValue)
			const intervalSize = posIntervals[1] - posIntervals[0]
			let value = 0
			for (let i = 1; value < maxValue; i++) {
				value += intervalSize
				posIntervals.unshift(-1 * value)
			}
			intervals = posIntervals.reverse().map((d) => d * -1)
		}
	} else if (maxValue <= 0 && minValue <= 0) {
		const pseudoMaxValue = Math.abs(minValue)
		const pseudoMinValue = Math.abs(maxValue)
		intervals = withMinimum
			? getChartIntervals(pseudoMaxValue, pseudoMinValue)
			: getChartIntervals(pseudoMaxValue)
		intervals = intervals.reverse().map((d) => d * -1)
	}

	return intervals.sort((a, b) => a - b)
}

/**
 * Get the zero line index in Y-axis points
 */
export function getZeroIndex(yPts: number[]): number {
	const interval = yPts[1] - yPts[0]
	if (yPts.indexOf(0) >= 0) {
		return yPts.indexOf(0)
	} else if (yPts[0] > 0) {
		const min = yPts[0]
		return (-1 * min) / interval
	} else {
		const max = yPts[yPts.length - 1]
		return (-1 * max) / interval + (yPts.length - 1)
	}
}

/**
 * Scale a value on the Y-axis
 */
export function scale(val: number, yAxis: { zeroLine: number; scaleMultiplier: number }): number {
	return floatTwo(yAxis.zeroLine - val * yAxis.scaleMultiplier)
}

/**
 * Get the index of the closest value in an array
 */
export function getClosestInArray(goal: number, arr: number[]): number {
	return arr.indexOf(
		arr.reduce((prev, curr) => (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev))
	)
}
