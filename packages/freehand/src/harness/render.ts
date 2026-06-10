import { VecModel } from '../vendor'
import { CaseOutput } from './run'

interface Bounds {
	minX: number
	minY: number
	maxX: number
	maxY: number
}

function getBounds(shapes: VecModel[][], pad: number): Bounds {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const shape of shapes) {
		for (const p of shape) {
			if (p.x < minX) minX = p.x
			if (p.y < minY) minY = p.y
			if (p.x > maxX) maxX = p.x
			if (p.y > maxY) maxY = p.y
		}
	}
	if (minX > maxX) {
		minX = minY = 0
		maxX = maxY = 1
	}
	return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
}

function path(output: CaseOutput, color: string, opacity: number, strokeSize: number) {
	if (output.paint === 'fill') {
		return `<path d="${output.svg}" fill="${color}" fill-opacity="${opacity}"/>`
	}
	return `<path d="${output.svg}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${strokeSize}" stroke-linecap="round" stroke-linejoin="round"/>`
}

/**
 * An overlay image: baseline in black, candidate in red, both at half opacity. Where the two
 * agree the ink looks dark brown; any black or red fringe is a deviation.
 */
export function renderOverlaySvg(
	baseline: CaseOutput,
	candidate: CaseOutput,
	strokeSize: number,
	maxWidth = 360
): string {
	const b = getBounds([baseline.shape, candidate.shape], strokeSize + 4)
	const w = b.maxX - b.minX
	const h = b.maxY - b.minY
	const scale = Math.min(1, maxWidth / w)
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX} ${b.minY} ${w} ${h}" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}">`,
		path(baseline, '#000000', 0.5, strokeSize),
		path(candidate, '#ff0000', 0.5, strokeSize),
		`</svg>`,
	].join('')
}

/** A single implementation's output on its own, for side-by-side viewing. */
export function renderSingleSvg(output: CaseOutput, strokeSize: number, maxWidth = 360): string {
	const b = getBounds([output.shape], strokeSize + 4)
	const w = b.maxX - b.minX
	const h = b.maxY - b.minY
	const scale = Math.min(1, maxWidth / w)
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX} ${b.minY} ${w} ${h}" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}">`,
		path(output, '#000000', 1, strokeSize),
		`</svg>`,
	].join('')
}
