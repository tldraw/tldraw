import { describe, expect, it } from 'vitest'
import { getHashForBuffer, getHashForObject, getHashForString, lns } from './hash'

describe('getHashForString', () => {
	describe('basic functionality', () => {
		it('should return a string representation of a hash', () => {
			const result = getHashForString('hello')
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/) // Should be a string of digits, possibly negative
		})

		it('should produce consistent hashes for the same input', () => {
			const input = 'hello world'
			const hash1 = getHashForString(input)
			const hash2 = getHashForString(input)

			expect(hash1).toBe(hash2)
		})

		it('should produce different hashes for different inputs', () => {
			const hash1 = getHashForString('hello')
			const hash2 = getHashForString('world')

			expect(hash1).not.toBe(hash2)
		})
	})

	describe('edge cases', () => {
		it('should handle empty strings', () => {
			const result = getHashForString('')
			expect(typeof result).toBe('string')
			expect(result).toBe('0') // Empty string should hash to 0
		})

		it('should handle single characters', () => {
			const result = getHashForString('a')
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should handle very long strings', () => {
			const longString = 'a'.repeat(10000)
			const result = getHashForString(longString)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should handle strings with special characters', () => {
			const specialString = '!@#$%^&*()_+-=[]{}|;:,.<>?'
			const result = getHashForString(specialString)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should handle Unicode characters', () => {
			const unicodeString = '🚀💫🎨🌟✨'
			const result = getHashForString(unicodeString)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should handle newlines and whitespace', () => {
			const stringWithWhitespace = 'hello\n\t world  '
			const result = getHashForString(stringWithWhitespace)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})
	})

	describe('character sensitivity', () => {
		it('should produce different hashes for different cases', () => {
			const lowerCase = getHashForString('hello')
			const upperCase = getHashForString('HELLO')
			const mixedCase = getHashForString('Hello')

			expect(lowerCase).not.toBe(upperCase)
			expect(lowerCase).not.toBe(mixedCase)
			expect(upperCase).not.toBe(mixedCase)
		})

		it('should be sensitive to whitespace differences', () => {
			const withSpace = getHashForString('hello world')
			const withoutSpace = getHashForString('helloworld')
			const extraSpaces = getHashForString('hello  world')

			expect(withSpace).not.toBe(withoutSpace)
			expect(withSpace).not.toBe(extraSpaces)
		})

		it('should be sensitive to character order', () => {
			const original = getHashForString('abc')
			const reversed = getHashForString('cba')
			const scrambled = getHashForString('bac')

			expect(original).not.toBe(reversed)
			expect(original).not.toBe(scrambled)
			expect(reversed).not.toBe(scrambled)
		})
	})

	describe('hash distribution', () => {
		it('should produce varied hashes for sequential inputs', () => {
			const hashes = new Set()
			for (let i = 0; i < 100; i++) {
				const hash = getHashForString(`input${i}`)
				hashes.add(hash)
			}

			// Should have good distribution - most hashes should be unique
			expect(hashes.size).toBeGreaterThan(95) // Allow for some collisions
		})

		it('should produce varied hashes for similar strings', () => {
			const baseString = 'test_string_'
			const hashes = new Set()

			for (let i = 0; i < 50; i++) {
				const hash = getHashForString(baseString + i)
				hashes.add(hash)
			}

			expect(hashes.size).toBeGreaterThan(45) // Most should be unique
		})
	})
})

describe('getHashForObject', () => {
	describe('basic functionality', () => {
		it('should return a string representation of a hash', () => {
			const result = getHashForObject({ key: 'value' })
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should produce consistent hashes for the same object', () => {
			const obj = { name: 'John', age: 30, active: true }
			const hash1 = getHashForObject(obj)
			const hash2 = getHashForObject(obj)

			expect(hash1).toBe(hash2)
		})

		it('should produce consistent hashes for equivalent objects', () => {
			const obj1 = { name: 'John', age: 30 }
			const obj2 = { name: 'John', age: 30 }

			const hash1 = getHashForObject(obj1)
			const hash2 = getHashForObject(obj2)

			expect(hash1).toBe(hash2)
		})
	})

	describe('different data types', () => {
		it('should handle primitive values', () => {
			expect(getHashForObject('string')).toMatch(/^-?\d+$/)
			expect(getHashForObject(42)).toMatch(/^-?\d+$/)
			expect(getHashForObject(true)).toMatch(/^-?\d+$/)
			expect(getHashForObject(null)).toMatch(/^-?\d+$/)
			// Note: JSON.stringify(undefined) returns undefined, which would cause an error
			// This is expected behavior - undefined is not JSON serializable
			expect(() => getHashForObject(undefined)).toThrow()
		})

		it('should handle arrays', () => {
			const arr = [1, 2, 'three', { four: 4 }]
			const result = getHashForObject(arr)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should handle nested objects', () => {
			const nestedObj = {
				user: {
					name: 'John',
					address: {
						street: '123 Main St',
						city: 'Anytown',
						coordinates: { lat: 40.7128, lng: -74.006 },
					},
				},
				preferences: ['dark_mode', 'notifications'],
			}

			const result = getHashForObject(nestedObj)
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should handle empty objects and arrays', () => {
			expect(getHashForObject({})).toMatch(/^-?\d+$/)
			expect(getHashForObject([])).toMatch(/^-?\d+$/)
		})
	})

	describe('property order sensitivity', () => {
		it('should be sensitive to property order in objects', () => {
			// Note: JSON.stringify preserves property insertion order for string keys
			// in modern JS engines (ES2015+)
			const obj1 = { a: 1, b: 2 }
			const obj2 = { b: 2, a: 1 }

			const hash1 = getHashForObject(obj1)
			const hash2 = getHashForObject(obj2)

			// Should produce different hashes due to different property order
			expect(hash1).not.toBe(hash2)

			// Verify the JSON stringification is actually different
			expect(JSON.stringify(obj1)).toBe('{"a":1,"b":2}')
			expect(JSON.stringify(obj2)).toBe('{"b":2,"a":1}')
		})

		it('should be sensitive to array order', () => {
			const arr1 = [1, 2, 3]
			const arr2 = [3, 2, 1]

			const hash1 = getHashForObject(arr1)
			const hash2 = getHashForObject(arr2)

			expect(hash1).not.toBe(hash2)
		})
	})

	describe('value sensitivity', () => {
		it('should produce different hashes for different values', () => {
			const obj1 = { key: 'value1' }
			const obj2 = { key: 'value2' }

			const hash1 = getHashForObject(obj1)
			const hash2 = getHashForObject(obj2)

			expect(hash1).not.toBe(hash2)
		})

		it('should be sensitive to type differences', () => {
			const num = getHashForObject(42)
			const str = getHashForObject('42')
			const bool = getHashForObject(true)

			expect(num).not.toBe(str)
			expect(num).not.toBe(bool)
			expect(str).not.toBe(bool)
		})

		it('should be sensitive to null vs undefined', () => {
			const withNull = getHashForObject({ key: null })
			const withUndefined = getHashForObject({ key: undefined })

			// Note: JSON.stringify handles null and undefined differently
			// undefined properties are omitted from the JSON, so the objects will be different
			expect(withNull).not.toBe(withUndefined)

			// Verify what JSON.stringify actually produces
			expect(JSON.stringify({ key: null })).toBe('{"key":null}')
			expect(JSON.stringify({ key: undefined })).toBe('{}') // undefined property is omitted
		})
	})
})

describe('getHashForBuffer', () => {
	describe('basic functionality', () => {
		it('should return a string representation of a hash', () => {
			const buffer = new ArrayBuffer(8)
			const result = getHashForBuffer(buffer)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should produce consistent hashes for the same buffer', () => {
			const buffer = new ArrayBuffer(8)
			const view = new DataView(buffer)
			view.setUint32(0, 0x12345678)
			view.setUint32(4, 0x9abcdef0)

			const hash1 = getHashForBuffer(buffer)
			const hash2 = getHashForBuffer(buffer)

			expect(hash1).toBe(hash2)
		})

		it('should produce consistent hashes for equivalent buffers', () => {
			const buffer1 = new ArrayBuffer(4)
			const buffer2 = new ArrayBuffer(4)
			const view1 = new DataView(buffer1)
			const view2 = new DataView(buffer2)

			view1.setUint32(0, 0x12345678)
			view2.setUint32(0, 0x12345678)

			const hash1 = getHashForBuffer(buffer1)
			const hash2 = getHashForBuffer(buffer2)

			expect(hash1).toBe(hash2)
		})
	})

	describe('different buffer contents', () => {
		it('should produce different hashes for different buffer contents', () => {
			const buffer1 = new ArrayBuffer(4)
			const buffer2 = new ArrayBuffer(4)
			const view1 = new DataView(buffer1)
			const view2 = new DataView(buffer2)

			view1.setUint32(0, 0x12345678)
			view2.setUint32(0, 0x87654321)

			const hash1 = getHashForBuffer(buffer1)
			const hash2 = getHashForBuffer(buffer2)

			expect(hash1).not.toBe(hash2)
		})

		it('should handle buffers of different sizes', () => {
			const small = new ArrayBuffer(4)
			const large = new ArrayBuffer(16)

			// Fill with same pattern
			const smallView = new DataView(small)
			const largeView = new DataView(large)

			smallView.setUint32(0, 0x12345678)
			for (let i = 0; i < 16; i += 4) {
				largeView.setUint32(i, 0x12345678)
			}

			const smallHash = getHashForBuffer(small)
			const largeHash = getHashForBuffer(large)

			expect(smallHash).not.toBe(largeHash)
		})
	})

	describe('edge cases', () => {
		it('should handle empty buffers', () => {
			const buffer = new ArrayBuffer(0)
			const result = getHashForBuffer(buffer)

			expect(typeof result).toBe('string')
			expect(result).toBe('0') // Empty buffer should hash to 0
		})

		it('should handle single-byte buffers', () => {
			const buffer = new ArrayBuffer(1)
			const view = new DataView(buffer)
			view.setUint8(0, 42)

			const result = getHashForBuffer(buffer)
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should handle large buffers', () => {
			const buffer = new ArrayBuffer(10000)
			const view = new DataView(buffer)

			// Fill with pattern
			for (let i = 0; i < buffer.byteLength; i++) {
				view.setUint8(i, i % 256)
			}

			const result = getHashForBuffer(buffer)
			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})
	})

	describe('byte order sensitivity', () => {
		it('should be sensitive to byte order', () => {
			const buffer1 = new ArrayBuffer(4)
			const buffer2 = new ArrayBuffer(4)
			const view1 = new DataView(buffer1)
			const view2 = new DataView(buffer2)

			// Same bytes, different order
			view1.setUint8(0, 0x12)
			view1.setUint8(1, 0x34)
			view1.setUint8(2, 0x56)
			view1.setUint8(3, 0x78)

			view2.setUint8(0, 0x78)
			view2.setUint8(1, 0x56)
			view2.setUint8(2, 0x34)
			view2.setUint8(3, 0x12)

			const hash1 = getHashForBuffer(buffer1)
			const hash2 = getHashForBuffer(buffer2)

			expect(hash1).not.toBe(hash2)
		})

		it('should distinguish between all-zero and mixed content', () => {
			const zeroBuffer = new ArrayBuffer(8)
			const mixedBuffer = new ArrayBuffer(8)
			const mixedView = new DataView(mixedBuffer)

			// Fill mixed buffer with some pattern
			mixedView.setUint32(0, 0x12345678)
			mixedView.setUint32(4, 0x9abcdef0)

			const zeroHash = getHashForBuffer(zeroBuffer)
			const mixedHash = getHashForBuffer(mixedBuffer)

			expect(zeroHash).not.toBe(mixedHash)
		})
	})

	describe('typed array compatibility', () => {
		it('should work with Uint8Array buffers', () => {
			const array = new Uint8Array([1, 2, 3, 4, 5])
			const result = getHashForBuffer(array.buffer)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should work with Int32Array buffers', () => {
			const array = new Int32Array([0x12345678, -0x12345678])
			const result = getHashForBuffer(array.buffer)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})

		it('should work with Float64Array buffers', () => {
			const array = new Float64Array([3.14159, -2.71828])
			const result = getHashForBuffer(array.buffer)

			expect(typeof result).toBe('string')
			expect(result).toMatch(/^-?\d+$/)
		})
	})
})

describe('lns', () => {
	describe('basic functionality', () => {
		it('should return a string', () => {
			const result = lns('hello')
			expect(typeof result).toBe('string')
		})

		it('should produce consistent results for the same input', () => {
			const input = 'test123'
			const result1 = lns(input)
			const result2 = lns(input)

			expect(result1).toBe(result2)
		})

		it('should preserve string length', () => {
			const input = 'hello world'
			const result = lns(input)

			expect(result.length).toBe(input.length)
		})
	})

	describe('character transformations', () => {
		it('should transform numeric characters according to the algorithm', () => {
			const input = '12345'
			const result = lns(input)

			// Based on the algorithm: +n < 5 ? 5 + +n : +n > 5 ? +n - 5 : n
			// 1 -> 6, 2 -> 7, 3 -> 8, 4 -> 9, 5 -> 5
			// But the order is also changed by the splice operations and reverse
			expect(typeof result).toBe('string')
			expect(result.length).toBe(input.length)
			expect(result).toMatch(/^[0-9]+$/)
		})

		it('should leave non-numeric characters unchanged in terms of transformation rule', () => {
			const input = 'abc'
			const result = lns(input)

			// Non-numeric chars should not be transformed by the number rules
			expect(result.length).toBe(input.length)
			expect(/[abc]/.test(result)).toBe(true) // Should still contain original letters
		})

		it('should handle mixed alphanumeric strings', () => {
			const input = 'abc123def'
			const result = lns(input)

			expect(result.length).toBe(input.length)
			expect(typeof result).toBe('string')
		})
	})

	describe('string manipulation operations', () => {
		it('should apply splice operations that rearrange characters', () => {
			const input = 'abcdefghij' // 10 characters
			const result = lns(input)

			// The algorithm should rearrange the characters
			expect(result.length).toBe(input.length)

			// Should be different due to transformations and rearrangements
			expect(result).not.toBe(input)
		})

		it('should reverse the final result', () => {
			// This is hard to test directly due to all the transformations,
			// but we can test with a simple case
			const input = 'ab'
			const result = lns(input)

			expect(result.length).toBe(2)
			expect(typeof result).toBe('string')
		})
	})

	describe('edge cases', () => {
		it('should handle empty strings', () => {
			const result = lns('')
			expect(result).toBe('')
		})

		it('should handle single characters', () => {
			const letterResult = lns('a')
			expect(letterResult).toBe('a')

			const numberResult = lns('3')
			expect(numberResult).toBe('8') // 3 -> 5+3 = 8

			const numberResult2 = lns('7')
			expect(numberResult2).toBe('2') // 7 -> 7-5 = 2

			const numberResult3 = lns('5')
			expect(numberResult3).toBe('5') // 5 stays 5
		})

		it('should handle strings with only numbers', () => {
			const result = lns('1234567890')

			expect(result.length).toBe(10)
			expect(result).toMatch(/^[0-9]+$/)
		})

		it('should handle strings with special characters', () => {
			const input = '!@#$%'
			const result = lns(input)

			expect(result.length).toBe(input.length)
			expect(typeof result).toBe('string')
		})

		it('should handle very long strings', () => {
			const input = 'a'.repeat(1000)
			const result = lns(input)

			expect(result.length).toBe(1000)
			expect(typeof result).toBe('string')
		})
	})

	describe('numeric transformation rules', () => {
		it('should transform numbers 1-4 by adding 5', () => {
			expect(lns('1')).toBe('6')
			expect(lns('2')).toBe('7')
			expect(lns('3')).toBe('8')
			expect(lns('4')).toBe('9')
		})

		it('should keep 5 unchanged', () => {
			expect(lns('5')).toBe('5')
		})

		it('should transform numbers 6-9 by subtracting 5', () => {
			expect(lns('6')).toBe('1')
			expect(lns('7')).toBe('2')
			expect(lns('8')).toBe('3')
			expect(lns('9')).toBe('4')
		})

		it('should keep 0 unchanged (as it is not > 0)', () => {
			expect(lns('0')).toBe('0')
		})
	})

	describe('deterministic behavior', () => {
		it('should produce the same output for the same input across multiple calls', () => {
			const testCases = [
				'hello',
				'123abc',
				'test_string_with_underscores',
				'MixedCaseString',
				'numbers12345',
				'!@#$%^&*()',
			]

			testCases.forEach((input) => {
				const result1 = lns(input)
				const result2 = lns(input)
				const result3 = lns(input)

				expect(result1).toBe(result2)
				expect(result2).toBe(result3)
			})
		})

		it('should produce different outputs for different inputs', () => {
			const inputs = ['a', 'b', 'c', 'aa', 'ab', 'ba']
			const results = inputs.map((input) => lns(input))

			// All results should be unique
			const uniqueResults = new Set(results)
			expect(uniqueResults.size).toBe(results.length)
		})
	})
})
