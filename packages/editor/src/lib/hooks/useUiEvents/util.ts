export const REDACTED_VALUE = '[redacted]'

// ============================================================================
// TODO: Move to a better place in the codebase
// ============================================================================

/**
 * Strip out tldraw sensitive data from the data value
 *
 * Note you shouldn't be just sending any old data to this and expecting it
 * to filter it out. However this is a safeguard to stop users being tracked
 * across sessions.
 *
 * @param item
 * @returns
 */
export function filterValue(item: string | number) {
	if (typeof item === 'string') {
		if (item.match(/^user:/)) {
			return REDACTED_VALUE
		} else {
			return item
		}
	} else {
		return item
	}
}

export function filterObject(obj: Record<string, any>, fn: (item: any) => any) {
	const out: Record<string, any> = {}
	for (const [key, value] of Object.entries(obj)) {
		if (filterValue(key) !== REDACTED_VALUE) {
			out[key] = fn(value)
		}
	}
	return out
}

export function filterSensitiveData(raw: any): any {
	if (raw === undefined) {
		return
	}

	try {
		// Note: Slow but also really not large data being sent so bullet proof.
		const data = JSON.parse(JSON.stringify(raw))

		if (['string', 'number'].includes(typeof data)) {
			return filterValue(data)
		} else if (Array.isArray(data)) {
			return data.map(filterSensitiveData)
		} else if (data === null) {
			return data
		} else if (typeof data === 'object') {
			return filterObject(data, (item) => filterSensitiveData(item))
		} else if (typeof data === 'boolean') {
			return data
		} else {
			return REDACTED_VALUE
		}
	} catch (err: any) {
		console.error(err)
		return undefined
	}
}
