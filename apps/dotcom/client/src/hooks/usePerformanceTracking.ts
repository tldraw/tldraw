import { useCallback } from 'react'
import {
	Editor,
	TLCameraEndPerfEvent,
	TLInteractionEndPerfEvent,
	TLPerfFrameTimeStats,
} from 'tldraw'
import { sentryReleaseName } from '../../sentry-release-name'
import { fetchFeatureFlags } from '../tla/utils/FeatureFlagPoller'
import { trackEvent } from '../utils/analytics'

const r2 = (n: number) => Math.round(n * 100) / 100

// Counts editor mounts (file navigations). First mount = 0.
let editorMountCount = 0

function commonStats(event: TLPerfFrameTimeStats & { shapeCount: number; zoomLevel: number }) {
	const loafs = event.longAnimationFrames
	return {
		duration_ms: Math.round(event.duration),
		fps: Math.round(event.fps * 10) / 10,
		frame_count: event.frameCount,
		avg_frame_time: r2(event.avgFrameTime),
		median_frame_time: r2(event.medianFrameTime),
		p95_frame_time: r2(event.p95FrameTime),
		p99_frame_time: r2(event.p99FrameTime),
		min_frame_time: r2(event.minFrameTime),
		max_frame_time: r2(event.maxFrameTime),
		shape_count: event.shapeCount,
		zoom_level: r2(event.zoomLevel),
		has_loaf: (loafs?.length ?? 0) > 0,
		loaf_count: loafs?.length ?? 0,
		release: sentryReleaseName,
	}
}

function handleInteractionEnd(event: TLInteractionEndPerfEvent, abIndicators: 'canvas' | 'svg') {
	trackEvent('rum', {
		type: 'interaction',
		interaction_name: event.name,
		interaction_path: event.path,
		selected_shape_count: Object.values(event.selectedShapeTypes).reduce((a, b) => a + b, 0),
		selected_shape_types: event.selectedShapeTypes,
		ab_indicators: abIndicators,
		...commonStats(event),
	})
}

function handleCameraEnd(event: TLCameraEndPerfEvent, abIndicators: 'canvas' | 'svg') {
	trackEvent('rum', {
		type: 'camera',
		camera_type: event.type,
		visible_shape_count: event.visibleShapeCount,
		culled_shape_count: event.culledShapeCount,
		ab_indicators: abIndicators,
		...commonStats(event),
	})
}

export function usePerformanceTracking() {
	return useCallback((editor: Editor) => {
		let unsubInteraction: (() => void) | undefined
		let unsubCamera: (() => void) | undefined
		let memoryInterval: ReturnType<typeof setInterval> | undefined
		let visibilityHandler: (() => void) | undefined
		let unsubPageChange: (() => void) | undefined
		let disposed = false

		fetchFeatureFlags()
			.then((flags) => {
				if (disposed) return
				const isChromeOS = typeof navigator !== 'undefined' && navigator.userAgent.includes('CrOS')
				if (!flags.rum_enabled?.enabled && !isChromeOS) return

				// Derive from the editor option — this is the ground truth for what's
				// actually rendering, so the RUM tag always matches the UI path.
				const abIndicators = editor.options.useCanvasIndicators ? 'canvas' : 'svg'

				unsubInteraction = editor.performance.on('interaction-end', (event) =>
					handleInteractionEnd(event, abIndicators)
				)
				unsubCamera = editor.performance.on('camera-end', (event) =>
					handleCameraEnd(event, abIndicators)
				)

				editorMountCount++
				// Memory sampling (Chrome-only via performance.memory)
				if ((performance as any).memory) {
					const mountTime = Date.now()
					let sampleIndex = 0
					let pageChangeCount = 0
					const deviceMemoryGb = (navigator as any).deviceMemory ?? null
					const MB = 1024 * 1024

					const sampleMemory = (reason: 'interval' | 'visibility_hidden' | 'page_change') => {
						const m = (performance as any).memory
						// Non-cross-origin-isolated contexts get quantized (often 0) heap fields — skip.
						if (!m || !m.jsHeapSizeLimit) return
						const event = {
							type: 'memory' as const,
							sample_index: sampleIndex,
							sample_reason: reason,
							session_duration_s: Math.round((Date.now() - mountTime) / 1000),
							used_js_heap_mb: r2(m.usedJSHeapSize / MB),
							total_js_heap_mb: r2(m.totalJSHeapSize / MB),
							heap_limit_mb: r2(m.jsHeapSizeLimit / MB),
							heap_used_pct: r2(m.usedJSHeapSize / m.jsHeapSizeLimit),
							shape_count: editor.getCurrentPageShapeIds().size,
							page_count: editor.getPages().length,
							page_change_count: pageChangeCount,
							editor_mount_count: editorMountCount,
							zoom_level: r2(editor.getZoomLevel()),
							device_memory_gb: sampleIndex === 0 ? deviceMemoryGb : null,
							ab_indicators: abIndicators,
							release: sentryReleaseName,
						}
						try {
							trackEvent('rum', event)
						} catch {
							// PostHog errors shouldn't break the interval loop.
						}
						sampleIndex++
					}

					unsubPageChange = editor.sideEffects.registerAfterChangeHandler(
						'instance',
						(prev, next) => {
							if (disposed) return
							if (prev.currentPageId !== next.currentPageId) {
								pageChangeCount++
								sampleMemory('page_change')
							}
						}
					)

					memoryInterval = setInterval(() => {
						if (disposed) return
						sampleMemory('interval')
					}, 60_000)

					visibilityHandler = () => {
						if (document.visibilityState === 'hidden' && !disposed) {
							sampleMemory('visibility_hidden')
						}
					}
					document.addEventListener('visibilitychange', visibilityHandler)
				}
			})
			.catch(() => {
				// noop — flag fetch failures are already logged by FeatureFlagPoller
			})

		return () => {
			disposed = true
			unsubInteraction?.()
			unsubCamera?.()
			if (memoryInterval) clearInterval(memoryInterval)
			unsubPageChange?.()
			if (visibilityHandler) {
				document.removeEventListener('visibilitychange', visibilityHandler)
			}
		}
	}, [])
}
