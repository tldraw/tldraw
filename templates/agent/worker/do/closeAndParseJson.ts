/**
 * JSON helper. Given a potentially incomplete JSON string, return the parsed object.
 * The string might be missing closing braces, brackets, or other characters like quotation marks.
 * @param string - The string to parse.
 * @returns The parsed object.
 */
export function closeAndParseJson(string: string) {
	const stackOfOpenings = []

	// Track openings and closings
	let i = 0
	while (i < string.length) {
		const char = string[i]
		const lastOpening = stackOfOpenings.at(-1)

		if (char === '"') {
			// Check if this quote is escaped
			if (i > 0 && string[i - 1] === '\\') {
				// This is an escaped quote, skip it
				i++
				continue
			}

			if (lastOpening === '"') {
				stackOfOpenings.pop()
			} else {
				stackOfOpenings.push('"')
			}
		}

		if (lastOpening === '"') {
			i++
			continue
		}

		if (char === '{' || char === '[') {
			stackOfOpenings.push(char)
		}

		if (char === '}' && lastOpening === '{') {
			stackOfOpenings.pop()
		}

		if (char === ']' && lastOpening === '[') {
			stackOfOpenings.pop()
		}

		i++
	}

	// Now close all unclosed openings
	for (let i = stackOfOpenings.length - 1; i >= 0; i--) {
		const opening = stackOfOpenings[i]
		if (opening === '{') {
			string += '}'
		}

		if (opening === '[') {
			string += ']'
		}

		if (opening === '"') {
			string += '"'
		}
	}

	try {
		return JSON.parse(string)
	} catch (_e) {
		return null
	}
}
