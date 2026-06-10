/** Mirrors `assert` from `@tldraw/utils`. @public */
export function assert(value: unknown, message?: string): asserts value {
	if (!value) {
		throw new Error(message || 'Assertion Error')
	}
}
