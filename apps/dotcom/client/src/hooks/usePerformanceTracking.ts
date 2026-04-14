import { useCallback } from 'react'
import {
	Editor,
	TLCameraEndPerfEvent,
	TLInteractionEndPerfEvent,
	TLPerfFrameTimeStats,
} from 'tldraw'
import { fetchFeatureFlags } from '../tla/utils/FeatureFlagPoller'
import { trackEvent } from '../utils/analytics'

const r2 = (n: number) => Math.round(n * 100) / 100

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
		has_loaf: !!loafs && loafs.length > 0,
		loaf_count: loafs?.length ?? 0,
	}
}

function handleInteractionEnd(event: TLInteractionEndPerfEvent) {
	if (event.duration < 50) return

	trackEvent('rum', {
		type: 'interaction',
		interaction_name: event.name,
		interaction_path: event.path,
		selected_shape_count: (Object.values(event.selectedShapeTypes) as number[]).reduce(
			(a, b) => a + b,
			0
		),
		selected_shape_types: event.selectedShapeTypes,
		...commonStats(event),
	})
}

function handleCameraEnd(event: TLCameraEndPerfEvent) {
	trackEvent('rum', {
		type: 'camera',
		camera_type: event.type,
		visible_shape_count: event.visibleShapeCount,
		culled_shape_count: event.culledShapeCount,
		...commonStats(event),
	})
}

export function usePerformanceTracking() {
	return useCallback((editor: Editor) => {
		let unsubInteraction: (() => void) | undefined
		let unsubCamera: (() => void) | undefined

		fetchFeatureFlags().then((flags) => {
			if (!flags.rum_enabled?.enabled) return

			unsubInteraction = editor.performance.on('interaction-end', handleInteractionEnd)
			unsubCamera = editor.performance.on('camera-end', handleCameraEnd)
		})

		return () => {
			unsubInteraction?.()
			unsubCamera?.()
		}
	}, [])
}
