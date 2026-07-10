import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { DEFAULTS, SAFE_NEGATIVE_PROMPT } from '../constants'
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

export type GenerationStatus = 'idle' | 'describing' | 'generating' | 'error'

export interface RealtimeGeneration {
	/** The most recent generated image, as a URL (data URL in sync mode). */
	resultUrl: string | null
	status: GenerationStatus
	error: string | null
	controls: GenerationControls
	setControls(update: Partial<GenerationControls>): void
	/**
	 * Generate one image from the current sketch. This is the single trigger for
	 * the whole pipeline: it captures the sketch, writes a prompt (in auto mode),
	 * and generates the image the pose detector then reads. Wired to the
	 * "Generate Pose" button. Ignored while a generation is already in flight, so
	 * a double-click can't run two overlapping passes.
	 */
	generate(): void
	/** True while a generation is running, so the button can disable itself. */
	isGenerating: boolean
	/**
	 * Whether the prompt is being written automatically from the sketch (true),
	 * or the user has taken it over by typing (false). Typing pins the prompt;
	 * `resetPromptToAuto` hands it back to the describer.
	 */
	promptIsAuto: boolean
	/** Re-enable automatic prompt generation for the next generation. */
	resetPromptToAuto(): void
}

/**
 * Drives one-shot sketch-to-image generation for the pose pipeline.
 *
 * It opens a warm fal connection once, then does nothing until `generate()` is
 * called (by the "Generate Pose" button). Each call rasterizes the current
 * sketch, writes a prompt from it (in auto mode), and generates a single image
 * — which the pose detector reads to produce the skeleton overlay. There is no
 * continuous loop: exactly one generation runs per click, and calls are ignored
 * while one is already in flight, so two passes can never run at once.
 */
export function useRealtimeGeneration(editor: Editor | null): RealtimeGeneration {
	const [resultUrl, setResultUrl] = useState<string | null>(null)
	const [status, setStatus] = useState<GenerationStatus>('idle')
	const [error, setError] = useState<string | null>(null)
	// True only while a generation is in flight. Used both to disable the button
	// and to drop a second `generate()` so two passes never overlap.
	const [isGenerating, setIsGenerating] = useState(false)
	const isGeneratingRef = useRef(false)
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
	// The auto/pinned flag, read by the stable `sendFrame`.
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
				// The image landed — this generation pass is done.
				isGeneratingRef.current = false
				setIsGenerating(false)
			},
			onError: (err) => {
				console.error('Realtime generation error:', err)
				setStatus('error')
				setError(err instanceof Error ? err.message : 'Generation failed')
				isGeneratingRef.current = false
				setIsGenerating(false)
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
		// One pass at a time: ignore a click while a generation is in flight so two
		// captures/describes/fal requests can never overlap. Cleared in the
		// connection's onResult/onError (the send resolves asynchronously) and on
		// every early return below.
		if (isGeneratingRef.current) return
		isGeneratingRef.current = true
		setIsGenerating(true)
		const done = () => {
			isGeneratingRef.current = false
			setIsGenerating(false)
		}
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
				done()
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
					if (controller.signal.aborted) {
						done()
						return
					}
					throw err
				}
				// Show the auto-written prompt in the panel.
				setControlsState((prev) => ({ ...prev, prompt }))
				controlsRef.current = { ...controlsRef.current, prompt }
			}

			setStatus('generating')
			const c = controlsRef.current
			// `send` resolves the result asynchronously via the connection handlers,
			// which clear the in-flight flag — don't clear it here.
			connectionRef.current.send({
				image_url: imageDataUrl,
				prompt,
				// Steer away from unsafe output so the safety filter doesn't blank the
				// frame; paired with the "fully clothed" auto-prompt in describe.ts.
				negative_prompt: SAFE_NEGATIVE_PROMPT,
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
			done()
		}
	}, [editor])

	const setControls = useCallback((update: Partial<GenerationControls>) => {
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
			controlsRef.current = next
			return next
		})
		// No auto re-generation: nothing generates until the user clicks
		// "Generate Pose". Changed controls apply to the next generation.
	}, [])

	const resetPromptToAuto = useCallback(() => {
		setPromptIsAuto(true)
		promptIsAutoRef.current = true
		// Clear the pinned text; the next generation will describe the sketch.
		setControlsState((prev) => ({ ...prev, prompt: '' }))
		controlsRef.current = { ...controlsRef.current, prompt: '' }
	}, [])

	const generate = useCallback(() => void sendFrame(), [sendFrame])

	return {
		resultUrl,
		status,
		error,
		controls,
		setControls,
		generate,
		isGenerating,
		promptIsAuto,
		resetPromptToAuto,
	}
}
