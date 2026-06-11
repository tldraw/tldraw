import { describe, expect, it } from 'vitest'
import { isEqual, isEqualWith } from './equality'

describe('isEqual', () => {
	it('compares primitives', () => {
		expect(isEqual(1, 1)).toBe(true)
		expect(isEqual(1, 2)).toBe(false)
		expect(isEqual('a', 'a')).toBe(true)
		expect(isEqual('a', 'b')).toBe(false)
		expect(isEqual(true, true)).toBe(true)
		expect(isEqual(true, false)).toBe(false)
		expect(isEqual(null, null)).toBe(true)
		expect(isEqual(undefined, undefined)).toBe(true)
		expect(isEqual(null, undefined)).toBe(false)
		expect(isEqual(0, '0')).toBe(false)
		expect(isEqual(1, true)).toBe(false)
	})

	it('treats NaN as equal to NaN', () => {
		expect(isEqual(NaN, NaN)).toBe(true)
		expect(isEqual({ a: NaN }, { a: NaN })).toBe(true)
		expect(isEqual([NaN], [NaN])).toBe(true)
		expect(isEqual(NaN, 1)).toBe(false)
	})

	it('treats +0 and -0 as equal', () => {
		expect(isEqual(0, -0)).toBe(true)
	})

	it('compares arrays', () => {
		expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true)
		expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false)
		expect(isEqual([1, 2, 3], [1, 2])).toBe(false)
		expect(isEqual([], [])).toBe(true)
		expect(isEqual([[1], [2]], [[1], [2]])).toBe(true)
		expect(isEqual([1, 2], { 0: 1, 1: 2, length: 2 })).toBe(false)
	})

	it('compares sparse arrays', () => {
		// eslint-disable-next-line no-sparse-arrays
		expect(isEqual([1, , 3], [1, undefined, 3])).toBe(true)
	})

	it('compares plain objects', () => {
		expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
		expect(isEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
		expect(isEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false)
		expect(isEqual({ a: 1 }, { a: 2 })).toBe(false)
		expect(isEqual({}, {})).toBe(true)
		expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
		expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false)
	})

	it('compares objects with null prototypes', () => {
		const a = Object.create(null)
		a.x = 1
		expect(isEqual(a, { x: 1 })).toBe(true)
	})

	it('compares objects with symbol keys', () => {
		const sym = Symbol('key')
		expect(isEqual({ [sym]: 1 }, { [sym]: 1 })).toBe(true)
		expect(isEqual({ [sym]: 1 }, { [sym]: 2 })).toBe(false)
		expect(isEqual({ [sym]: 1 }, {})).toBe(false)
	})

	it('distinguishes class instances from plain objects', () => {
		class Foo {
			x = 1
		}
		expect(isEqual(new Foo(), { x: 1 })).toBe(false)
		expect(isEqual(new Foo(), new Foo())).toBe(true)
	})

	it('compares dates', () => {
		expect(isEqual(new Date(100), new Date(100))).toBe(true)
		expect(isEqual(new Date(100), new Date(200))).toBe(false)
		expect(isEqual(new Date(NaN), new Date(NaN))).toBe(true)
		expect(isEqual(new Date(100), 100)).toBe(false)
	})

	it('compares regexps', () => {
		expect(isEqual(/a/g, /a/g)).toBe(true)
		expect(isEqual(/a/g, /a/i)).toBe(false)
		expect(isEqual(/a/, /b/)).toBe(false)
	})

	it('compares errors', () => {
		expect(isEqual(new Error('a'), new Error('a'))).toBe(true)
		expect(isEqual(new Error('a'), new Error('b'))).toBe(false)
		expect(isEqual(new Error('a'), new TypeError('a'))).toBe(false)
	})

	it('compares maps regardless of insertion order', () => {
		expect(
			isEqual(
				new Map<string, any>([
					['a', 1],
					['b', { c: 2 }],
				]),
				new Map<string, any>([
					['b', { c: 2 }],
					['a', 1],
				])
			)
		).toBe(true)
		expect(isEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false)
		expect(isEqual(new Map([['a', 1]]), new Map())).toBe(false)
	})

	it('compares sets regardless of insertion order', () => {
		expect(isEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true)
		expect(isEqual(new Set([{ a: 1 }]), new Set([{ a: 1 }]))).toBe(true)
		expect(isEqual(new Set([1]), new Set([2]))).toBe(false)
		expect(isEqual(new Set([1]), new Set([1, 2]))).toBe(false)
	})

	it('compares typed arrays and array buffers', () => {
		expect(isEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true)
		expect(isEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false)
		expect(isEqual(new Uint8Array([1, 2]), new Int8Array([1, 2]))).toBe(false)
		expect(isEqual(new Uint8Array([1]).buffer, new Uint8Array([1]).buffer)).toBe(true)
		expect(isEqual(new Uint8Array([1]).buffer, new Uint8Array([2]).buffer)).toBe(false)
		expect(isEqual(new Float64Array([1.5]), new Float64Array([1.5]))).toBe(true)
	})

	it('does not coerce different types of object', () => {
		expect(isEqual([], {})).toBe(false)
		expect(isEqual(new Map(), {})).toBe(false)
		expect(isEqual(new Set(), [])).toBe(false)
		expect(isEqual(new Date(0), {})).toBe(false)
	})

	it('compares functions by reference', () => {
		const fn = () => 1
		expect(isEqual(fn, fn)).toBe(true)
		expect(
			isEqual(
				() => 1,
				() => 1
			)
		).toBe(false)
	})

	it('handles circular references', () => {
		const a: any = { x: 1 }
		a.self = a
		const b: any = { x: 1 }
		b.self = b
		expect(isEqual(a, b)).toBe(true)

		const c: any = { x: 2 }
		c.self = c
		expect(isEqual(a, c)).toBe(false)

		const arrA: any[] = [1]
		arrA.push(arrA)
		const arrB: any[] = [1]
		arrB.push(arrB)
		expect(isEqual(arrA, arrB)).toBe(true)
	})

	it('compares realistic record shapes', () => {
		const shape = {
			id: 'shape:abc',
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 100, h: 100, richText: { type: 'doc', content: [{ type: 'paragraph' }] } },
			meta: {},
		}
		expect(isEqual(shape, structuredClone(shape))).toBe(true)
		expect(isEqual(shape, { ...shape, x: 1 })).toBe(false)
		expect(
			isEqual(shape, {
				...shape,
				props: { ...shape.props, richText: { type: 'doc', content: [] } },
			})
		).toBe(false)
	})
})

describe('isEqualWith', () => {
	it('falls back to deep equality when the customizer returns undefined', () => {
		expect(isEqualWith({ a: 1 }, { a: 1 }, () => undefined)).toBe(true)
		expect(isEqualWith({ a: 1 }, { a: 2 }, () => undefined)).toBe(false)
	})

	it('uses the customizer result when it returns a boolean', () => {
		const almostEqual = (a: any, b: any) =>
			typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.001 : undefined
		expect(isEqualWith({ x: 1.0000001 }, { x: 1.0000002 }, almostEqual)).toBe(true)
		expect(isEqualWith({ x: 1 }, { x: 2 }, almostEqual)).toBe(false)
		expect(isEqualWith([1.0000001, [2.0000001]], [1.0000002, [2.0000002]], almostEqual)).toBe(true)
	})

	it('invokes the customizer for the top-level values', () => {
		expect(isEqualWith(1, 2, () => true)).toBe(true)
		expect(isEqualWith({ a: 1 }, { a: 1 }, () => false)).toBe(false)
	})

	it('passes keys and parents to the customizer for nested values', () => {
		const calls: any[] = []
		isEqualWith({ a: { b: 2 } }, { a: { b: 3 } }, (value, other, key) => {
			calls.push([value, other, key])
			return undefined
		})
		expect(calls).toEqual([
			[{ a: { b: 2 } }, { a: { b: 3 } }, undefined],
			[{ b: 2 }, { b: 3 }, 'a'],
			[2, 3, 'b'],
		])
	})
})
