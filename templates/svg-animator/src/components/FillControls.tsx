import { DEFAULT_FILL_OPTIONS, FillOptions, FillStrategyType } from '../lib/fill-path'

interface FillControlsProps {
	options: FillOptions
	onChange: (options: FillOptions) => void
	onGenerate: () => void
	onClear: () => void
	hasShapes: boolean
}

export function FillControls({
	options,
	onChange,
	onGenerate,
	onClear,
	hasShapes,
}: FillControlsProps) {
	const update = (partial: Partial<FillOptions>) => {
		onChange({ ...options, ...partial })
	}

	return (
		<div className="panel-section">
			<h3>Fill path</h3>

			<label>
				Strategy
				<select
					value={options.strategy}
					onChange={(e) => update({ strategy: e.target.value as FillStrategyType })}
				>
					<option value="zigzag">Zigzag (hatching)</option>
					<option value="contour">Contour (offset)</option>
				</select>
			</label>

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

			{options.strategy === 'zigzag' && (
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
			)}

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

			{options.strategy === 'zigzag' && (
				<label className="checkbox-label">
					<input
						type="checkbox"
						checked={options.connectEnds}
						onChange={(e) => update({ connectEnds: e.target.checked })}
					/>
					Connect ends
				</label>
			)}

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
