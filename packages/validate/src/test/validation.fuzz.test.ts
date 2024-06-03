import { mapObjectMapValues } from '@tldraw/utils'
import isEqual from 'lodash.isequal'
import { T, Validator } from '..'

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

	nextPropertyName(): string {
		return this.selectOne(['foo', 'bar', 'baz', 'qux', 'mux', 'bah'])
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
						result[this.nextPropertyName()] = this.nextJsonValue()
					}
					return result
				},
			},
		})
	}

	nextTestType(depth: number): TestType {
		if (depth >= 3) {
			return this.selectOne(Object.values(builtinTypes))
		}
		return this.executeOne<TestType>({
			primitive: () => this.selectOne(Object.values(builtinTypes)),
			array: () => generateArrayType(this, depth),
			object: () => generateObjectType(this, {}, depth),
			union: () => generateUnionType(this, depth),
			dict: () => generateDictType(this, depth),
			model: () => {
				const objType = generateObjectType(this, {}, depth)
				const name = this.nextPropertyName()
				return {
					...objType,
					validator: T.model(name, objType.validator),
				}
			},
		})
	}
}

interface TestType {
	validator: T.Validator<any>
	generateValid: (source: RandomSource) => any
	generateInvalid: (source: RandomSource) => any
}
const builtinTypes = {
	string: {
		validator: T.string,
		generateValid: (source) => source.selectOne(['a', 'b', 'c', 'd']),
		generateInvalid: (source) => source.selectOne([5, /regexp/, {}]),
	},
	number: {
		validator: T.number,
		generateValid: (source) => source.nextInt(5),
		generateInvalid: (source) => source.selectOne(['a', /num/]),
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
} as const satisfies Record<string, TestType>

function generateObjectType(
	source: RandomSource,
	injectProperties: Record<string, TestType>,
	depth: number
): TestType {
	const numProperties = source.nextIntInRange(1, 5)
	const propertyTypes: Record<string, TestType> = {
		...injectProperties,
	}
	const optionalTypes = new Set<string>()
	const nullableTypes = new Set<string>()
	for (let i = 0; i < numProperties; i++) {
		const type = source.nextTestType(depth + 1)
		const name = source.nextPropertyName()
		if (source.choice(0.2)) {
			optionalTypes.add(name)
		}
		if (source.choice(0.2)) {
			nullableTypes.add(name)
		}
		let validator = type.validator
		if (nullableTypes.has(name)) {
			validator = validator.nullable()
		}
		if (optionalTypes.has(name)) {
			validator = validator.optional()
		}
		propertyTypes[name] = { ...type, validator }
	}

	const generateValid = (source: RandomSource) => {
		const result = {} as any
		for (const [name, type] of Object.entries(propertyTypes)) {
			if (optionalTypes.has(name) && source.choice(0.2)) {
				continue
			} else if (nullableTypes.has(name) && source.choice(0.2)) {
				result[name] = null
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
						bool: () => true,
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
					val[source.nextPropertyName() + '_'] = source.nextJsonValue()
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

function generateDictType(source: RandomSource, depth: number): TestType {
	const keyType = builtinTypes.string
	const keySet = ['a', 'b', 'c', 'd', 'e', 'f'] as const
	const valueType = source.nextTestType(depth + 1)

	const validator = T.dict(keyType.validator, valueType.validator)

	const generateValid = (source: RandomSource) => {
		const result = {} as any
		const numItems = source.nextInt(4)
		for (let i = 0; i < numItems; i++) {
			result[source.selectOne(keySet)] = valueType.generateValid(source)
		}
		return result
	}

	return {
		validator,
		generateValid,
		generateInvalid: (source) => {
			const result = generateValid(source)
			const key = source.selectOne(Object.keys(result)) ?? source.nextPropertyName()
			result[key] = valueType.generateInvalid(source)
			return result
		},
	}
}

function createLiteralType(value: string): TestType {
	return {
		validator: T.literal(value),
		generateValid: () => value,
		generateInvalid: (source) => source.selectOne(['_invalid_' + value, 2324, {}]),
	}
}

function generateUnionType(source: RandomSource, depth: number): TestType {
	const key = source.selectOne(['type', 'name', 'kind'])
	const numMembers = source.nextIntInRange(1, 4)
	const members: TestType[] = []
	const unionMap: Record<string, Validator<any>> = {}
	for (let i = 0; i < numMembers; i++) {
		const id = source.nextId()
		const keyType = createLiteralType(id)
		const type = generateObjectType(source, { [key]: keyType }, depth + 1)
		members.push(type)
		unionMap[id] = type.validator
	}
	const validator = T.union(key, unionMap)

	return {
		validator,
		generateValid: (source) => {
			const member = source.selectOne(members)
			return member.generateValid(source)
		},
		generateInvalid(source) {
			return source.executeOne<any>({
				otherType: () => source.selectOne(['_invalid_', 2324, {}]),
				badMember: {
					weight: 4,
					do() {
						const member = source.selectOne(members)
						return member.generateInvalid(source)
					},
				},
			})
		},
	}
}

function generateArrayType(source: RandomSource, depth: number): TestType {
	const valueType = source.nextTestType(depth + 1)
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
	test(`fuzz test with seed ${seed}`, () => {
		const source = new RandomSource(seed)
		const type = source.nextTestType(0)
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
	})
}

const NUM_TESTS = 1000
const source = new RandomSource(Math.random())

// 54480484
const onlySeed: null | number = null

if (onlySeed) {
	runTest(onlySeed)
} else {
	for (let i = 0; i < NUM_TESTS; i++) {
		const seed = source.nextInt(100000000)
		runTest(seed)
	}
}
