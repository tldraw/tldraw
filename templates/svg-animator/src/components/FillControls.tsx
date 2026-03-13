import { DEFAULT_FILL_OPTIONS, FillOptions } from '../lib/fill-path'
import { PressureOptions } from '../lib/path-animator/types'

interface FillControlsProps {
	options: FillOptions
	onChange: (options: FillOptions) => void
	pressure: PressureOptions
	onPressureChange: (options: PressureOptions) => void
	onGenerate: () => void
	onClear: () => void
	hasShapes: boolean
}

export function FillControls({
	options,
	onChange,
	pressure,
	onPressureChange,
	onGenerate,
	onClear,
	hasShapes,
}: FillControlsProps) {
	const update = (partial: Partial<FillOptions>) => {
		onChange({ ...options, ...partial })
	}

	const updatePressure = (partial: Partial<PressureOptions>) => {
		onPressureChange({ ...pressure, ...partial })
	}

	return (
		<div className="panel-section">
			<h3>Fill path</h3>

			<label>
				Step over: {options.stepOver}px
				<input
					type="range"
					min={1}
					max={30}
					step={0.5}
					value={options.stepOver}
					onChange={(e) => update({ stepOver: parseFloat(e.target.value) })}
				/>
			</label>

			<label>
				Angle: {options.angle}°
				<input
					type="range"
					min={0}
					max={180}
					step={1}
					value={options.angle}
					onChange={(e) => update({ angle: parseFloat(e.target.value) })}
				/>
			</label>

			<label>
				Margin: {options.margin}px
				<input
					type="range"
					min={0}
					max={20}
					step={0.5}
					value={options.margin}
					onChange={(e) => update({ margin: parseFloat(e.target.value) })}
				/>
			</label>

			<label className="checkbox-label">
				<input
					type="checkbox"
					checked={options.connectEnds}
					onChange={(e) => update({ connectEnds: e.target.checked })}
				/>
				Connect ends
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
				<button onClick={onGenerate} disabled={!hasShapes} className="primary">
					Generate fill
				</button>
				<button onClick={() => onChange({ ...DEFAULT_FILL_OPTIONS })} className="secondary">
					Reset
				</button>
				<button onClick={onClear} className="secondary">
					Clear
				</button>
			</div>
		</div>
	)
}
