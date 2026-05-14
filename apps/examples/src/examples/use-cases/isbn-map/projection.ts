// The "bookshelf" projection from phiresky/isbn-visualization. It maps each
// ISBN to an (x, y, w, h) rectangle on a 2D canvas by recursively splitting
// the canvas: each digit of the relative ISBN partitions the current
// rectangle into a 10x1 grid (horizontally), and the next digit a 1x10 grid
// (vertically), alternating until all 10 digits are consumed. The result is
// a layout that resembles books on a bookshelf, where geographically related
// publishers (and books from the same publisher) end up near each other.

export const TOTAL_ISBNS = 2e9

export interface ProjectedRect {
	x: number
	y: number
	width: number
	height: number
}

interface BookshelfOptions {
	width: number
	height?: number
	gridW?: number
	gridH?: number
	swapEvery?: boolean
	startSwapXy?: boolean
}

export interface BookshelfProjection {
	pixelWidth: number
	pixelHeight: number
	relativeIsbnToCoords(relativeIsbn: number): ProjectedRect
	prefixToCoords(prefix: string): ProjectedRect
}

export function bookshelfConfig({
	width,
	height,
	gridW = 10,
	gridH = 1,
	swapEvery = true,
	startSwapXy = true,
}: BookshelfOptions): BookshelfProjection {
	const resolvedHeight = height ?? ((TOTAL_ISBNS / 1e9) * width) / Math.sqrt(gridW)
	const startRectWidth = width * (startSwapXy ? gridH : gridW / 2)
	const startRectHeight = resolvedHeight * (startSwapXy ? gridW / 2 : gridH)

	function relativeIsbnToCoords(relativeIsbn: number): ProjectedRect {
		const digits = String(relativeIsbn).padStart(10, '0')
		let x = 0
		let y = 0
		let currentRectWidth = startRectWidth
		let currentRectHeight = startRectHeight
		let swapXy = startSwapXy

		for (const digit of digits) {
			const innerXofs = (+digit % gridW) / gridW
			const innerYofs = Math.floor(+digit / gridW) / gridH
			if (swapXy) {
				y += innerXofs * currentRectHeight
				x += innerYofs * currentRectWidth
				currentRectWidth /= gridH
				currentRectHeight /= gridW
			} else {
				x += innerXofs * currentRectWidth
				y += innerYofs * currentRectHeight
				currentRectWidth /= gridW
				currentRectHeight /= gridH
			}
			if (swapEvery) swapXy = !swapXy
		}
		return { x, y, width: currentRectWidth, height: currentRectHeight }
	}

	function prefixToCoords(prefix: string): ProjectedRect {
		// A prefix's rectangle = the rect of its first ISBN, expanded to cover
		// the rect of its last ISBN. For an N-digit prefix, the first ISBN is
		// prefix.padEnd(10, "0") and the last is prefix.padEnd(10, "9").
		const first = +prefix.padEnd(10, '0')
		const last = +prefix.padEnd(10, '9')
		const a = relativeIsbnToCoords(first)
		const b = relativeIsbnToCoords(last)
		return {
			x: Math.min(a.x, b.x),
			y: Math.min(a.y, b.y),
			width: Math.max(a.x + a.width, b.x + b.width) - Math.min(a.x, b.x),
			height: Math.max(a.y + a.height, b.y + b.height) - Math.min(a.y, b.y),
		}
	}

	return {
		pixelWidth: width,
		pixelHeight: resolvedHeight,
		relativeIsbnToCoords,
		prefixToCoords,
	}
}

// Convert a "relative" prefix (978 -> 0, 979 -> 1) back to a human-friendly
// ISBN prefix string with dashes inserted at conventional positions.
export function prettyPrefix(relativePrefix: string): string {
	const head = relativePrefix.slice(0, 1) === '0' ? '978' : '979'
	const rest = relativePrefix.slice(1)
	if (!rest) return head
	const group = rest.slice(0, 1)
	const registrant = rest.slice(1)
	return registrant ? `${head}-${group}-${registrant}` : `${head}-${group}`
}
