import { LoadedSketch } from './registry'
import { ArgType } from './sketch'

interface ControlsProps {
	loaded: LoadedSketch
	args: Record<string, unknown>
	onChange(next: Record<string, unknown>): void
}

/**
 * A form for editing the selected sketch's args live. Each arg uses its declared
 * `argType` if the sketchbook provides one, else a control inferred from the value.
 */
export function Controls({ loaded, args, onChange }: ControlsProps) {
	const keys = Object.keys(loaded.sketch.args ?? {})
	if (keys.length === 0) return <p className="controls__empty">No args to control.</p>

	const argTypes = loaded.sketchbook.argTypes ?? {}

	return (
		<div className="controls">
			{keys.map((key) => (
				<label key={key} className="controls__row">
					<span className="controls__label">{key}</span>
					<Control
						argType={argTypes[key]}
						value={args[key]}
						onValue={(value) => onChange({ ...args, [key]: value })}
					/>
				</label>
			))}
		</div>
	)
}

function Control({
	argType,
	value,
	onValue,
}: {
	argType: ArgType | undefined
	value: unknown
	onValue(value: unknown): void
}) {
	if (argType?.control === 'select') {
		return (
			<select
				value={value === undefined ? '' : String(value)}
				onChange={(e) => onValue(e.target.value)}
			>
				{argType.options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		)
	}

	const control = argType?.control ?? inferControl(value)
	if (control === 'boolean') {
		return (
			<input type="checkbox" checked={Boolean(value)} onChange={(e) => onValue(e.target.checked)} />
		)
	}
	if (control === 'number') {
		return (
			<input
				type="number"
				value={typeof value === 'number' ? value : ''}
				onChange={(e) => onValue(e.target.valueAsNumber)}
			/>
		)
	}
	return (
		<input
			type="text"
			value={value === undefined ? '' : String(value)}
			onChange={(e) => onValue(e.target.value)}
		/>
	)
}

function inferControl(value: unknown): 'text' | 'number' | 'boolean' {
	if (typeof value === 'boolean') return 'boolean'
	if (typeof value === 'number') return 'number'
	return 'text'
}
