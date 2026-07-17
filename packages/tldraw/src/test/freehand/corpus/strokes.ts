import { VecModel } from '@tldraw/editor'
import { StrokeOptions } from '../../../lib/shapes/shared/freehand/types'
import {
	highlightSettings,
	realPressureSettings,
	simulatePressureSettings,
	solidSettings,
} from './presets'
import { REAL_STROKES } from './real'

/** A single comparison case: recorded input points plus the options tldraw would use. */
export interface CorpusCase {
	id: string
	/** What kind of tldraw stroke this represents. */
	kind: 'draw' | 'pen' | 'solid' | 'highlight'
	points: VecModel[]
	options: StrokeOptions
}

function makeCases(): CorpusCase[] {
	const cases: CorpusCase[] = []

	const add = (
		id: string,
		kind: CorpusCase['kind'],
		points: VecModel[],
		options: StrokeOptions,
		last = true
	) => {
		cases.push({ id, kind, points, options: { ...options, last } })
	}

	// All strokes were drawn with a mouse at size 'xl' and scale 1, so tldraw passes
	// strokeWidth = (theme.strokeWidth 2 * STROKE_SIZES.xl 5 + 1) * scale 1 = 11. Each
	// stroke is also rendered mid-draw and through the other stroke kinds' settings, so
	// every rendering path sees real input.
	REAL_STROKES.forEach(({ points }, i) => {
		const id = `real-${i + 1}`
		add(id, 'draw', points, simulatePressureSettings(11))
		add(`${id}-in-progress`, 'draw', points, simulatePressureSettings(11), false)
		add(`${id}-pen`, 'pen', points, realPressureSettings(11))
		add(`${id}-solid`, 'solid', points, solidSettings(11))
		add(`${id}-highlight`, 'highlight', points, highlightSettings(22))
	})

	return cases
}

/** The full corpus of comparison cases: real hand-drawn strokes recorded in tldraw. */
export const CORPUS: CorpusCase[] = makeCases()
