import * as baseline from '../baseline'
import { CorpusCase } from '../corpus/strokes'
import * as candidate from '../lib/api'
import { StrokeOptions, StrokePoint } from '../lib/types'
import { VecModel } from '../vendor'
import {
	CaseMetrics,
	countSvgCommands,
	measureDeviation,
	timeMedian,
	type OutputMetrics,
} from './metrics'

/**
 * The functions an ink implementation must provide to be compared by the harness. Both the
 * frozen baseline and the candidate implementation satisfy this shape.
 */
export interface InkImplementation {
	name: string
	getStrokePoints(points: VecModel[], options: StrokeOptions): StrokePoint[]
	getStroke(points: VecModel[], options: StrokeOptions): VecModel[]
	svgInk(points: VecModel[], options: StrokeOptions): string
	getSvgPathFromStrokePoints(points: StrokePoint[], closed?: boolean): string
}

export const baselineImpl: InkImplementation = { name: 'baseline', ...baseline }
export const candidateImpl: InkImplementation = { name: 'candidate', ...candidate }

export interface CaseOutput {
	/** The geometry to compare: outline polygon (draw/pen) or centerline (solid/highlight). */
	shape: VecModel[]
	/** Whether `shape` is a closed polygon. */
	closed: boolean
	/** The SVG path data that tldraw would render for this case. */
	svg: string
	/** How tldraw paints the path. */
	paint: 'fill' | 'stroke'
}

/**
 * Produce the output tldraw would actually use for this case. Strokes with the 'draw' dash style
 * (mouse or pen) are rendered as a filled outline via svgInk; solid strokes and the highlighter
 * are rendered as a stroked centerline path.
 */
export function runCase(impl: InkImplementation, c: CorpusCase): CaseOutput {
	if (c.kind === 'draw' || c.kind === 'pen') {
		return {
			shape: impl.getStroke(c.points, c.options),
			closed: true,
			svg: impl.svgInk(c.points, c.options),
			paint: 'fill',
		}
	}
	const strokePoints = impl.getStrokePoints(c.points, c.options)
	return {
		shape: strokePoints.map((p) => p.point),
		closed: false,
		svg: impl.getSvgPathFromStrokePoints(strokePoints, false),
		paint: 'stroke',
	}
}

function measureOutput(impl: InkImplementation, c: CorpusCase, output: CaseOutput): OutputMetrics {
	const ms = timeMedian(() => runCase(impl, c))
	return {
		points: output.shape.length,
		svgLength: output.svg.length,
		svgCommands: countSvgCommands(output.svg),
		ms,
	}
}

export interface ComparedCase {
	metrics: CaseMetrics
	baselineOutput: CaseOutput
	candidateOutput: CaseOutput
}

/** Run one corpus case through both implementations and measure everything. */
export function compareCase(c: CorpusCase): ComparedCase {
	const baselineOutput = runCase(baselineImpl, c)
	const candidateOutput = runCase(candidateImpl, c)
	const deviation = measureDeviation(
		baselineOutput.shape,
		candidateOutput.shape,
		baselineOutput.closed
	)
	const strokeSize = c.options.size ?? 16
	const metrics: CaseMetrics = {
		id: c.id,
		kind: c.kind,
		inputPoints: c.points.length,
		strokeSize,
		baseline: measureOutput(baselineImpl, c, baselineOutput),
		candidate: measureOutput(candidateImpl, c, candidateOutput),
		deviation,
		maxDeviationRatio: deviation.max / strokeSize,
	}
	return { metrics, baselineOutput, candidateOutput }
}
