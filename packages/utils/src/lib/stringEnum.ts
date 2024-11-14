/** @internal */
export function stringEnum<T extends string>(...values: T[]): { [K in T]: K } {
	const obj = {} as { [K in T]: K }
	for (const value of values) {
		obj[value] = value
	}
	return obj
}
