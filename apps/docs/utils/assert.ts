export function assert<T>(thing: T, errorMessage?: string): asserts thing is NonNullable<T> {
	if (thing === null || thing === undefined) {
		throw new Error(errorMessage)
	}
}
