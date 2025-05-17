// Euclidean algorithm to find the GCD
function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b)
}

// Returns the lowest value that the given number can be multiplied by to reach an integer
export function nearestMultiple(float: number) {
	const decimal = float.toString().split('.')[1]
	if (!decimal) return 1
	const denominator = Math.pow(10, decimal.length)
	const numerator = parseInt(decimal, 10)
	return denominator / gcd(numerator, denominator)
}
