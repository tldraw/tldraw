import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { DEBOUNCE_MS, DEFAULTS } from '../constants'
import { captureSketch } from './captureSketch'
import { createRealtimeConnection, RealtimeConnection } from './falConnection'

/** User-facing generation controls, surfaced in the panel. */
export interface GenerationControls {
	prompt: string
	strength: number
	steps: number
	guidanceScale: number
	seed: number
}

export type GenerationStatus = 'idle' | 'generating' | 'error' | 'paused'

export interface RealtimeGeneration {
	/** The most recent generated image, as a URL (data URL in sync mode). */
	resultUrl: string | null
	status: GenerationStatus
	error: string | null
	controls: GenerationControls
	setControls(update: Partial<GenerationControls>): void
	/** Force a regeneration from the current sketch (e.g. after changing a control). */
	regenerate(): void
	/** Whether the realtime loop is paused. When paused, edits don't generate. */
	isPaused: boolean
	/** Pause or resume the realtime loop. Resuming regenerates from the current sketch. */
	setPaused(paused: boolean): void
}

/**
 * Drives the realtime sketch-to-image loop.
 *
 * It opens a warm fal realtime connection, then watches the editor for changes.
 * On each change (debounced) it rasterizes the sketch and sends it to the model,
 * updating `resultUrl` as frames stream back. Changing a control re-sends the
 * current sketch with the new parameters.
 */
export function useRealtimeGeneration(editor: Editor | null): RealtimeGeneration {
	const [resultUrl, setResultUrl] = useState<string | null>(null)
	const [status, setStatus] = useState<GenerationStatus>('idle')
	const [error, setError] = useState<string | null>(null)
	const [isPaused, setIsPaused] = useState(false)
	const [controls, setControlsState] = useState<GenerationControls>({
		prompt: DEFAULTS.prompt,
		strength: DEFAULTS.strength,
		steps: DEFAULTS.steps,
		guidanceScale: DEFAULTS.guidanceScale,
		seed: DEFAULTS.seed,
	})

	const connectionRef = useRef<RealtimeConnection | null>(null)
	// Keep the latest controls in a ref so the (stable) send function always
	// reads current values without needing to be re-created on every keystroke.
	const controlsRef = useRef(controls)
	controlsRef.current = controls
	// Same trick for the pause flag: the store listener and debounce keep the
	// stable `sendFrame`, so it reads the current value from a ref.
	const isPausedRef = useRef(isPaused)
	isPausedRef.current = isPaused

	// Open the connection once per editor.
	useEffect(() => {
		if (!editor) return

		const connection = createRealtimeConnection({
			onResult: (url) => {
				setResultUrl(url)
				setStatus('idle')
				setError(null)
			},
			onError: (err) => {
				console.error('Realtime generation error:', err)
				setStatus('error')
				setError(err instanceof Error ? err.message : 'Generation failed')
			},
		})
		connectionRef.current = connection

		return () => {
			connection.close()
			connectionRef.current = null
		}
	}, [editor])

	// Capture the current sketch and push it through the connection.
	const sendFrame = useCallback(async () => {
		if (!editor || !connectionRef.current) return
		// Paused: keep drawing, but don't touch the model.
		if (isPausedRef.current) return
		try {
			const imageDataUrl = await captureSketch(editor)
			if (!imageDataUrl) {
				// Nothing drawn — clear any previous result.
				setResultUrl(null)
				setStatus('idle')
				return
			}
			setStatus('generating')
			const c = controlsRef.current
			connectionRef.current.send({
				image_url: imageDataUrl,
				prompt: c.prompt,
				strength: c.strength,
				num_inference_steps: c.steps,
				guidance_scale: c.guidanceScale,
				seed: c.seed,
				sync_mode: true,
				enable_safety_checker: true,
			})
		} catch (err) {
			console.error('Failed to capture/send sketch:', err)
			setStatus('error')
			setError(err instanceof Error ? err.message : 'Capture failed')
		}
	}, [editor])

	// Watch the editor for changes and send debounced frames.
	useEffect(() => {
		if (!editor) return

		let timeout: ReturnType<typeof setTimeout> | undefined
		const schedule = () => {
			if (timeout) clearTimeout(timeout)
			timeout = setTimeout(() => void sendFrame(), DEBOUNCE_MS)
		}

		// Fire once for whatever is already on the canvas.
		schedule()

		const unsubscribe = editor.store.listen(schedule, {
			source: 'user',
			scope: 'document',
		})

		return () => {
			if (timeout) clearTimeout(timeout)
			unsubscribe()
		}
	}, [editor, sendFrame])

	const setControls = useCallback(
		(update: Partial<GenerationControls>) => {
			setControlsState((prev) => {
				const next = { ...prev, ...update }
				// Update the ref synchronously so the immediate re-send below reads
				// the new values rather than the pre-update ones.
				controlsRef.current = next
				return next
			})
			// Re-run generation with the new settings against the current sketch.
			void sendFrame()
		},
		[sendFrame]
	)

	const regenerate = useCallback(() => void sendFrame(), [sendFrame])

	const setPaused = useCallback(
		(paused: boolean) => {
			setIsPaused(paused)
			// Update the ref synchronously so the resume regeneration below isn't
			// short-circuited by a stale `isPausedRef`.
			isPausedRef.current = paused
			if (paused) {
				setStatus('paused')
			} else {
				// Resuming: catch the image up to whatever was drawn while paused.
				setStatus('idle')
				void sendFrame()
			}
		},
		[sendFrame]
	)

	return { resultUrl, status, error, controls, setControls, regenerate, isPaused, setPaused }
}
