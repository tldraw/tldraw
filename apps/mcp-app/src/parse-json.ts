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

function healJsonArrayString(input: string): string {
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
			const prev = getPrevNonWhitespace(output)
			const next = getNextNonWhitespace(normalized, i + 1)
			if (prev && /[0-9]/.test(prev) && (next === ',' || next === '}' || next === ']')) {
				continue
			}
			inString = true
			output += char
			continue
		}

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
