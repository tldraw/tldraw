import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, '../../public/polyfills.js'), 'utf8')

const natives = {
	hasOwn: Object.getOwnPropertyDescriptor(Object, 'hasOwn')!,
	arrayAt: Object.getOwnPropertyDescriptor(Array.prototype, 'at')!,
	stringAt: Object.getOwnPropertyDescriptor(String.prototype, 'at')!,
}

describe('public/polyfills.js on a browser without Object.hasOwn or .at', () => {
	beforeEach(() => {
		delete (Object as any).hasOwn
		delete (Array.prototype as any).at
		delete (String.prototype as any).at
		new Function(source)()
	})

	afterEach(() => {
		Object.defineProperty(Object, 'hasOwn', natives.hasOwn)
		Object.defineProperty(Array.prototype, 'at', natives.arrayAt)
		Object.defineProperty(String.prototype, 'at', natives.stringAt)
	})

	it('installs Object.hasOwn', () => {
		expect(Object.getOwnPropertyDescriptor(Object, 'hasOwn')?.value).not.toBe(natives.hasOwn.value)
		expect(Object.hasOwn({ a: 1 }, 'a')).toBe(true)
		expect(Object.hasOwn({ a: 1 }, 'toString')).toBe(false)
		expect(Object.hasOwn(Object.create(null), 'a')).toBe(false)
		expect(() => Object.hasOwn(null as any, 'a')).toThrow(TypeError)
	})

	it('installs Array.prototype.at and String.prototype.at', () => {
		const list = [1, 2, 3]
		expect([list.at(0), list.at(-1), list.at(3), list.at(-4), [].at(-1)]).toEqual([
			1,
			3,
			undefined,
			undefined,
			undefined,
		])
		expect(['abc'.at(-1), 'abc'.at(1.7), ''.at(0)]).toEqual(['c', 'b', undefined])
	})

	it('keeps the polyfills non-enumerable', () => {
		const keys: string[] = []
		for (const key in [1]) keys.push(key)
		expect(keys).toEqual(['0'])
		expect(Object.getOwnPropertyDescriptor(Array.prototype, 'at')?.enumerable).toBe(false)
	})
})
