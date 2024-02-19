import { mapObjectMapValues } from '@tldraw/utils'
import isEqual from 'lodash.isequal'
import { T } from '..'

class RandomSource {
	private seed: number

	constructor(seed: number) {
		this.seed = seed
	}

	nextFloat(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280
		return this.seed / 233280
	}

	nextInt(max: number): number {
		return Math.floor(this.nextFloat() * max)
	}

	nextIntInRange(min: number, max: number): number {
		return this.nextInt(max - min) + min
	}

	nextId(): string {
		return this.nextInt(Number.MAX_SAFE_INTEGER).toString(36)
	}

	selectOne<T>(arr: readonly T[]): T {
		return arr[this.nextInt(arr.length)]
	}

	choice(probability: number): boolean {
		return this.nextFloat() < probability
	}

	executeOne<Result>(
		_choices: Record<string, (() => Result) | { weight?: number; do(): Result }>
	): Result {
		const choices = Object.values(_choices).map((choice) => {
			if (typeof choice === 'function') {
				return { weight: 1, do: choice }
			}
			return choice
		})
		const totalWeight = Object.values(choices).reduce(
			(total, choice) => total + (choice.weight ?? 1),
			0
		)
		const randomWeight = this.nextInt(totalWeight)
		let weight = 0
		for (const choice of Object.values(choices)) {
			weight += choice.weight ?? 1
			if (randomWeight < weight) {
				return choice.do()
			}
		}
		throw new Error('unreachable')
	}

	nextJsonValue(): any {
		return this.executeOne<any>({
			string: { weight: 1, do: () => this.nextId() },
			number: { weight: 1, do: () => this.nextFloat() },
			integer: { weight: 1, do: () => this.nextInt(100) },
			boolean: { weight: 1, do: () => this.choice(0.5) },
			null: { weight: 1, do: () => null },
			array: {
				weight: 1,
				do: () => {
					const numItems = this.nextInt(4)
					const result = []
					for (let i = 0; i < numItems; i++) {
						result.push(this.nextJsonValue())
					}
					return result
				},
			},
			object: {
				weight: 1,
				do: () => {
					const numItems = this.nextInt(4)
					const result = {} as any
					for (let i = 0; i < numItems; i++) {
						result[this.nextId()] = this.nextJsonValue()
					}
					return result
				},
			},
		})
	}

	nextTestType() {
		return this.executeOne<TestType>({
			primitive: {
				weight: 4,
				do: () => this.selectOne(Object.values(builtinTypes)),
			},
			array: () => generateArrayType(this),
			object: () => generateObjectType(this),
		})
	}
}

type TestType = {
	validator: T.Validator<any>
	generateValid: (source: RandomSource) => any
	generateInvalid: (source: RandomSource) => any
}
const builtinTypes: Record<string, TestType> = {
	string: {
		validator: T.string,
		generateValid: (source) => source.selectOne(['a', 'b', 'c', 'd']),
		generateInvalid: (source) => source.selectOne([5, /regexp/, null, {}]),
	},
	number: {
		validator: T.number,
		generateValid: (source) => source.nextInt(5),
		generateInvalid: (source) => source.selectOne(['a', /num/, null]),
	},
	integer: {
		validator: T.integer,
		generateValid: (source) => source.nextInt(5),
		generateInvalid: (source) => source.selectOne([0.2, '3', 5n, /int/]),
	},
	json: {
		validator: T.jsonValue,
		generateValid: (source) => source.nextJsonValue(),
		generateInvalid: (source) => source.selectOne([/regexp/, 343n, { key: /regexp/ }]),
	},
} as const

function generateObjectType(source: RandomSource): TestType {
	const numProperties = source.nextIntInRange(1, 5)
	const propertyTypes: Record<string, TestType> = {}
	const optionalTypes = new Set<string>()
	for (let i = 0; i < numProperties; i++) {
		const type = source.executeOne<TestType>({
			primitive: {
				weight: 4,
				do: () => source.selectOne(Object.values(builtinTypes)),
			},
			array: () => generateArrayType(source),
			object: () => generateObjectType(source),
		})
		const name = source.nextId()
		if (source.choice(0.2)) {
			optionalTypes.add(name)
		}
		propertyTypes[name] = optionalTypes.has(name)
			? { ...type, validator: type.validator.optional() }
			: type
	}

	const generateValid = (source: RandomSource) => {
		const result = {} as any
		for (const [name, type] of Object.entries(propertyTypes)) {
			if (optionalTypes.has(name) && source.choice(0.2)) {
				continue
			}
			result[name] = type.generateValid(source)
		}
		return result
	}

	return {
		validator: T.object(mapObjectMapValues(propertyTypes, (_, { validator }) => validator)),
		generateValid,
		generateInvalid: (source) => {
			return source.executeOne<any>({
				otherType: () =>
					source.executeOne<any>({
						string: () => source.selectOne(['a', 'b', 'c', 'd']),
						number: () => source.nextInt(5),
						array: () => [source.nextId(), source.nextFloat()],
						null: () => null,
					}),
				missingProperty: () => {
					const val = generateValid(source)
					const keyToDelete = source.selectOne(
						Object.keys(val).filter((key) => !optionalTypes.has(key))
					)
					if (!keyToDelete) {
						// no non-optional properties, do a invalid property test instead
						val[keyToDelete] =
							propertyTypes[source.selectOne(Object.keys(propertyTypes))].generateInvalid(source)
						return val
					}
					delete val[keyToDelete]
					return val
				},
				extraProperty: () => {
					const val = generateValid(source)
					val[source.nextId()] = source.nextJsonValue()
					return val
				},
				invalidProperty: () => {
					const val = generateValid(source)
					const keyToChange = source.selectOne(Object.keys(propertyTypes))
					val[keyToChange] = propertyTypes[keyToChange].generateInvalid(source)
					return val
				},
			})
		},
	}
}

function generateArrayType(source: RandomSource): TestType {
	const valueType = source.nextTestType()
	const validator = T.arrayOf(valueType.validator)
	const generateValid = (source: RandomSource) => {
		const result = [] as any[]
		const numItems = source.nextInt(4)
		for (let i = 0; i < numItems; i++) {
			result.push(valueType.generateValid(source))
		}
		return result
	}
	return {
		validator,
		generateValid,
		generateInvalid: (source) => {
			return source.executeOne<any>({
				otherType: () =>
					source.executeOne<any>({
						string: () => source.nextId(),
						number: () => source.nextInt(100),
						object: () => ({ key: source.nextId() }),
						null: () => null,
					}),
				invalidItem: () => {
					const val = generateValid(source)
					if (val.length === 0) {
						return [valueType.generateInvalid(source)]
					}
					const indexToChange = source.nextInt(val.length)
					val[indexToChange] = valueType.generateInvalid(source)
					return val
				},
			})
		},
	}
}

function runTest(seed: number) {
	const source = new RandomSource(seed)
	const type = source.nextTestType()
	const oldValid = type.generateValid(source)
	const newValid = source.choice(0.5) ? type.generateValid(source) : oldValid
	const didChange = !isEqual(oldValid, newValid)
	const invalid = type.generateInvalid(source)

	expect(type.validator.validate(oldValid)).toBe(oldValid)
	expect(type.validator.validate(newValid)).toBe(newValid)
	expect(() => {
		type.validator.validate(invalid)
	}).toThrow()

	expect(() => type.validator.validateUsingKnownGoodVersion(oldValid, newValid)).not.toThrow()
	expect(() => type.validator.validateUsingKnownGoodVersion(oldValid, invalid)).toThrow()

	if (didChange) {
		expect(type.validator.validateUsingKnownGoodVersion(oldValid, newValid)).toBe(newValid)
	} else {
		expect(type.validator.validateUsingKnownGoodVersion(oldValid, newValid)).toBe(oldValid)
	}
}

const NUM_TESTS = 5000
const source = new RandomSource(Math.random())

for (let i = 0; i < NUM_TESTS; i++) {
	const seed = source.nextInt(100000000)
	test(`fuzz test with seed ${seed}`, () => {
		runTest(seed)
	})
}

test('regression', () => {
	runTest(31724743)
})

test('regression 2', () => {
	runTest(29597217)
})

test('regression 3', () => {
	runTest(77387914)
})

test('regression 4', () => {
	runTest(3653979)
})

test('regresion 5', () => {
	runTest(6715024)
})

test('regression 6', () => {
	runTest(43112375)
})

test('regression 7', () => {
	runTest(93348512)
})

test('regression 8', () => {
	runTest(44591734)
})
