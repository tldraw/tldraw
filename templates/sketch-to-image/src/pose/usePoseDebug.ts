import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { captureSketch } from '../realtime/captureSketch'
import { PoseData } from '../realtime/estimatePose'
import { estimatePoseMediaPipe } from './mediapipePose'

export type PoseDebugStatus = 'idle' | 'estimating' | 'error'

/** Which image the pose estimator reads: the raw sketch or the LCM image. */
export type PoseSource = 'sketch' | 'generated'

export interface PoseDebug {
	/** The most recent pose, or null before the first estimate. */
	pose: PoseData | null
	/** The image the estimator actually saw (data URL), for overlay alignment. */
	capturedUrl: string | null
	status: PoseDebugStatus
	error: string | null
	/** Whether pose estimation is running. Toggling off stops firing on edits. */
	enabled: boolean
	setEnabled(enabled: boolean): void
	/** Whether to read the raw sketch or the generated image. */
	source: PoseSource
	setSource(source: PoseSource): void
}

/**
 * A self-contained debug loop for the sketch→pose step, now backed by MediaPipe
 * (in-browser BlazePose) instead of Claude keypoints. On each settled edit — or
 * when a new generated image arrives, if that's the chosen source — it estimates
 * a pose and exposes it so the skeleton can be drawn back over the input image.
 *
 * `source` lets you compare feeding the estimator the raw stick figure vs. the
 * LCM-generated realistic person: trained pose models expect photos, so the
 * generated image often reads better, but this makes it a live A/B.
 *
 * Estimation is in-process (no network), but we keep the abortable-supersede
 * discipline via a monotonic token so a slower earlier estimate can't overwrite
 * a newer one.
 */
export function usePoseDebug(editor: Editor | null, generatedUrl: string | null): PoseDebug {
	const [pose, setPose] = useState<PoseData | null>(null)
	const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
	const [status, setStatus] = useState<PoseDebugStatus>('idle')
	const [error, setError] = useState<string | null>(null)
	// Shown by default so the pose readout is visible on load. `generated` is the
	// default source because MediaPipe (a photo-trained model) reads the realistic
	// LCM image reliably but can't find a body in a bare stick figure.
	const [enabled, setEnabled] = useState(true)
	const [source, setSource] = useState<PoseSource>('generated')

	// Mirror flags into refs so the stable settle handler reads current values
	// without re-subscribing (same pattern as useRealtimeGeneration).
	const enabledRef = useRef(enabled)
	enabledRef.current = enabled
	const sourceRef = useRef(source)
	sourceRef.current = source
	const generatedUrlRef = useRef(generatedUrl)
	generatedUrlRef.current = generatedUrl
	// Monotonic token: a newer estimate supersedes an in-flight older one.
	const runRef = useRef(0)

	const estimate = useCallback(async () => {
		if (!editor || !enabledRef.current) return
		const token = ++runRef.current
		try {
			// Pick the input image: the raw captured sketch, or the generated image.
			const image =
				sourceRef.current === 'generated' ? generatedUrlRef.current : await captureSketch(editor)
			if (!image) {
				setPose(null)
				setCapturedUrl(null)
				setStatus('idle')
				return
			}
			setCapturedUrl(image)
			setStatus('estimating')
			const next = await estimatePoseMediaPipe(image)
			// A newer estimate started while we ran — let it win.
			if (runRef.current !== token) return
			setPose(next)
			setStatus('idle')
			setError(null)
		} catch (err) {
			if (runRef.current !== token) return
			console.error('Pose estimate failed:', err)
			setStatus('error')
			setError(err instanceof Error ? err.message : 'Pose estimate failed')
		}
	}, [editor])

	// Re-estimate whenever a new generated image arrives — that's the single
	// trigger, driven by the user clicking "Generate Pose". (There's no
	// edit-driven loop anymore: drawing alone doesn't run anything.) When the
	// source is the raw sketch, estimation is instead run on demand by
	// `setSourceAndRun` / `setEnabledAndRun` below.
	useEffect(() => {
		if (!enabled || source !== 'generated' || !generatedUrl) return
		void estimate()
	}, [enabled, source, generatedUrl, estimate])

	const setEnabledAndRun = useCallback(
		(next: boolean) => {
			setEnabled(next)
			enabledRef.current = next
			if (next) {
				void estimate()
			} else {
				// Turning off: bump the token so any in-flight estimate is dropped.
				runRef.current++
				setStatus('idle')
			}
		},
		[estimate]
	)

	const setSourceAndRun = useCallback(
		(next: PoseSource) => {
			setSource(next)
			sourceRef.current = next
			if (enabledRef.current) void estimate()
		},
		[estimate]
	)

	return {
		pose,
		capturedUrl,
		status,
		error,
		enabled,
		setEnabled: setEnabledAndRun,
		source,
		setSource: setSourceAndRun,
	}
}
