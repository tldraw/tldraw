import { EASING_FUNCTIONS } from '../lib/path-animator'

interface AnimationControlsProps {
	duration: number
	onDurationChange: (ms: number) => void
	easingName: string
	onEasingChange: (name: string) => void
	onAnimate: () => void
	onStop: () => void
	isAnimating: boolean
	hasFillPaths: boolean
}

export function AnimationControls({
	duration,
	onDurationChange,
	easingName,
	onEasingChange,
	onAnimate,
	onStop,
	isAnimating,
	hasFillPaths,
}: AnimationControlsProps) {
	return (
		<div className="panel-section">
			<h3>Animation</h3>

			<label>
				Duration: {(duration / 1000).toFixed(1)}s
				<input
					type="range"
					min={500}
					max={15000}
					step={100}
					value={duration}
					onChange={(e) => onDurationChange(parseFloat(e.target.value))}
				/>
			</label>

			<label>
				Easing
				<select value={easingName} onChange={(e) => onEasingChange(e.target.value)}>
					{Object.keys(EASING_FUNCTIONS).map((name) => (
						<option key={name} value={name}>
							{name}
						</option>
					))}
				</select>
			</label>

			<div className="button-row">
				{isAnimating ? (
					<button onClick={onStop} className="danger">
						Stop
					</button>
				) : (
					<button onClick={onAnimate} disabled={!hasFillPaths} className="primary">
						Animate
					</button>
				)}
			</div>
		</div>
	)
}
