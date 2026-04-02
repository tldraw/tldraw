import type { RumInteractionMetric, RumSink } from '../types'

const COLORS = {
	Good: '#40C057',
	Mid: '#FFC078',
	Poor: '#E03131',
}
const PREFIX_COLOR = COLORS.Good

/**
 * A development sink that logs RUM metrics to the browser console
 * with color-coded performance indicators.
 *
 * @public
 */
export class ConsoleSink implements RumSink {
	send(metrics: RumInteractionMetric[]): void {
		for (const m of metrics) {
			const fps = m.avgFrameTime > 0 ? Math.round(1000 / m.avgFrameTime) : 0
			const background = fps > 55 ? COLORS.Good : fps > 30 ? COLORS.Mid : COLORS.Poor
			const color = background === COLORS.Mid ? 'black' : 'white'
			const label = m.operation[0].toUpperCase() + m.operation.slice(1)

			const loaf = m.longAnimationFrames
			const loafSuffix =
				loaf && loaf.length > 0
					? `  loaf=${loaf.length}×(max ${Math.round(Math.max(...loaf.map((l) => l.duration)))}ms, blocking ${Math.round(loaf.reduce((s, l) => s + l.blockingDuration, 0))}ms)`
					: ''

			// eslint-disable-next-line no-console
			console.debug(
				`%cRUM%c ${label} %c${fps} fps%c  apdex=${m.apdex.toFixed(2)}  dropped=${m.droppedFrames}/${m.totalFrames}  shapes=${m.context.shapeCount}  dur=${Math.round(m.duration)}ms${loafSuffix}`,
				`color: white; background: ${PREFIX_COLOR}; padding: 2px; border-radius: 3px;`,
				'font-weight: normal',
				`font-weight: bold; padding: 2px; background: ${background}; color: ${color};`,
				'font-weight: normal'
			)
		}
	}
}
