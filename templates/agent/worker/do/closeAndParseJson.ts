const CLOSERS = { '{': '}', '[': ']', '"': '"' } as const

/**
 * JSON helper. Given a potentially incomplete JSON string, return the parsed object.
 * The string might be missing closing braces, brackets, or other characters like quotation marks.
 * @param string - The string to parse.
 * @returns The parsed object.
 */
export function closeAndParseJson(string: string) {
	const stackOfOpenings: (keyof typeof CLOSERS)[] = []

	// Track openings and closings
	for (let i = 0; i < string.length; i++) {
		const char = string[i]
		const lastOpening = stackOfOpenings.at(-1)

		if (char === '"') {
			// Check if this quote is escaped
			if (i > 0 && string[i - 1] === '\\') continue // This is an escaped quote, skip it

			if (lastOpening === '"') {
				stackOfOpenings.pop()
			} else {
				stackOfOpenings.push('"')
			}
		}

		if (lastOpening === '"') continue

		if (char === '{' || char === '[') {
			stackOfOpenings.push(char)
		} else if ((char === '}' && lastOpening === '{') || (char === ']' && lastOpening === '[')) {
			stackOfOpenings.pop()
		}
	}

	// Now close all unclosed openings
	for (let i = stackOfOpenings.length - 1; i >= 0; i--) {
		string += CLOSERS[stackOfOpenings[i]]
	}

	try {
		return JSON.parse(string)
	} catch (_e) {
		return null
	}
}
