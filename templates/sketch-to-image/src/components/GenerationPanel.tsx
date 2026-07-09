import { useState } from 'react'
import { GenerationControls, GenerationStatus } from '../realtime/useRealtimeGeneration'

interface GenerationPanelProps {
	resultUrl: string | null
	status: GenerationStatus
	error: string | null
	controls: GenerationControls
	setControls(update: Partial<GenerationControls>): void
	isPaused: boolean
	setPaused(paused: boolean): void
	promptIsAuto: boolean
	resetPromptToAuto(): void
}

/**
 * The panel beside the canvas. Shows the live generated image and the controls
 * that steer it, plus a button to animate the current result into a short clip.
 */
export function GenerationPanel({
	resultUrl,
	status,
	error,
	controls,
	setControls,
	isPaused,
	setPaused,
	promptIsAuto,
	resetPromptToAuto,
}: GenerationPanelProps) {
	return (
		<div className="generation-panel">
			<div className="generation-panel-header">
				<button
					className="pause-button"
					onClick={() => setPaused(!isPaused)}
					title={isPaused ? 'Resume live generation' : 'Pause — draw without updating the image'}
				>
					{isPaused ? '▶ Resume' : '❚❚ Pause'}
				</button>
			</div>

			<div className="generation-panel-preview">
				<ResultView resultUrl={resultUrl} status={status} error={error} />
			</div>

			<div className="generation-panel-controls">
				<label className="control">
					<span className="control-label-row">
						Prompt
						{promptIsAuto ? (
							<span className="prompt-auto-badge" title="Written from your sketch by Claude">
								✦ auto
							</span>
						) : (
							<button
								type="button"
								className="prompt-auto-reset"
								onClick={resetPromptToAuto}
								title="Let Claude write the prompt from your sketch again"
							>
								Use auto
							</button>
						)}
					</span>
					<textarea
						value={controls.prompt}
						rows={2}
						placeholder={
							promptIsAuto
								? status === 'describing'
									? 'Reading your sketch…'
									: 'Draw something — a prompt will be written for you.'
								: 'Describe what your sketch should become'
						}
						onChange={(e) => setControls({ prompt: e.target.value })}
					/>
					<small>
						{promptIsAuto
							? 'Auto-written from your sketch. Type to take over.'
							: 'You’re steering the prompt. Use auto to hand it back.'}
					</small>
				</label>

				<label className="control">
					<span>
						Strength <em>{controls.strength.toFixed(2)}</em>
					</span>
					<input
						type="range"
						min={0.1}
						max={1}
						step={0.05}
						value={controls.strength}
						onChange={(e) => setControls({ strength: Number(e.target.value) })}
					/>
					<small>Lower stays closer to your sketch; higher leans on the prompt.</small>
				</label>

				<label className="control">
					<span>
						Steps <em>{controls.steps}</em>
					</span>
					<input
						type="range"
						min={1}
						max={8}
						step={1}
						value={controls.steps}
						onChange={(e) => setControls({ steps: Number(e.target.value) })}
					/>
				</label>

				<label className="control">
					<span>Seed</span>
					<input
						type="number"
						value={controls.seed}
						onChange={(e) => setControls({ seed: Number(e.target.value) })}
					/>
				</label>

				<AnimateButton resultUrl={resultUrl} prompt={controls.prompt} />
			</div>
		</div>
	)
}

function ResultView({
	resultUrl,
	status,
	error,
}: {
	resultUrl: string | null
	status: GenerationStatus
	error: string | null
}) {
	if (error) {
		return (
			<div className="result-placeholder result-error">
				<strong>Generation error</strong>
				<span>{error}</span>
			</div>
		)
	}

	if (!resultUrl) {
		return (
			<div className="result-placeholder">
				<strong>Start drawing</strong>
				<span>Your sketch will be turned into an image here in realtime.</span>
			</div>
		)
	}

	return (
		<>
			<img className="result-image" src={resultUrl} alt="Generated result" />
			{status === 'describing' && <div className="result-badge">reading sketch…</div>}
			{status === 'generating' && <div className="result-badge">generating…</div>}
			{status === 'paused' && <div className="result-badge result-badge-paused">paused</div>}
		</>
	)
}

/**
 * Turns the current generated image into a short video via the (non-realtime)
 * /api/animate endpoint. This is the secondary feature of the template.
 */
function AnimateButton({ resultUrl, prompt }: { resultUrl: string | null; prompt: string }) {
	const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
	const [videoUrl, setVideoUrl] = useState<string | null>(null)

	const animate = async () => {
		if (!resultUrl) return
		setState('loading')
		setVideoUrl(null)
		try {
			const res = await fetch('/api/animate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ imageUrl: resultUrl, prompt }),
			})
			if (!res.ok) {
				const err = (await res.json()) as { error?: string }
				throw new Error(err.error ?? 'Failed')
			}
			const data = (await res.json()) as { videoUrl: string }
			setVideoUrl(data.videoUrl)
			setState('idle')
		} catch (e) {
			console.error('Animate failed:', e)
			setState('error')
		}
	}

	return (
		<div className="animate-section">
			<button
				className="animate-button"
				disabled={!resultUrl || state === 'loading'}
				onClick={animate}
			>
				{state === 'loading' ? 'Animating…' : 'Animate → video'}
			</button>
			{state === 'error' && <small className="animate-error">Couldn’t animate. Try again.</small>}
			{videoUrl && <video className="result-video" src={videoUrl} controls autoPlay loop muted />}
		</div>
	)
}
