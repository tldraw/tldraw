import type { RumInteractionMetric, RumSink } from '../types'

/** Configuration for the PostHog sink. @public */
export interface PostHogSinkConfig {
	/**
	 * PostHog capture function. Provide your own PostHog instance's `capture` method.
	 * This keeps `@tldraw/rum` free of a `posthog-js` dependency.
	 */
	capture: (eventName: string, properties: Record<string, unknown>) => void
	/** Event name prefix. Default `"rum_"`. */
	eventPrefix?: string
}

/**
 * Sends RUM metrics to PostHog as individual events.
 *
 * @example
 * ```ts
 * import posthog from 'posthog-js'
 * const sink = new PostHogSink({
 *   capture: (name, props) => posthog.capture(name, props),
 * })
 * ```
 *
 * @public
 */
export class PostHogSink implements RumSink {
	private capture: PostHogSinkConfig['capture']
	private prefix: string

	constructor(config: PostHogSinkConfig) {
		this.capture = config.capture
		this.prefix = config.eventPrefix ?? 'rum_'
	}

	send(metrics: RumInteractionMetric[]): void {
		for (const m of metrics) {
			const loaf = m.longAnimationFrames
			const props: Record<string, unknown> = {
				operation: m.operation,
				duration_ms: Math.round(m.duration),
				avg_frame_time_ms: Math.round(m.avgFrameTime * 100) / 100,
				p95_frame_time_ms: Math.round(m.p95FrameTime * 100) / 100,
				dropped_frames: m.droppedFrames,
				total_frames: m.totalFrames,
				apdex: Math.round(m.apdex * 1000) / 1000,
				shape_count: m.context.shapeCount,
				shape_count_bucket: m.context.shapeCountBucket,
				selection_size: m.context.selectionSize,
				viewport_width: m.context.viewport.width,
				viewport_height: m.context.viewport.height,
			}

			if (loaf && loaf.length > 0) {
				props.loaf_count = loaf.length
				props.loaf_max_duration_ms = Math.round(Math.max(...loaf.map((l) => l.duration)))
				props.loaf_total_blocking_ms = Math.round(
					loaf.reduce((sum, l) => sum + l.blockingDuration, 0)
				)
			}

			this.capture(`${this.prefix}interaction`, props)
		}
	}
}
