import { EASING_FUNCTIONS } from '../lib/path-animator'
import { PressureOptions } from '../lib/path-animator/types'

interface AnimationControlsProps {
	duration: number
	onDurationChange: (ms: number) => void
	easingName: string
	onEasingChange: (name: string) => void
	pressure: PressureOptions
	onPressureChange: (options: PressureOptions) => void
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
	pressure,
	onPressureChange,
	onAnimate,
	onStop,
	isAnimating,
	hasFillPaths,
}: AnimationControlsProps) {
	const updatePressure = (partial: Partial<PressureOptions>) => {
		onPressureChange({ ...pressure, ...partial })
	}

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

			<h4>Pressure</h4>

			<label>
				Base: {pressure.basePressure.toFixed(2)}
				<input
					type="range"
					min={0}
					max={1}
					step={0.01}
					value={pressure.basePressure}
					onChange={(e) => updatePressure({ basePressure: parseFloat(e.target.value) })}
				/>
			</label>

			<label>
				Variation: {pressure.pressureVariation.toFixed(2)}
				<input
					type="range"
					min={0}
					max={0.5}
					step={0.01}
					value={pressure.pressureVariation}
					onChange={(e) => updatePressure({ pressureVariation: parseFloat(e.target.value) })}
				/>
			</label>

			<label>
				Frequency: {pressure.pressureFrequency.toFixed(3)}
				<input
					type="range"
					min={0.01}
					max={0.5}
					step={0.005}
					value={pressure.pressureFrequency}
					onChange={(e) => updatePressure({ pressureFrequency: parseFloat(e.target.value) })}
				/>
			</label>

			<label>
				Seed: {pressure.seed}
				<input
					type="range"
					min={0}
					max={999}
					step={1}
					value={pressure.seed}
					onChange={(e) => updatePressure({ seed: parseInt(e.target.value, 10) })}
				/>
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
