// Visual reordering of a line's fragments from bidi embedding levels (UAX #9 rule L2): runs at
// the highest level are reversed, then every run at the next level down, and so on.

/** @internal */
export function visualOrder(levels: readonly number[]): number[] {
	const order = levels.map((_, i) => i)
	if (levels.length === 0) return order
	let max = 0
	let minOdd = Infinity
	for (const level of levels) {
		if (level > max) max = level
		if (level % 2 === 1 && level < minOdd) minOdd = level
	}
	if (minOdd === Infinity) return order
	for (let level = max; level >= minOdd; level--) {
		let i = 0
		while (i < order.length) {
			if (levels[order[i]] < level) {
				i++
				continue
			}
			let j = i
			while (j < order.length && levels[order[j]] >= level) j++
			const run = order.slice(i, j).reverse()
			order.splice(i, run.length, ...run)
			i = j
		}
	}
	return order
}
