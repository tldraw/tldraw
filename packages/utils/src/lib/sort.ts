/** @public */
export function sortById<T extends { id: any }>(a: T, b: T) {
	return a.id > b.id ? 1 : -1
}
