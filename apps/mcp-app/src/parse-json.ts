import {
	FocusedShapeSchema,
	FocusedShapeUpdateSchema,
	type FocusedShape,
	type FocusedShapeUpdate,
} from './focused-shape-schema'

function tryParseArray(json: string): unknown[] | null {
	try {
		const parsed = JSON.parse(json)
		return Array.isArray(parsed) ? parsed : null
	} catch {
		return null
	}
}

function getNextNonWhitespace(input: string, startIndex: number): string | null {
	for (let i = startIndex; i < input.length; i++) {
		const char = input[i]
		if (!/\s/.test(char)) return char
	}
	return null
}

function getPrevNonWhitespace(output: string): string | null {
	for (let i = output.length - 1; i >= 0; i--) {
		const char = output[i]
		if (!/\s/.test(char)) return char
	}
	return null
}

export function healJsonArrayString(input: string): string {
	// Normalize common typographic quotes first.
	const normalized = input.replace(/[\u201C\u201D]/g, '"')

	let output = ''
	let inString = false
	let escaped = false

	for (let i = 0; i < normalized.length; i++) {
		const char = normalized[i]

		if (inString) {
			output += char
			if (escaped) {
				escaped = false
			} else if (char === '\\') {
				escaped = true
			} else if (char === '"') {
				inString = false
			}
			continue
		}

		if (char === '"') {
			// Heal the recurring model mistake: stray quote after a number, e.g. `"x": 100",`.
			const prev = getPrevNonWhitespace(output)
			const next = getNextNonWhitespace(normalized, i + 1)
			if (prev && /[0-9]/.test(prev) && (next === ',' || next === '}' || next === ']')) {
				continue
			}
			inString = true
			output += char
			continue
		}

		// Heal trailing commas outside strings, e.g. `[{"x":1},]`.
		if (char === ',') {
			const next = getNextNonWhitespace(normalized, i + 1)
			if (next === ']' || next === '}') {
				continue
			}
		}

		output += char
	}

	return output
}

export function parseJsonArray(json: string, fieldName: string): unknown[] {
	const parsed = tryParseArray(json)
	if (parsed) return parsed

	const healed = healJsonArrayString(json)
	const repaired = tryParseArray(healed)
	if (repaired) return repaired

	throw new Error(
		`${fieldName} must be a JSON array string. Build an array first, then pass JSON.stringify(array).`
	)
}

export function parseFocusedShapesInput(json: string): FocusedShape[] {
	const parsed = parseJsonArray(json, 'shapesJson')
	const normalized: FocusedShape[] = []
	for (const input of parsed) {
		const result = FocusedShapeSchema.safeParse(input)
		if (!result.success) {
			throw new Error(result.error.issues[0]?.message ?? 'Invalid shape in shapesJson')
		}
		normalized.push(result.data)
	}
	return normalized
}

export function parseFocusedShapeUpdatesInput(json: string): FocusedShapeUpdate[] {
	const parsed = parseJsonArray(json, 'updatesJson')

	const normalized: FocusedShapeUpdate[] = []
	for (const input of parsed) {
		const result = FocusedShapeUpdateSchema.safeParse(input)
		if (!result.success) {
			throw new Error(result.error.issues[0]?.message ?? 'Invalid shape update in updatesJson')
		}
		normalized.push(result.data)
	}
	return normalized
}

export function parseShapeIdsInput(json: string): string[] {
	const parsed = parseJsonArray(json, 'shapeIdsJson')
	return parsed.filter((id): id is string => typeof id === 'string')
}

export function parseBooleanFlag(value: unknown, defaultValue = false): boolean {
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value !== 0
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase()
		if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
		if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
	}
	return defaultValue
}
