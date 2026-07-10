import { PoseOverlay } from '../pose/PoseOverlay'
import { PoseDebug } from '../pose/usePoseDebug'
import { GenerationControls, GenerationStatus } from '../realtime/useRealtimeGeneration'

interface GenerationPanelProps {
	resultUrl: string | null
	status: GenerationStatus
	error: string | null
	controls: GenerationControls
	setControls(update: Partial<GenerationControls>): void
	generate(): void
	isGenerating: boolean
	promptIsAuto: boolean
	resetPromptToAuto(): void
	poseDebug: PoseDebug
}

/**
 * The panel beside the canvas. Clicking "Generate Pose" runs one generation of
 * the sketch and feeds the result to pose detection — no continuous loop, one
 * pass per click.
 */
export function GenerationPanel({
	resultUrl,
	status,
	error,
	controls,
	setControls,
	generate,
	isGenerating,
	promptIsAuto,
	resetPromptToAuto,
	poseDebug,
}: GenerationPanelProps) {
	return (
		<div className="generation-panel">
			<div className="generation-panel-controls">
				<button
					className="generate-button"
					onClick={generate}
					disabled={isGenerating}
					title="Generate an image from your sketch and detect its pose"
				>
					{isGenerating ? 'Generating…' : 'Generate Pose'}
				</button>

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

				<PoseDebugSection
					poseDebug={poseDebug}
					generatedUrl={resultUrl}
					generationStatus={status}
					generationError={error}
				/>
			</div>
		</div>
	)
}

/**
 * Development readout for the sketch→pose step, backed by MediaPipe (in-browser
 * BlazePose). Toggle it on and the skeleton is drawn back over the image the
 * estimator saw. The source switch feeds it either the raw sketch or the
 * generated image, so you can compare which tracks the drawn pose better. Left
 * limbs render blue, right limbs orange, so a swapped side shows up immediately.
 *
 * The Generated source depends on a successfully generated image. When there
 * isn't one yet (generation still running, or it failed), we say so explicitly
 * rather than showing a blank overlay — a null generated image, not a pose bug,
 * is the usual reason the Generated view is empty.
 */
function PoseDebugSection({
	poseDebug,
	generatedUrl,
	generationStatus,
	generationError,
}: {
	poseDebug: PoseDebug
	generatedUrl: string | null
	generationStatus: GenerationStatus
	generationError: string | null
}) {
	const { pose, capturedUrl, status, error, enabled, setEnabled, source, setSource } = poseDebug

	// Why the Generated overlay might be empty: no image generated yet.
	const generatedMissing = source === 'generated' && !generatedUrl
	const generatedWaitReason = generationError
		? `Generation failed: ${generationError}`
		: generationStatus === 'generating' || generationStatus === 'describing'
			? 'Generating an image…'
			: 'Waiting for a generated image — draw, then click Generate Pose.'

	return (
		<div className="pose-debug-section">
			<label className="pose-debug-toggle">
				<input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
				<span>Show pose {status === 'estimating' && enabled ? '· reading…' : ''}</span>
			</label>
			{enabled && (
				<>
					<div className="pose-debug-source" role="radiogroup" aria-label="Pose input">
						<label>
							<input
								type="radio"
								name="pose-source"
								checked={source === 'sketch'}
								onChange={() => setSource('sketch')}
							/>
							Sketch
						</label>
						<label>
							<input
								type="radio"
								name="pose-source"
								checked={source === 'generated'}
								onChange={() => setSource('generated')}
							/>
							Generated
						</label>
					</div>
					{generatedMissing ? (
						<div className={`pose-debug-empty${generationError ? ' pose-debug-error' : ''}`}>
							{generatedWaitReason}
						</div>
					) : (
						<PoseOverlay pose={pose} capturedUrl={capturedUrl} />
					)}
					{source === 'sketch' && (
						<small className="pose-debug-hint">
							The pose model is trained on photos — it reads the generated image far better than a
							bare sketch.
						</small>
					)}
					{error && <small className="pose-debug-error">{error}</small>}
					<small className="pose-debug-legend">
						<span style={{ color: '#2f7bff' }}>● figure’s left</span>{' '}
						<span style={{ color: '#ff5a3d' }}>● figure’s right</span>{' '}
						<span style={{ color: '#8a55ff' }}>● spine</span>
					</small>
				</>
			)}
		</div>
	)
}
