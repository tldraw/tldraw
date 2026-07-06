import './controls.css'
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

	// Auto-derived controls (from the component's Props type) are the baseline;
	// hand-authored argTypes override them per prop.
	const argTypes = { ...loaded.autoArgTypes, ...(loaded.sketchbook.argTypes ?? {}) }

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

	if (argType?.control === 'date') {
		return (
			<input
				type="datetime-local"
				value={toDatetimeLocal(value)}
				onChange={(e) => onValue(e.target.value ? new Date(e.target.value).toISOString() : '')}
			/>
		)
	}

	// A discriminated union: a select over the variants plus the current variant's fields.
	if (argType?.control === 'union') {
		return <UnionControl argType={argType} value={value} onValue={onValue} />
	}

	// Objects/arrays (e.g. an anchor) get a field-wise editor rather than stringifying
	// to "[object Object]" through the text input.
	if (argType?.control === 'object' || isObject(value)) {
		return <ObjectControl value={value} onValue={onValue} />
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

function isObject(value: unknown): boolean {
	return typeof value === 'object' && value !== null
}

/**
 * Render an object/array's fields as control rows: each field gets a control inferred
 * from its value (numbers become number inputs, nested objects recurse through `Control`).
 * `omit` skips a key (e.g. a union discriminant rendered separately).
 */
function objectRows(value: unknown, onValue: (value: unknown) => void, omit?: string) {
	const update = (key: string, next: unknown) => {
		if (Array.isArray(value)) {
			const clone = value.slice()
			clone[Number(key)] = next
			onValue(clone)
		} else {
			onValue({ ...(value as Record<string, unknown>), [key]: next })
		}
	}
	return Object.entries(value as Record<string, unknown>)
		.filter(([key]) => key !== omit)
		.map(([key, fieldValue]) => (
			<label key={key} className="controls__object-row">
				<span className="controls__object-key">{key}</span>
				<Control argType={undefined} value={fieldValue} onValue={(next) => update(key, next)} />
			</label>
		))
}

/** A field-wise editor for object/array args. The control tree mirrors the data tree. */
function ObjectControl({ value, onValue }: { value: unknown; onValue(value: unknown): void }) {
	return <div className="controls__object">{objectRows(value, onValue)}</div>
}

/** A discriminated-union editor: a select over the variants, then the variant's fields. */
function UnionControl({
	argType,
	value,
	onValue,
}: {
	argType: { discriminant: string; variants: Record<string, unknown> }
	value: unknown
	onValue(value: unknown): void
}) {
	const current = String((value as Record<string, unknown>)[argType.discriminant] ?? '')
	return (
		<div className="controls__object">
			<label className="controls__object-row">
				<span className="controls__object-key">{argType.discriminant}</span>
				<select value={current} onChange={(e) => onValue(argType.variants[e.target.value])}>
					{Object.keys(argType.variants).map((key) => (
						<option key={key} value={key}>
							{key}
						</option>
					))}
				</select>
			</label>
			{objectRows(value, onValue, argType.discriminant)}
		</div>
	)
}

/** Convert an ISO datetime string to a `datetime-local` input value (local, no tz). */
function toDatetimeLocal(value: unknown): string {
	const date = new Date(String(value ?? ''))
	if (Number.isNaN(date.getTime())) return ''
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
