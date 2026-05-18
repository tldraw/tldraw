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
	coordsToRelativeIsbn(x: number, y: number, digits?: number): number | null
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

	// The exact inverse of relativeIsbnToCoords: peel off one digit at a time
	// by figuring out which of the gridW * gridH sub-cells the point lives in.
	// Returns null if the point falls outside the rendered map area.
	function coordsToRelativeIsbn(x: number, y: number, digits = 10): number | null {
		if (x < 0 || y < 0) return null
		let currentRectWidth = startRectWidth
		let currentRectHeight = startRectHeight
		let swapXy = startSwapXy
		let isbn = 0
		for (let i = 0; i < digits; i++) {
			let cellX: number
			let cellY: number
			if (swapXy) {
				// On swap iterations, the digit picks a "row" along the height
				// (via innerXofs in the forward direction) and a "column" along
				// the width (via innerYofs).
				cellX = Math.floor((gridW * y) / currentRectHeight)
				cellY = Math.floor((gridH * x) / currentRectWidth)
				if (cellX < 0 || cellX >= gridW || cellY < 0 || cellY >= gridH) return null
				y -= (cellX / gridW) * currentRectHeight
				x -= (cellY / gridH) * currentRectWidth
				currentRectWidth /= gridH
				currentRectHeight /= gridW
			} else {
				cellX = Math.floor((gridW * x) / currentRectWidth)
				cellY = Math.floor((gridH * y) / currentRectHeight)
				if (cellX < 0 || cellX >= gridW || cellY < 0 || cellY >= gridH) return null
				x -= (cellX / gridW) * currentRectWidth
				y -= (cellY / gridH) * currentRectHeight
				currentRectWidth /= gridW
				currentRectHeight /= gridH
			}
			const digit = cellY * gridW + cellX
			isbn = isbn * 10 + digit
			if (swapEvery) swapXy = !swapXy
		}
		// Pad out any unconsumed digits so the return value is always a full
		// relative ISBN (caller may truncate via the `digits` parameter).
		for (let i = digits; i < 10; i++) isbn = isbn * 10
		return isbn
	}

	return {
		pixelWidth: width,
		pixelHeight: resolvedHeight,
		relativeIsbnToCoords,
		prefixToCoords,
		coordsToRelativeIsbn,
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

// The 13-digit relative ISBN has no check digit -- the check digit only exists
// on the full EAN-13. Compute it via the standard 1/3 weighted mod-10 rule:
//   sum(digit[i] * (i % 2 === 0 ? 1 : 3)) % 10, then negate mod 10.
export function computeIsbn13CheckDigit(prefix12: string): string {
	let sum = 0
	for (let i = 0; i < 12; i++) {
		const d = +prefix12[i]
		sum += i % 2 === 0 ? d : d * 3
	}
	const check = (10 - (sum % 10)) % 10
	return String(check)
}

// Turn a relative ISBN (10-digit number with the 978/979 prefix already
// stripped to 0/1) into the user-facing full EAN-13 string, e.g.
//   relativeIsbn = 30747427 -> padded "0030747427"
//                            -> "978" + "030747427" = "978030747427"
//                            -> + check digit "8" = "9780307474278".
export function relativeIsbnToIsbn13(relativeIsbn: number): string {
	const rel = String(Math.floor(relativeIsbn)).padStart(10, '0')
	const head = rel[0] === '0' ? '978' : '979'
	const body = head + rel.slice(1)
	return body + computeIsbn13CheckDigit(body)
}

// Format an ISBN-13 with dashes at the conventional positions for the English-
// language group (978-0-NNN-NNNNN-C). For non-English groups we fall back to a
// generic 978-X-... split because group lengths vary.
export function formatIsbn13(isbn13: string): string {
	if (isbn13.length !== 13) return isbn13
	const ean = isbn13.slice(0, 3)
	const group = isbn13.slice(3, 4)
	if (group !== '0' && group !== '1') {
		return `${ean}-${group}-${isbn13.slice(4, 12)}-${isbn13.slice(12)}`
	}
	// English: split the publisher/title block at a "reasonable" position; the
	// real boundary depends on the registrant's prefix range but for display
	// purposes a 3-digit publisher + 5-digit title is a decent default that
	// works for the vast majority of mainstream books.
	const publisher = isbn13.slice(4, 7)
	const title = isbn13.slice(7, 12)
	const check = isbn13.slice(12)
	return `${ean}-${group}-${publisher}-${title}-${check}`
}
