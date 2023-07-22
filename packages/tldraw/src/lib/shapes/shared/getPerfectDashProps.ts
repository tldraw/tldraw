import { TLDefaultDashStyle } from '@tldraw/editor'

export function getPerfectDashProps(
	totalLength: number,
	strokeWidth: number,
	opts = {} as Partial<{
		style: TLDefaultDashStyle
		snap: number
		end: 'skip' | 'outset' | 'none'
		start: 'skip' | 'outset' | 'none'
		lengthRatio: number
		closed: boolean
	}>
): {
	strokeDasharray: string
	strokeDashoffset: string
} {
	const {
		closed = false,
		snap = 1,
		start = 'outset',
		end = 'outset',
		lengthRatio = 2,
		style = 'dashed',
	} = opts

	let dashLength = 0
	let dashCount = 0
	let ratio = 1
	let gapLength = 0
	let strokeDashoffset = 0

	switch (style) {
		case 'dashed': {
			ratio = 1
			dashLength = Math.min(strokeWidth * lengthRatio, totalLength / 4)
			break
		}
		case 'dotted': {
			ratio = 100
			dashLength = strokeWidth / ratio
			break
		}
		default: {
			return {
				strokeDasharray: 'none',
				strokeDashoffset: 'none',
			}
		}
	}

	if (!closed) {
		if (start === 'outset') {
			totalLength += dashLength / 2
			strokeDashoffset += dashLength / 2
		} else if (start === 'skip') {
			totalLength -= dashLength
			strokeDashoffset -= dashLength
		}

		if (end === 'outset') {
			totalLength += dashLength / 2
		} else if (end === 'skip') {
			totalLength -= dashLength
		}
	}

	dashCount = Math.floor(totalLength / dashLength / (2 * ratio))
	dashCount -= dashCount % snap

	if (dashCount < 3 && style === 'dashed') {
		if (totalLength / strokeWidth < 5) {
			dashLength = totalLength
			dashCount = 1
			gapLength = 0
		} else {
			dashLength = totalLength * 0.333
			gapLength = totalLength * 0.333
		}
	} else {
		dashCount = Math.max(dashCount, 3)
		dashLength = totalLength / dashCount / (2 * ratio)

		if (closed) {
			strokeDashoffset = dashLength / 2
			gapLength = (totalLength - dashCount * dashLength) / dashCount
		} else {
			gapLength = (totalLength - dashCount * dashLength) / Math.max(1, dashCount - 1)
		}
	}

	return {
		strokeDasharray: [dashLength, gapLength].join(' '),
		strokeDashoffset: strokeDashoffset.toString(),
	}
}
