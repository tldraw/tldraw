import type { PerformanceManager } from './PerformanceManager'

/**
 * Optional adapter that pipes PerformanceManager events into browser
 * `performance.mark()` / `performance.measure()` for DevTools integration.
 *
 * Tree-shakeable — only included if imported.
 *
 * @example
 * ```ts
 * const adapter = new PerformanceApiAdapter(editor.performance)
 * // ... later
 * adapter.dispose()
 * ```
 *
 * @public
 */
export class PerformanceApiAdapter {
	private cleanups: (() => void)[] = []

	constructor(perfManager: PerformanceManager) {
		this.cleanups.push(
			perfManager.on('interaction:start', (event) => {
				performance.mark(`tldraw:interaction:${event.name}:start`, {
					detail: { path: event.path },
				})
			})
		)

		this.cleanups.push(
			perfManager.on('interaction:end', (event) => {
				const startMark = `tldraw:interaction:${event.name}:start`
				const endMark = `tldraw:interaction:${event.name}:end`
				performance.mark(endMark, {
					detail: {
						path: event.path,
						fps: event.fps,
						frameCount: event.frameCount,
						shapeCount: event.shapeCount,
					},
				})
				try {
					performance.measure(`tldraw:interaction:${event.name}`, startMark, endMark)
				} catch {
					// start mark may not exist if adapter attached mid-interaction
				}
			})
		)

		this.cleanups.push(
			perfManager.on('camera:start', (event) => {
				performance.mark(`tldraw:camera:${event.type}:start`)
			})
		)

		this.cleanups.push(
			perfManager.on('camera:end', (event) => {
				const startMark = `tldraw:camera:${event.type}:start`
				const endMark = `tldraw:camera:${event.type}:end`
				performance.mark(endMark, {
					detail: { fps: event.fps, shapeCount: event.shapeCount },
				})
				try {
					performance.measure(`tldraw:camera:${event.type}`, startMark, endMark)
				} catch {
					// start mark may not exist
				}
			})
		)
	}

	dispose() {
		for (const cleanup of this.cleanups) {
			cleanup()
		}
		this.cleanups.length = 0
	}
}
