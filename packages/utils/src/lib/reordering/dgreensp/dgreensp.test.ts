import { IndexKey } from '../IndexKey'
import { generateNKeysBetween } from './dgreensp'

const generateKeyBetween = (a?: string, b?: string) =>
	generateNKeysBetween(a as IndexKey, b as IndexKey, 1)[0]

describe('get order between', () => {
	it('passes tests', () => {
		expect(generateKeyBetween(undefined, undefined)).toBe('a0')
		expect(generateKeyBetween(undefined, 'a0')).toBe('Zz')
		expect(generateKeyBetween('a0', undefined)).toBe('a1')
		expect(generateKeyBetween('a0', 'a1')).toBe('a0V')
		expect(generateKeyBetween('a0V', 'a1')).toBe('a0l')
		expect(generateKeyBetween('Zz', 'a0')).toBe('ZzV')
		expect(generateKeyBetween('Zz', 'a1')).toBe('a0')
		expect(generateKeyBetween(undefined, 'Y00')).toBe('Xzzz')
		expect(generateKeyBetween('bzz', undefined)).toBe('c000')
		expect(generateKeyBetween('a0', 'a0V')).toBe('a0G')
		expect(generateKeyBetween('a0', 'a0G')).toBe('a08')
		expect(generateKeyBetween('b125', 'b129')).toBe('b127')
		expect(generateKeyBetween('a0', 'a1V')).toBe('a1')
		expect(generateKeyBetween('Zz', 'a01')).toBe('a0')
		expect(generateKeyBetween(undefined, 'a0V')).toBe('a0')
		expect(generateKeyBetween(undefined, 'b999')).toBe('b99')
		expect(generateKeyBetween(undefined, 'A000000000000000000000000001')).toBe(
			'A000000000000000000000000000V'
		)
		expect(generateKeyBetween('zzzzzzzzzzzzzzzzzzzzzzzzzzy', undefined)).toBe(
			'zzzzzzzzzzzzzzzzzzzzzzzzzzz'
		)
		expect(generateKeyBetween('zzzzzzzzzzzzzzzzzzzzzzzzzzz', undefined)).toBe(
			'zzzzzzzzzzzzzzzzzzzzzzzzzzzV'
		)
		expect(() => generateKeyBetween(undefined, 'A00000000000000000000000000')).toThrow()
		expect(() => generateKeyBetween('a00', undefined)).toThrow()
		expect(() => generateKeyBetween('a00', 'a1')).toThrow()
		expect(() => generateKeyBetween('0', '1')).toThrow()
		expect(() => generateKeyBetween('a1', 'a0')).toThrow()
	})
})

describe('generateNKeysBetween', () => {
	it('Gets the correct orders between', () => {
		expect(generateNKeysBetween(undefined, undefined, 5).join(' ')).toBe('a0 a1 a2 a3 a4')
		expect(generateNKeysBetween('a4' as IndexKey, undefined, 10).join(' ')).toBe(
			'a5 a6 a7 a8 a9 aA aB aC aD aE'
		)
		expect(generateNKeysBetween(undefined, 'a0' as IndexKey, 5).join(' ')).toBe('Zv Zw Zx Zy Zz')
		expect(generateNKeysBetween('a0' as IndexKey, 'a2' as IndexKey, 20).join(' ')).toBe(
			'a04 a08 a0G a0K a0O a0V a0Z a0d a0l a0t a1 a14 a18 a1G a1O a1V a1Z a1d a1l a1t'
		)
	})
})
