/**
 * JSON helper. Given a potentially incomplete JSON string, return the parsed object.
 * The string might be missing closing braces, brackets, or other characters like quotation marks.
 * @param string - The string to parse.
 * @returns The parsed object.
 */
export function closeAndParseJson(string: string) {
	const stackOfOpenings = []

	// Track openings and closings
	for (const char of string) {
		const lastOpening = stackOfOpenings.at(-1)
		if (char === '"') {
			if (lastOpening === '"') {
				stackOfOpenings.pop()
			} else {
				stackOfOpenings.push('"')
			}
		}

		if (lastOpening === '"') {
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
