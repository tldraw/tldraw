/**
 * Finds the minimum value from an iterable of numbers.
 *
 * @param values - An iterable of numbers to find the minimum from
 * @returns The minimum value, or null if the iterable is empty
 */
export function findMin(values: Iterable<number>): number | null {
	let min: number | null = null
	for (const value of values) {
		if (min === null) {
			min = value
		} else if (value < min) {
			min = value
		}
	}
	return min
}
