import { describe, expect, it } from 'vitest'
import { getHashForBuffer, getHashForObject, getHashForString, lns } from './hash'

describe('getHashForString', () => {
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

	it('should handle empty strings', () => {
		const result = getHashForString('')
		expect(result).toBe('0')
	})
})

describe('getHashForObject', () => {
	it('should produce consistent hashes for equivalent objects', () => {
		const obj1 = { name: 'John', age: 30 }
		const obj2 = { name: 'John', age: 30 }

		const hash1 = getHashForObject(obj1)
		const hash2 = getHashForObject(obj2)

		expect(hash1).toBe(hash2)
	})

	it('should be sensitive to property order', () => {
		const obj1 = { a: 1, b: 2 }
		const obj2 = { b: 2, a: 1 }

		const hash1 = getHashForObject(obj1)
		const hash2 = getHashForObject(obj2)

		expect(hash1).not.toBe(hash2)
	})
})

describe('getHashForBuffer', () => {
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

	it('should handle empty buffers', () => {
		const buffer = new ArrayBuffer(0)
		const result = getHashForBuffer(buffer)
		expect(result).toBe('0')
	})
})

describe('lns', () => {
	it('should produce consistent results for the same input', () => {
		const input = 'test123'
		const result1 = lns(input)
		const result2 = lns(input)

		expect(result1).toBe(result2)
	})

	it('should handle empty strings', () => {
		const result = lns('')
		expect(result).toBe('')
	})
})
