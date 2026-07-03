import { LoadedSketch } from './registry'

interface ControlsProps {
	loaded: LoadedSketch
	args: Record<string, unknown>
	onChange(next: Record<string, unknown>): void
}

/**
 * A form for editing the selected sketch's args live. For now the input type is
 * inferred from each arg's value; explicit `argTypes` (e.g. a select for a union)
 * is the next refinement.
 */
export function Controls({ loaded, args, onChange }: ControlsProps) {
	const keys = Object.keys(loaded.sketch.args ?? {})
	if (keys.length === 0) return <p className="controls__empty">No args to control.</p>

	return (
		<div className="controls">
			{keys.map((key) => (
				<label key={key} className="controls__row">
					<span className="controls__label">{key}</span>
					<Control value={args[key]} onValue={(value) => onChange({ ...args, [key]: value })} />
				</label>
			))}
		</div>
	)
}

function Control({ value, onValue }: { value: unknown; onValue(value: unknown): void }) {
	if (typeof value === 'boolean') {
		return <input type="checkbox" checked={value} onChange={(e) => onValue(e.target.checked)} />
	}
	if (typeof value === 'number') {
		return <input type="number" value={value} onChange={(e) => onValue(e.target.valueAsNumber)} />
	}
	return (
		<input
			type="text"
			value={value === undefined ? '' : String(value)}
			onChange={(e) => onValue(e.target.value)}
		/>
	)
}
