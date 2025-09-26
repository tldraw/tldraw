import { describe, expect, it } from 'vitest'
import type { Expand, MakeUndefinedOptional, RecursivePartial, Required } from './types'

describe('RecursivePartial', () => {
	it('should make all properties optional recursively', () => {
		interface User {
			id: string
			name: string
			settings: {
				theme: string
				notifications: {
					email: boolean
					push: boolean
				}
			}
			tags: string[]
		}

		type PartialUser = RecursivePartial<User>

		// Test that partial objects are valid
		const partialUser1: PartialUser = {}
		const partialUser2: PartialUser = {
			name: 'Alice',
		}
		const partialUser3: PartialUser = {
			settings: {
				notifications: {
					email: false,
				},
			},
		}
		const partialUser4: PartialUser = {
			id: '123',
			settings: {
				theme: 'dark',
			},
			tags: ['admin'],
		}

		// Test that these assignments are valid at runtime
		expect(partialUser1).toBeDefined()
		expect(partialUser2).toBeDefined()
		expect(partialUser3).toBeDefined()
		expect(partialUser4).toBeDefined()
	})

	it('should work with primitive types', () => {
		type PartialString = RecursivePartial<string>
		type PartialNumber = RecursivePartial<number>
		type PartialBoolean = RecursivePartial<boolean>

		const str: PartialString = 'test'
		const num: PartialNumber = 42
		const bool: PartialBoolean = true

		expect(str).toBe('test')
		expect(num).toBe(42)
		expect(bool).toBe(true)
	})

	it('should work with arrays', () => {
		interface Config {
			items: string[]
			nested: {
				values: number[]
			}
		}

		type PartialConfig = RecursivePartial<Config>

		const config: PartialConfig = {
			nested: {
				values: [1, 2, 3],
			},
		}

		expect(config.nested?.values).toEqual([1, 2, 3])
	})

	it('should work with deeply nested structures', () => {
		interface DeepStructure {
			level1: {
				level2: {
					level3: {
						value: string
					}
				}
			}
		}

		type PartialDeepStructure = RecursivePartial<DeepStructure>

		const deep: PartialDeepStructure = {
			level1: {
				level2: {},
			},
		}

		expect(deep.level1?.level2).toBeDefined()
	})
})

describe('Expand', () => {
	it('should expand intersection types', () => {
		type Base = { id: string }
		type WithName = { name: string }
		type WithAge = { age: number }

		type Intersection = Base & WithName & WithAge
		type ExpandedIntersection = Expand<Intersection>

		// Test that the expanded type works correctly
		const user: ExpandedIntersection = {
			id: '123',
			name: 'Alice',
			age: 30,
		}

		expect(user.id).toBe('123')
		expect(user.name).toBe('Alice')
		expect(user.age).toBe(30)
	})

	it('should work with conditional types', () => {
		type ConditionalType<T> = T extends string ? { text: T } : { value: T }
		type ExpandedConditional = Expand<ConditionalType<'hello'>>

		const result: ExpandedConditional = {
			text: 'hello',
		}

		expect(result.text).toBe('hello')
	})

	it('should preserve all properties', () => {
		type Complex = {
			a: string
		} & {
			b: number
		} & {
			c?: boolean
		}

		type ExpandedComplex = Expand<Complex>

		const obj: ExpandedComplex = {
			a: 'test',
			b: 42,
		}

		expect(obj.a).toBe('test')
		expect(obj.b).toBe(42)
		expect(obj.c).toBeUndefined()
	})
})

describe('Required', () => {
	it('should make specific keys required', () => {
		interface Shape {
			id: string
			x?: number
			y?: number
			width?: number
			height?: number
			visible?: boolean
		}

		type PositionedShape = Required<Shape, 'x' | 'y'>

		// Test that required properties must be provided
		const shape: PositionedShape = {
			id: 'rect1',
			x: 10, // now required
			y: 20, // now required
			// width, height, visible remain optional
		}

		expect(shape.id).toBe('rect1')
		expect(shape.x).toBe(10)
		expect(shape.y).toBe(20)
		expect(shape.width).toBeUndefined()
		expect(shape.height).toBeUndefined()
		expect(shape.visible).toBeUndefined()
	})

	it('should work with single key', () => {
		interface User {
			id: string
			name?: string
			email?: string
		}

		type UserWithName = Required<User, 'name'>

		const user: UserWithName = {
			id: '123',
			name: 'Alice', // now required
			// email remains optional
		}

		expect(user.id).toBe('123')
		expect(user.name).toBe('Alice')
		expect(user.email).toBeUndefined()
	})

	it('should handle all keys being made required', () => {
		interface Config {
			theme?: string
			debug?: boolean
			timeout?: number
		}

		type FullConfig = Required<Config, 'theme' | 'debug' | 'timeout'>

		const config: FullConfig = {
			theme: 'dark',
			debug: true,
			timeout: 5000,
		}

		expect(config.theme).toBe('dark')
		expect(config.debug).toBe(true)
		expect(config.timeout).toBe(5000)
	})

	it('should preserve already required properties', () => {
		interface Mixed {
			id: string // already required
			name?: string
			age?: number
		}

		type MixedWithName = Required<Mixed, 'name'>

		const obj: MixedWithName = {
			id: '123', // still required
			name: 'Alice', // now required
			// age remains optional
		}

		expect(obj.id).toBe('123')
		expect(obj.name).toBe('Alice')
		expect(obj.age).toBeUndefined()
	})
})

describe('MakeUndefinedOptional', () => {
	it('should make properties with undefined types optional', () => {
		interface RawConfig {
			name: string
			theme: string | undefined
			debug: boolean | undefined
			version: number
			features: string[] | undefined
		}

		type Config = MakeUndefinedOptional<RawConfig>

		// Test that properties with undefined in their type become optional
		const config1: Config = {
			name: 'MyApp',
			version: 1,
			// theme, debug, and features can be omitted
		}

		const config2: Config = {
			name: 'MyApp',
			version: 1,
			theme: 'dark',
			debug: true,
			features: ['auth', 'api'],
		}

		const config3: Config = {
			name: 'MyApp',
			version: 1,
			theme: undefined, // can still explicitly set to undefined
			debug: undefined,
			features: undefined,
		}

		expect(config1.name).toBe('MyApp')
		expect(config1.version).toBe(1)
		expect(config1.theme).toBeUndefined()

		expect(config2.theme).toBe('dark')
		expect(config2.debug).toBe(true)
		expect(config2.features).toEqual(['auth', 'api'])

		expect(config3.theme).toBeUndefined()
		expect(config3.debug).toBeUndefined()
		expect(config3.features).toBeUndefined()
	})

	it('should preserve required properties without undefined', () => {
		interface StrictConfig {
			name: string
			version: number
			optional?: string
			nullable: string | null
			undefinable: string | undefined
		}

		type ProcessedConfig = MakeUndefinedOptional<StrictConfig>

		const config: ProcessedConfig = {
			name: 'Test', // still required
			version: 1, // still required
			nullable: 'value', // still required (only has null, not undefined)
			// undefinable is now optional
			// optional remains optional
		}

		expect(config.name).toBe('Test')
		expect(config.version).toBe(1)
		expect(config.nullable).toBe('value')
		expect(config.undefinable).toBeUndefined()
		expect(config.optional).toBeUndefined()
	})

	it('should work with complex union types', () => {
		interface ComplexConfig {
			id: string
			settings: { theme: string } | undefined
			metadata: Record<string, any> | null | undefined
			flags: boolean | string | undefined
		}

		type ProcessedComplexConfig = MakeUndefinedOptional<ComplexConfig>

		const config: ProcessedComplexConfig = {
			id: '123',
			// settings, metadata, and flags are all optional due to undefined in their types
		}

		expect(config.id).toBe('123')
		expect(config.settings).toBeUndefined()
		expect(config.metadata).toBeUndefined()
		expect(config.flags).toBeUndefined()
	})

	it('should handle nested objects', () => {
		interface NestedConfig {
			app: string
			database:
				| {
						host: string | undefined
						port: number
						ssl: boolean | undefined
				  }
				| undefined
		}

		type ProcessedNestedConfig = MakeUndefinedOptional<NestedConfig>

		const config: ProcessedNestedConfig = {
			app: 'MyApp',
			// database is optional because it includes undefined
		}

		expect(config.app).toBe('MyApp')
		expect(config.database).toBeUndefined()
	})

	it('should work with empty objects', () => {
		interface EmptyConfig {}

		type ProcessedEmptyConfig = MakeUndefinedOptional<EmptyConfig>

		const config: ProcessedEmptyConfig = {}

		expect(config).toBeDefined()
		expect(Object.keys(config)).toHaveLength(0)
	})
})

// Test that all types work together
describe('Type combinations', () => {
	it('should work when types are combined', () => {
		interface BaseUser {
			id: string
			name?: string
			settings:
				| {
						theme: string | undefined
						notifications?: {
							email: boolean
							push: boolean | undefined
						}
				  }
				| undefined
		}

		// Apply multiple transformations
		type ProcessedUser = Required<MakeUndefinedOptional<RecursivePartial<BaseUser>>, 'id'>

		const user: ProcessedUser = {
			id: '123', // required due to Required
			// everything else is optional due to RecursivePartial and MakeUndefinedOptional
		}

		expect(user.id).toBe('123')
		expect(user.name).toBeUndefined()
		expect(user.settings).toBeUndefined()
	})

	it('should work with Expand to flatten complex types', () => {
		type Base = { id: string }
		type WithOptional = { name?: string }
		type WithUndefined = { value: string | undefined }

		type Complex = Expand<
			Required<MakeUndefinedOptional<Base & WithOptional & WithUndefined>, 'name'>
		>

		const obj: Complex = {
			id: '123',
			name: 'Alice', // required due to Required
			// value is optional due to MakeUndefinedOptional
		}

		expect(obj.id).toBe('123')
		expect(obj.name).toBe('Alice')
		expect(obj.value).toBeUndefined()
	})
})
