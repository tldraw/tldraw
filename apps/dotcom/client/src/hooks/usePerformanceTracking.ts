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

function getCoarsePlatform(): 'ios' | 'android' | 'desktop' {
	const ua = navigator.userAgent
	if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
	if (/android/i.test(ua)) return 'android'
	return 'desktop'
}

function getZoomBucket(zoom: number): string {
	if (zoom <= 0.15) return 'lte_0.15'
	if (zoom <= 0.35) return '0.15_0.35'
	if (zoom <= 0.65) return '0.35_0.65'
	if (zoom <= 1) return '0.65_1'
	return 'gt_1'
}

const coarsePlatform = getCoarsePlatform()

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
		zoom_bucket: getZoomBucket(event.zoomLevel),
		has_loaf: (loafs?.length ?? 0) > 0,
		loaf_count: loafs?.length ?? 0,
		coarse_platform: coarsePlatform,
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
		let memoryTimeout: ReturnType<typeof setTimeout> | undefined
		let memoryInterval: ReturnType<typeof setInterval> | undefined
		let visibilityHandler: (() => void) | undefined
		let disposed = false

		fetchFeatureFlags().then((flags) => {
			if (disposed || !flags.rum_enabled?.enabled) return

			// Derive from the editor option — this is the ground truth for what's
			// actually rendering, so the RUM tag always matches the UI path.
			const abIndicators = editor.options.useCanvasIndicators ? 'canvas' : 'svg'

			unsubInteraction = editor.performance.on('interaction-end', (event) =>
				handleInteractionEnd(event, abIndicators)
			)
			unsubCamera = editor.performance.on('camera-end', (event) =>
				handleCameraEnd(event, abIndicators)
			)

			// Memory sampling (Chrome-only via performance.memory)
			const mem = (performance as any).memory
			if (mem) {
				const mountTime = Date.now()
				let sampleIndex = 0
				const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100
				const deviceMemoryGb = (navigator as any).deviceMemory ?? null

				const sampleMemory = (reason: 'interval' | 'visibility_hidden') => {
					const m = (performance as any).memory
					trackEvent('rum', {
						type: 'memory',
						sample_index: sampleIndex,
						sample_reason: reason,
						session_duration_s: Math.round((Date.now() - mountTime) / 1000),
						used_js_heap_mb: toMb(m.usedJSHeapSize),
						total_js_heap_mb: toMb(m.totalJSHeapSize),
						heap_limit_mb: toMb(m.jsHeapSizeLimit),
						heap_used_pct: r2(m.usedJSHeapSize / m.jsHeapSizeLimit),
						shape_count: editor.getCurrentPageShapeIds().size,
						store_record_count: editor.store.allRecords().length,
						page_count: editor.getPages().length,
						zoom_bucket: getZoomBucket(editor.getZoomLevel()),
						device_memory_gb: sampleIndex === 0 ? deviceMemoryGb : null,
						coarse_platform: coarsePlatform,
						release: sentryReleaseName,
						ab_indicators: abIndicators,
					})
					sampleIndex++
				}

				memoryTimeout = setTimeout(() => {
					if (disposed) return
					sampleMemory('interval')
					memoryInterval = setInterval(() => {
						if (disposed) return
						sampleMemory('interval')
					}, 60_000)
				}, 10_000)

				visibilityHandler = () => {
					if (document.visibilityState === 'hidden' && !disposed) {
						sampleMemory('visibility_hidden')
					}
				}
				document.addEventListener('visibilitychange', visibilityHandler)
			}
		})

		return () => {
			disposed = true
			unsubInteraction?.()
			unsubCamera?.()
			if (memoryTimeout) clearTimeout(memoryTimeout)
			if (memoryInterval) clearInterval(memoryInterval)
			if (visibilityHandler) {
				document.removeEventListener('visibilitychange', visibilityHandler)
			}
		}
	}, [])
}
