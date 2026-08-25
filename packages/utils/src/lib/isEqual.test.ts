import { describe, expect, it } from 'vitest'
import { isEqual, isEqualWith } from './isEqual'

describe('isEqual', () => {
	it('compares primitives by value', () => {
		expect(isEqual(1, 1)).toBe(true)
		expect(isEqual('a', 'a')).toBe(true)
		expect(isEqual(true, true)).toBe(true)
		expect(isEqual(null, null)).toBe(true)
		expect(isEqual(undefined, undefined)).toBe(true)
		expect(isEqual(NaN, NaN)).toBe(true)
		expect(isEqual(0, -0)).toBe(true)
		expect(isEqual(1n, 1n)).toBe(true)

		expect(isEqual(1, 2)).toBe(false)
		expect(isEqual(1, '1')).toBe(false)
		expect(isEqual(null, undefined)).toBe(false)
		expect(isEqual(null, {})).toBe(false)
		expect(isEqual(0, null)).toBe(false)
		expect(isEqual('', false)).toBe(false)
	})

	it('compares arrays element-wise and by length', () => {
		expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true)
		expect(isEqual([], [])).toBe(true)
		expect(isEqual([1, [2, [3]]], [1, [2, [3]]])).toBe(true)
		expect(isEqual([1, 2, 3], [1, 2])).toBe(false)
		expect(isEqual([1, 2, 3], [3, 2, 1])).toBe(false)
		expect(isEqual([1, 2], { 0: 1, 1: 2, length: 2 })).toBe(false)
	})

	it('compares plain objects by own enumerable keys, ignoring order', () => {
		expect(isEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
		expect(isEqual({ a: { b: { c: [1, 2] } } }, { a: { b: { c: [1, 2] } } })).toBe(true)
		expect(isEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false)
		expect(isEqual({ a: undefined }, { b: undefined })).toBe(false)
		expect(isEqual({ a: 1 }, { a: 2 })).toBe(false)
		expect(isEqual({}, [])).toBe(false)
	})

	it('does not consider inherited properties', () => {
		const proto = { inherited: 1 }
		const a = Object.create(proto)
		const b = Object.create(proto)
		expect(isEqual(a, b)).toBe(true)
		a.own = 1
		expect(isEqual(a, b)).toBe(false)
	})

	it('treats objects with different constructors as different', () => {
		class Foo {
			constructor(public x = 1) {}
		}
		class Bar {
			constructor(public x = 1) {}
		}
		expect(isEqual(new Foo(), new Foo())).toBe(true)
		expect(isEqual(new Foo(), new Bar())).toBe(false)
		expect(isEqual(new Foo(), { x: 1 })).toBe(false)
		expect(isEqual(new Foo(1), new Foo(2))).toBe(false)
	})

	it('compares dates, regexps and boxed primitives', () => {
		expect(isEqual(new Date(100), new Date(100))).toBe(true)
		expect(isEqual(new Date(100), new Date(101))).toBe(false)
		expect(isEqual(/a/g, /a/g)).toBe(true)
		expect(isEqual(/a/g, /a/i)).toBe(false)
		expect(isEqual(/a/, /b/)).toBe(false)
		expect(isEqual(new Number(1), new Number(1))).toBe(true)
		expect(isEqual(new String('a'), new String('a'))).toBe(true)
		expect(isEqual(new Number(1), 1)).toBe(false)
	})

	it('compares maps by entries regardless of insertion order', () => {
		expect(
			isEqual(
				new Map<string, unknown>([
					['a', { x: 1 }],
					['b', 2],
				]),
				new Map<string, unknown>([
					['b', 2],
					['a', { x: 1 }],
				])
			)
		).toBe(true)
		expect(isEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false)
		expect(isEqual(new Map([['a', 1]]), new Map([['b', 1]]))).toBe(false)
		expect(
			isEqual(
				new Map([['a', 1]]),
				new Map([
					['a', 1],
					['b', 2],
				])
			)
		).toBe(false)
	})

	it('compares sets by membership, deeply for object members', () => {
		expect(isEqual(new Set([1, 2, 3]), new Set([3, 2, 1]))).toBe(true)
		expect(isEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false)
		expect(isEqual(new Set([{ a: 1 }, { b: 2 }]), new Set([{ b: 2 }, { a: 1 }]))).toBe(true)
		expect(isEqual(new Set([{ a: 1 }, { a: 1 }]), new Set([{ a: 1 }, { b: 2 }]))).toBe(false)
		expect(isEqual(new Set([{ a: 1 }]), new Set([{ a: 2 }]))).toBe(false)
	})

	it('compares typed arrays and array buffers by content', () => {
		expect(isEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true)
		expect(isEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false)
		expect(isEqual(new Uint8Array([1, 2]), new Int8Array([1, 2]))).toBe(false)
		expect(isEqual(new Uint8Array([1, 2]).buffer, new Uint8Array([1, 2]).buffer)).toBe(true)
		expect(isEqual(new Uint8Array([1, 2]).buffer, new Uint8Array([1, 2, 3]).buffer)).toBe(false)
	})

	it('tolerates circular references', () => {
		const a: any = { x: 1 }
		a.self = a
		const b: any = { x: 1 }
		b.self = b
		expect(isEqual(a, b)).toBe(true)

		// Cycles of different shape terminate and, as in lodash, are not equal
		const c: any = { x: 1 }
		c.self = { x: 1, self: c }
		expect(isEqual(a, c)).toBe(false)

		const d: any = { x: 2 }
		d.self = d
		expect(isEqual(a, d)).toBe(false)
	})

	it('compares tldraw-style records', () => {
		const shape = {
			id: 'shape:a',
			typeName: 'shape',
			type: 'geo',
			x: 0.5,
			y: 0,
			rotation: 0,
			props: { w: 100, h: 100, geo: 'rectangle', richText: { type: 'doc', content: [] } },
			meta: {},
		}
		expect(isEqual(shape, structuredClone(shape))).toBe(true)
		expect(isEqual(shape, { ...shape, props: { ...shape.props, w: 101 } })).toBe(false)
		expect(isEqual(shape, { ...shape, meta: { a: 1 } })).toBe(false)
	})
})

describe('isEqualWith', () => {
	it('lets the customizer decide equality and falls back when it returns undefined', () => {
		const within = (a: unknown, b: unknown) =>
			typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.01 : undefined
		expect(isEqualWith({ a: [1, 1.001] }, { a: [1.001, 1] }, within)).toBe(true)
		expect(isEqualWith({ a: [1, 1.001] }, { a: [1, 1.5] }, within)).toBe(false)
		expect(isEqualWith({ a: 'x' }, { a: 'y' }, within)).toBe(false)
	})

	it('invokes the customizer for the root values and every nested pair with the key', () => {
		const calls: Array<PropertyKey | undefined> = []
		isEqualWith(
			{ a: [1], b: new Map([['m', 1]]) },
			{ a: [1], b: new Map([['m', 1]]) },
			(_a, _b, key) => {
				calls.push(key)
				return undefined
			}
		)
		expect(calls).toEqual([undefined, 'a', 0, 'b', 'm'])
	})

	it('a customizer result of false short-circuits', () => {
		expect(isEqualWith(1, 1, () => false)).toBe(false)
		expect(isEqualWith({ a: 1 }, { a: 2 }, () => true)).toBe(true)
	})

	it('behaves like isEqual without a customizer', () => {
		expect(isEqualWith({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true)
		expect(isEqualWith({ a: 1 }, { a: 2 })).toBe(false)
	})
})
