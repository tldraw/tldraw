import { useEffect, useRef, useState } from 'react'
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

	// Objects/arrays (e.g. a discriminated-union anchor) get a JSON editor rather than
	// stringifying to "[object Object]" through the text input.
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

/** A JSON editor for object/array args. Parses on every edit; only pushes valid JSON up. */
function ObjectControl({ value, onValue }: { value: unknown; onValue(value: unknown): void }) {
	const [text, setText] = useState(() => JSON.stringify(value, null, 2))
	const [invalid, setInvalid] = useState(false)
	// Track what we last pushed up, so an external change (new selection) resets the
	// editor, but our own edits don't clobber the text mid-typing.
	const lastEmitted = useRef(text)

	useEffect(() => {
		const incoming = JSON.stringify(value, null, 2)
		if (incoming !== lastEmitted.current) {
			setText(incoming)
			lastEmitted.current = incoming
			setInvalid(false)
		}
	}, [value])

	return (
		<textarea
			className={invalid ? 'controls__json controls__json--invalid' : 'controls__json'}
			value={text}
			rows={Math.max(3, Math.min(12, text.split('\n').length))}
			spellCheck={false}
			onChange={(e) => {
				const next = e.target.value
				setText(next)
				try {
					const parsed = JSON.parse(next)
					lastEmitted.current = JSON.stringify(parsed, null, 2)
					setInvalid(false)
					onValue(parsed)
				} catch {
					setInvalid(true)
				}
			}}
		/>
	)
}

/** Convert an ISO datetime string to a `datetime-local` input value (local, no tz). */
function toDatetimeLocal(value: unknown): string {
	const date = new Date(String(value ?? ''))
	if (Number.isNaN(date.getTime())) return ''
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
