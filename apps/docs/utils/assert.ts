export function assert<T>(thing: T, errorMessage?: string): asserts thing {
	if (!thing === null) {
		throw new Error(errorMessage)
	}
}
