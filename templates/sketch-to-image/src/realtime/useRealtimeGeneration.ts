import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { DEBOUNCE_MS, DEFAULTS } from '../constants'
import { captureSketch } from './captureSketch'
import { describeSketch } from './describeSketch'
import { createRealtimeConnection, RealtimeConnection } from './falConnection'

/** User-facing generation controls, surfaced in the panel. */
export interface GenerationControls {
	prompt: string
	strength: number
	steps: number
	guidanceScale: number
	seed: number
}

export type GenerationStatus = 'idle' | 'describing' | 'generating' | 'error' | 'paused'

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
	/**
	 * Whether the prompt is being written automatically from the sketch (true),
	 * or the user has taken it over by typing (false). Typing pins the prompt;
	 * `resetPromptToAuto` hands it back to the describer.
	 */
	promptIsAuto: boolean
	/** Re-enable automatic prompt generation and describe the current sketch now. */
	resetPromptToAuto(): void
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
	// Start paused: nothing generates (neither the prompt nor the image) until the
	// user presses play. The pause guard in `sendFrame` sits before the describe
	// call, so a single flag holds back both.
	const [status, setStatus] = useState<GenerationStatus>('paused')
	const [error, setError] = useState<string | null>(null)
	const [isPaused, setIsPaused] = useState(true)
	// The prompt starts empty and is written from the sketch until the user types.
	const [promptIsAuto, setPromptIsAuto] = useState(true)
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
	// And for the auto/pinned flag, read by the stable `sendFrame`.
	const promptIsAutoRef = useRef(promptIsAuto)
	promptIsAutoRef.current = promptIsAuto
	// Aborts an in-flight describe call when a newer frame settles.
	const describeAbortRef = useRef<AbortController | null>(null)

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

	// Capture the current sketch and push it through the connection. When the
	// prompt is on auto, first ask Claude to describe the settled sketch and use
	// that as the prompt — this is what lets the user skip writing one.
	const sendFrame = useCallback(async () => {
		if (!editor || !connectionRef.current) return
		// Paused: keep drawing, but don't touch the model.
		if (isPausedRef.current) return
		try {
			const imageDataUrl = await captureSketch(editor)
			if (!imageDataUrl) {
				// Nothing drawn — clear the result and any auto-written prompt.
				describeAbortRef.current?.abort()
				setResultUrl(null)
				setStatus('idle')
				if (promptIsAutoRef.current) {
					setControlsState((prev) => (prev.prompt ? { ...prev, prompt: '' } : prev))
					controlsRef.current = { ...controlsRef.current, prompt: '' }
				}
				return
			}

			let prompt = controlsRef.current.prompt
			// Auto mode: describe the sketch and adopt that prompt before generating.
			if (promptIsAutoRef.current) {
				describeAbortRef.current?.abort()
				const controller = new AbortController()
				describeAbortRef.current = controller
				setStatus('describing')
				try {
					// Describe in `pose` mode: the generated image is used as a pose
					// reference for the (photo-trained) estimator, so we want a realistic
					// full-body photo of a person in the drawn pose, not stylized art.
					prompt = await describeSketch(imageDataUrl, controller.signal, 'pose')
				} catch (err) {
					if (controller.signal.aborted) return // a newer frame took over
					throw err
				}
				// A newer frame started describing while we waited — let it win.
				if (describeAbortRef.current !== controller) return
				// The user may have started typing while we were describing; if so,
				// don't clobber their prompt.
				if (!promptIsAutoRef.current) {
					prompt = controlsRef.current.prompt
				} else {
					setControlsState((prev) => ({ ...prev, prompt }))
					controlsRef.current = { ...controlsRef.current, prompt }
				}
			}

			setStatus('generating')
			const c = controlsRef.current
			connectionRef.current.send({
				image_url: imageDataUrl,
				prompt,
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
			// Editing the prompt text takes it off auto — the user is now steering it.
			// Cancel any in-flight describe so it can't overwrite what they typed.
			const editedPrompt = 'prompt' in update
			if (editedPrompt) {
				describeAbortRef.current?.abort()
				setPromptIsAuto(false)
				promptIsAutoRef.current = false
			}
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

	const resetPromptToAuto = useCallback(() => {
		setPromptIsAuto(true)
		promptIsAutoRef.current = true
		// Clear the pinned text and re-describe the current sketch.
		setControlsState((prev) => ({ ...prev, prompt: '' }))
		controlsRef.current = { ...controlsRef.current, prompt: '' }
		void sendFrame()
	}, [sendFrame])

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

	return {
		resultUrl,
		status,
		error,
		controls,
		setControls,
		regenerate,
		isPaused,
		setPaused,
		promptIsAuto,
		resetPromptToAuto,
	}
}
