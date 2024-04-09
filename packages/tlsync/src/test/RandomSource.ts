export class RandomSource {
	constructor(private _seed: number) {}

	randomInt(): number
	randomInt(lessThan: number): number
	randomInt(fromInclusive: number, toExclusive: number): number
	randomInt(lo?: number, hi?: number) {
		if (lo === undefined) {
			lo = Number.MAX_SAFE_INTEGER
		}
		if (hi === undefined) {
			hi = lo
			lo = 0
		}
		this._seed = (this._seed * 9301 + 49297) % 233280
		// float is a number between 0 and 1
		const float = this._seed / 233280
		return lo + Math.floor(float * (hi - lo))
	}

	randomAction<Result>(
		choices: Array<(() => Result) | { weight: number; do: () => any }>,
		randomWeights?: boolean
	): Result {
		type Choice = (typeof choices)[number]
		const getWeightFromChoice = (choice: Choice) =>
			'weight' in choice ? choice.weight : randomWeights ? this.randomInt(0, 10) : 1
		const weights = choices.map(getWeightFromChoice)
		const totalWeight = weights.reduce((total, w) => total + w, 0)
		const randomWeight = this.randomInt(totalWeight)
		let weight = 0
		for (let i = 0; i < choices.length; i++) {
			weight += weights[i]
			const choice = choices[i]
			if (randomWeight < weight) {
				return 'do' in choice ? choice.do() : choice()
			}
		}
		throw new Error('unreachable')
	}

	randomElement<Elem>(items: Elem[]): Elem | undefined {
		return items[this.randomInt(items.length)]
	}
}
