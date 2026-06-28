import { StrokePoint } from '../types'
import { finishPath, resetPath, toCenti, writeCPair, writeStr } from './fmt'

// JS reference implementation of getSvgPathFromStrokePoints, kept only as a test oracle for
// the WASM port. Not part of the shipped SDK.
export function getSvgPathFromStrokePoints(points: StrokePoint[], closed = false): string {
	const len = points.length

	if (len < 2) {
		return ''
	}

	resetPath()

	if (len === 2) {
		const a = points[0].point
		const b = points[1].point
		const ax = toCenti(a.x)
		const ay = toCenti(a.y)
		writeStr('M')
		writeCPair(ax, ay)
		writeStr('l')
		writeCPair(toCenti(b.x) - ax, toCenti(b.y) - ay)
		return finishPath()
	}

	const first = points[0].point
	const second = points[1].point
	const third = points[2].point

	const secondX = toCenti(second.x)
	const secondY = toCenti(second.y)
	// midpoint of the first and second points
	const m01x = Math.round((first.x + second.x) * 50)
	const m01y = Math.round((first.y + second.y) * 50)
	// midpoint of the second and third points
	const m12x = Math.round((second.x + third.x) * 50)
	const m12y = Math.round((second.y + third.y) * 50)

	// Current position in integer hundredths
	let cx = m12x
	let cy = m12y

	if (closed) {
		// If closed, start at the first midpoint and draw a curve through the second point
		writeStr('M')
		writeCPair(m01x, m01y)
		writeStr('q')
		writeCPair(secondX - m01x, secondY - m01y)
		writeCPair(m12x - m01x, m12y - m01y)
		writeStr('t')
	} else {
		// If not closed, draw a curve starting at the first point and
		// ending at the midpoint of the second and third points.
		const firstX = toCenti(first.x)
		const firstY = toCenti(first.y)
		writeStr('M')
		writeCPair(firstX, firstY)
		writeStr('q')
		writeCPair(secondX - firstX, secondY - firstY)
		writeCPair(m12x - firstX, m12y - firstY)
		if (len > 3) writeStr('t')
	}

	// Continue the smooth quadratic chain through the midpoints of the remaining points
	for (let i = 2, max = len - 1; i < max; i++) {
		const p = points[i].point
		const q = points[i + 1].point
		const mx = Math.round((p.x + q.x) * 50)
		const my = Math.round((p.y + q.y) * 50)
		writeCPair(mx - cx, my - cy)
		cx = mx
		cy = my
	}

	const last = points[len - 1].point

	if (closed) {
		// Draw a curve from the last-first midpoint back to the first-second midpoint
		const mLastX = Math.round((last.x + first.x) * 50)
		const mLastY = Math.round((last.y + first.y) * 50)
		writeCPair(mLastX - cx, mLastY - cy)
		writeCPair(m01x - mLastX, m01y - mLastY)
		writeStr('Z')
	} else {
		// Complete the curve with a line segment to the last point.
		writeStr('l')
		writeCPair(toCenti(last.x) - cx, toCenti(last.y) - cy)
	}

	return finishPath()
}
