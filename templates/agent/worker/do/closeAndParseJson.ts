const CLOSERS = { '{': '}', '[': ']', '"': '"' } as const

// Parse a potentially incomplete JSON string by closing any unclosed braces, brackets, and quotes.
export function closeAndParseJson(string: string) {
	const stackOfOpenings: (keyof typeof CLOSERS)[] = []

	for (let i = 0; i < string.length; i++) {
		const char = string[i]
		const lastOpening = stackOfOpenings.at(-1)

		if (char === '"') {
			if (i > 0 && string[i - 1] === '\\') continue // escaped quote

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

	for (let i = stackOfOpenings.length - 1; i >= 0; i--) {
		string += CLOSERS[stackOfOpenings[i]]
	}

	try {
		return JSON.parse(string)
	} catch (_e) {
		return null
	}
}
