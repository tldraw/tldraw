import { describe, expect, it } from 'vitest'
import type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from './json-value'

describe('JsonPrimitive', () => {
	it('should accept boolean values', () => {
		const truthy: JsonPrimitive = true
		const falsy: JsonPrimitive = false
		expect(typeof truthy).toBe('boolean')
		expect(typeof falsy).toBe('boolean')
	})

	it('should accept null', () => {
		const nullValue: JsonPrimitive = null
		expect(nullValue).toBeNull()
	})

	it('should accept string values', () => {
		const emptyString: JsonPrimitive = ''
		const regularString: JsonPrimitive = 'hello world'
		const unicodeString: JsonPrimitive = '🚀 Unicode works!'
		expect(typeof emptyString).toBe('string')
		expect(typeof regularString).toBe('string')
		expect(typeof unicodeString).toBe('string')
	})

	it('should accept number values', () => {
		const integer: JsonPrimitive = 42
		const float: JsonPrimitive = 3.14159
		const negative: JsonPrimitive = -100
		const zero: JsonPrimitive = 0
		expect(typeof integer).toBe('number')
		expect(typeof float).toBe('number')
		expect(typeof negative).toBe('number')
		expect(typeof zero).toBe('number')
	})

	it('should work with JSON.stringify and JSON.parse', () => {
		const primitives: JsonPrimitive[] = [true, false, null, 'test', 42, 0, -1, 3.14]

		primitives.forEach((primitive) => {
			const serialized = JSON.stringify(primitive)
			const deserialized = JSON.parse(serialized)
			expect(deserialized).toEqual(primitive)
		})
	})
})

describe('JsonArray', () => {
	it('should accept empty array', () => {
		const emptyArray: JsonArray = []
		expect(Array.isArray(emptyArray)).toBe(true)
		expect(emptyArray.length).toBe(0)
	})

	it('should accept array of primitives', () => {
		const primitiveArray: JsonArray = [true, null, 'hello', 42]
		expect(Array.isArray(primitiveArray)).toBe(true)
		expect(primitiveArray.length).toBe(4)
	})

	it('should accept nested arrays', () => {
		const nestedArray: JsonArray = [
			[1, 2, 3],
			['a', 'b', 'c'],
			[true, false, null],
		]
		expect(Array.isArray(nestedArray)).toBe(true)
		expect(Array.isArray(nestedArray[0])).toBe(true)
	})

	it('should accept arrays with objects', () => {
		const arrayWithObjects: JsonArray = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 },
		]
		expect(Array.isArray(arrayWithObjects)).toBe(true)
		expect(typeof arrayWithObjects[0]).toBe('object')
	})

	it('should accept mixed type arrays', () => {
		const mixedArray: JsonArray = ['text', 123, true, null, { nested: 'object' }, [1, 2, 3]]
		expect(Array.isArray(mixedArray)).toBe(true)
		expect(mixedArray.length).toBe(6)
	})

	it('should work with JSON.stringify and JSON.parse', () => {
		const testArray: JsonArray = ['hello', 42, true, null, { key: 'value' }, [1, 2, 3]]

		const serialized = JSON.stringify(testArray)
		const deserialized = JSON.parse(serialized)
		expect(deserialized).toEqual(testArray)
	})

	it('should support array methods', () => {
		const array: JsonArray = [1, 'test', true]

		expect(array.length).toBe(3)
		expect(array[0]).toBe(1)
		expect(array.includes('test')).toBe(true)

		// Should work with mutation methods
		array.push(null)
		expect(array.length).toBe(4)
		expect(array[3]).toBeNull()
	})
})

describe('JsonObject', () => {
	it('should accept empty object', () => {
		const emptyObject: JsonObject = {}
		expect(typeof emptyObject).toBe('object')
		expect(Object.keys(emptyObject).length).toBe(0)
	})

	it('should accept object with primitive values', () => {
		const primitiveObject: JsonObject = {
			boolean: true,
			nullValue: null,
			string: 'hello',
			number: 42,
		}
		expect(typeof primitiveObject).toBe('object')
		expect(primitiveObject.boolean).toBe(true)
		expect(primitiveObject.nullValue).toBeNull()
		expect(primitiveObject.string).toBe('hello')
		expect(primitiveObject.number).toBe(42)
	})

	it('should accept object with array values', () => {
		const objectWithArrays: JsonObject = {
			numbers: [1, 2, 3],
			strings: ['a', 'b', 'c'],
			mixed: [true, 'test', 42],
		}
		expect(Array.isArray(objectWithArrays.numbers)).toBe(true)
		expect(Array.isArray(objectWithArrays.strings)).toBe(true)
		expect(Array.isArray(objectWithArrays.mixed)).toBe(true)
	})

	it('should accept nested objects', () => {
		const nestedObject: JsonObject = {
			level1: {
				level2: {
					level3: 'deep value',
				},
			},
		}
		expect(typeof nestedObject.level1).toBe('object')
		expect((nestedObject.level1 as JsonObject)?.level2).toBeDefined()
	})

	it('should allow undefined values', () => {
		const objectWithUndefined: JsonObject = {
			defined: 'value',
			undefined: undefined,
		}
		expect(objectWithUndefined.defined).toBe('value')
		expect(objectWithUndefined.undefined).toBeUndefined()
	})

	it('should work with JSON.stringify and JSON.parse', () => {
		const testObject: JsonObject = {
			name: 'Alice',
			age: 30,
			active: true,
			tags: ['user', 'premium'],
			metadata: null,
			nested: {
				deep: 'property',
			},
		}

		const serialized = JSON.stringify(testObject)
		const deserialized = JSON.parse(serialized)

		// Note: JSON.stringify removes undefined values
		expect(deserialized).toEqual({
			name: 'Alice',
			age: 30,
			active: true,
			tags: ['user', 'premium'],
			metadata: null,
			nested: {
				deep: 'property',
			},
		})
	})

	it('should handle undefined values in serialization', () => {
		const objectWithUndefined: JsonObject = {
			keep: 'this',
			remove: undefined,
		}

		const serialized = JSON.stringify(objectWithUndefined)
		const deserialized = JSON.parse(serialized)

		// JSON.stringify removes undefined values
		expect(deserialized).toEqual({ keep: 'this' })
		expect(deserialized.remove).toBeUndefined()
	})
})

describe('JsonValue', () => {
	it('should accept all primitive types', () => {
		const booleanValue: JsonValue = true
		const nullValue: JsonValue = null
		const stringValue: JsonValue = 'test'
		const numberValue: JsonValue = 42

		expect(typeof booleanValue).toBe('boolean')
		expect(nullValue).toBeNull()
		expect(typeof stringValue).toBe('string')
		expect(typeof numberValue).toBe('number')
	})

	it('should accept arrays', () => {
		const arrayValue: JsonValue = [1, 'test', true, null]
		expect(Array.isArray(arrayValue)).toBe(true)
	})

	it('should accept objects', () => {
		const objectValue: JsonValue = { key: 'value', nested: { deep: true } }
		expect(typeof objectValue).toBe('object')
		expect(objectValue).not.toBeNull()
		expect(Array.isArray(objectValue)).toBe(false)
	})

	it('should accept complex nested structures', () => {
		const complexValue: JsonValue = {
			name: 'Alice',
			age: 30,
			active: true,
			tags: ['user', 'premium'],
			metadata: null,
			preferences: {
				theme: 'dark',
				notifications: {
					email: true,
					push: false,
					settings: [
						{ type: 'marketing', enabled: false },
						{ type: 'security', enabled: true },
					],
				},
			},
		}

		expect(typeof complexValue).toBe('object')

		const serialized = JSON.stringify(complexValue)
		const deserialized = JSON.parse(serialized)
		expect(deserialized).toEqual(complexValue)
	})

	it('should work with real JSON data examples', () => {
		// Example: API response
		const apiResponse: JsonValue = {
			status: 'success',
			data: {
				users: [
					{ id: 1, name: 'Alice', active: true },
					{ id: 2, name: 'Bob', active: false },
				],
				pagination: {
					page: 1,
					totalPages: 5,
					hasNext: true,
				},
			},
			timestamp: '2024-01-01T00:00:00Z',
		}

		expect(JSON.parse(JSON.stringify(apiResponse))).toEqual(apiResponse)

		// Example: Configuration object
		const config: JsonValue = {
			version: '1.0.0',
			features: ['auth', 'api', 'ui'],
			settings: {
				maxRetries: 3,
				timeout: 5000,
				debug: false,
			},
			environments: {
				development: { url: 'http://localhost:3000', secure: false },
				production: { url: 'https://api.example.com', secure: true },
			},
		}

		expect(JSON.parse(JSON.stringify(config))).toEqual(config)
	})

	it('should handle edge cases in JSON serialization', () => {
		const edgeCases: JsonValue[] = [
			// Empty structures
			{},
			[],

			// Numeric edge cases
			0,
			-0,
			Infinity, // Note: becomes null in JSON
			-Infinity, // Note: becomes null in JSON
			NaN, // Note: becomes null in JSON

			// String edge cases
			'',
			'null',
			'true',
			'false',
			'0',

			// Arrays with edge cases
			[null, null], // Note: undefined becomes null in JSON arrays during serialization

			// Objects with edge cases
			{ empty: '', zero: 0, false: false, null: null },
		]

		edgeCases.forEach((value, index) => {
			// Some values change during JSON serialization
			const serialized = JSON.stringify(value)
			const deserialized = JSON.parse(serialized)

			// For finite numbers, they should remain the same (except -0 becomes 0)
			if (typeof value === 'number' && isFinite(value)) {
				if (Object.is(value, -0)) {
					// -0 becomes 0 in JSON
					expect(deserialized).toBe(0)
				} else {
					expect(deserialized).toBe(value)
				}
			} else if (typeof value === 'number' && !isFinite(value)) {
				// Infinity and NaN become null in JSON
				expect(deserialized).toBeNull()
			} else if (Array.isArray(value)) {
				// Arrays may have undefined values converted to null
				expect(Array.isArray(deserialized)).toBe(true)
			} else {
				// For other types, test round-trip compatibility
				expect(() => JSON.parse(JSON.stringify(value))).not.toThrow()
			}
		})
	})
})

describe('Type compatibility and usage patterns', () => {
	it('should work with JSON.parse return type', () => {
		const jsonString = '{"name": "Alice", "age": 30, "tags": ["user", "premium"]}'
		const parsed: JsonValue = JSON.parse(jsonString)

		expect(typeof parsed).toBe('object')
		expect(parsed).not.toBeNull()
		expect(Array.isArray(parsed)).toBe(false)
	})

	it('should work with fetch API response', async () => {
		// Mock fetch response
		const mockResponse = {
			json: async () => ({
				message: 'Hello world',
				timestamp: Date.now(),
				success: true,
				data: null,
			}),
		}

		const data: JsonValue = await mockResponse.json()
		expect(typeof data).toBe('object')
	})

	it('should allow type narrowing with type guards', () => {
		const value: JsonValue = { name: 'Alice', age: 30 }

		// Type narrowing
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			const obj = value as JsonObject
			expect(obj.name).toBe('Alice')
			expect(obj.age).toBe(30)
		}

		const arrayValue: JsonValue = [1, 2, 3]
		if (Array.isArray(arrayValue)) {
			const arr = arrayValue as JsonArray
			expect(arr.length).toBe(3)
			expect(arr[0]).toBe(1)
		}
	})

	it('should work in function parameters and return types', () => {
		function processJsonData(input: JsonValue): JsonObject {
			return {
				processed: true,
				originalType: Array.isArray(input) ? 'array' : typeof input,
				data: input,
			}
		}

		const result1 = processJsonData('hello')
		expect(result1.processed).toBe(true)
		expect(result1.originalType).toBe('string')
		expect(result1.data).toBe('hello')

		const result2 = processJsonData([1, 2, 3])
		expect(result2.processed).toBe(true)
		expect(result2.originalType).toBe('array')
		expect(result2.data).toEqual([1, 2, 3])

		const result3 = processJsonData({ nested: { value: true } })
		expect(result3.processed).toBe(true)
		expect(result3.originalType).toBe('object')
	})

	it('should work with generic functions', () => {
		function deepClone<T extends JsonValue>(value: T): T {
			return JSON.parse(JSON.stringify(value))
		}

		const original = { name: 'Alice', tags: ['user', 'premium'], count: 42 }
		const cloned = deepClone(original)

		expect(cloned).toEqual(original)
		expect(cloned).not.toBe(original) // Different reference
	})

	it('should work with localStorage and sessionStorage', () => {
		const testData: JsonValue = {
			user: { id: 1, name: 'Alice' },
			preferences: { theme: 'dark', lang: 'en' },
			lastLogin: '2024-01-01T00:00:00Z',
		}

		// Simulate localStorage usage
		const serialized = JSON.stringify(testData)
		const deserialized: JsonValue = JSON.parse(serialized)

		expect(deserialized).toEqual(testData)
	})
})
