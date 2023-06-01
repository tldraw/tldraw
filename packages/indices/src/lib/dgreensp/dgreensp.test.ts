import {
	decrementInteger,
	generateKeyBetween,
	generateNKeysBetween,
	incrementInteger,
	midpoint,
} from './dgreensp'

describe('midpoint', () => {
	it('passes tests', () => {
		expect(midpoint('', undefined)).toBe('V')
		expect(midpoint('V', undefined)).toBe('l')
		expect(midpoint('l', undefined)).toBe('t')
		expect(midpoint('t', undefined)).toBe('x')
		expect(midpoint('x', undefined)).toBe('z')
		expect(midpoint('z', undefined)).toBe('zV')
		expect(midpoint('zV', undefined)).toBe('zl')
		expect(midpoint('zl', undefined)).toBe('zt')
		expect(midpoint('zt', undefined)).toBe('zx')
		expect(midpoint('zx', undefined)).toBe('zz')
		expect(midpoint('zz', undefined)).toBe('zzV')
		expect(midpoint('1', '2')).toBe('1V')
		expect(() => midpoint('2', '1')).toThrowError()
		expect(() => midpoint('', '')).toThrowError()
		expect(() => midpoint('0', '1')).toThrowError()
		expect(() => midpoint('1', '10')).toThrowError()
		expect(() => midpoint('11', '1')).toThrowError()
		expect(midpoint('001', '001002')).toBe('001001')
		expect(midpoint('001', '001001')).toBe('001000V')
		expect(midpoint('', 'V')).toBe('G')
		expect(midpoint('', 'G')).toBe('8')
		expect(midpoint('', '8')).toBe('4')
		expect(midpoint('', '4')).toBe('2')
		expect(midpoint('', '2')).toBe('1')
		expect(midpoint('', '1')).toBe('0V')
		expect(midpoint('0V', '1')).toBe('0l')
		expect(midpoint('', '0G')).toBe('08')
		expect(midpoint('', '08')).toBe('04')
		expect(midpoint('', '02')).toBe('01')
		expect(midpoint('', '01')).toBe('00V')
		expect(midpoint('4zz', '5')).toBe('4zzV')
	})
})

describe('decrement integer', () => {
	it('passes tests', () => {
		expect(decrementInteger('a1')).toBe('a0')
		expect(decrementInteger('a2')).toBe('a1')
		expect(decrementInteger('b00')).toBe('az')
		expect(decrementInteger('b10')).toBe('b0z')
		expect(decrementInteger('b20')).toBe('b1z')
		expect(decrementInteger('c000')).toBe('bzz')
		expect(decrementInteger('Zz')).toBe('Zy')
		expect(decrementInteger('a0')).toBe('Zz')
		expect(decrementInteger('Yzz')).toBe('Yzy')
		expect(decrementInteger('Z0')).toBe('Yzz')
		expect(decrementInteger('Xz00')).toBe('Xyzz')
		expect(decrementInteger('Xz01')).toBe('Xz00')
		expect(decrementInteger('Y00')).toBe('Xzzz')
		expect(decrementInteger('dAC00')).toBe('dABzz')
		expect(decrementInteger('A00000000000000000000000000')).toBe(undefined)
	})
})

describe('increment integer', () => {
	it('produces the right integer string', () => {
		expect(incrementInteger('a0')).toBe('a1')
		expect(incrementInteger('a1')).toBe('a2')
		expect(incrementInteger('az')).toBe('b00')
		expect(incrementInteger('b0z')).toBe('b10')
		expect(incrementInteger('b1z')).toBe('b20')
		expect(incrementInteger('bzz')).toBe('c000')
		expect(incrementInteger('Zy')).toBe('Zz')
		expect(incrementInteger('Zz')).toBe('a0')
		expect(incrementInteger('Yzy')).toBe('Yzz')
		expect(incrementInteger('Yzz')).toBe('Z0')
		expect(incrementInteger('Xyzz')).toBe('Xz00')
		expect(incrementInteger('Xz00')).toBe('Xz01')
		expect(incrementInteger('Xzzz')).toBe('Y00')
		expect(incrementInteger('dABzz')).toBe('dAC00')
		expect(incrementInteger('zzzzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(undefined)
	})
})

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
		expect(() => generateKeyBetween(undefined, 'A00000000000000000000000000')).toThrowError()
		expect(() => generateKeyBetween('a00', undefined)).toThrowError()
		expect(() => generateKeyBetween('a00', 'a1')).toThrowError()
		expect(() => generateKeyBetween('0', '1')).toThrowError()
		expect(() => generateKeyBetween('a1', 'a0')).toThrowError()
	})
})

describe('generateNKeysBetween', () => {
	it('Gets the correct orders between', () => {
		expect(generateNKeysBetween(undefined, undefined, 5).join(' ')).toBe('a0 a1 a2 a3 a4')
		expect(generateNKeysBetween('a4', undefined, 10).join(' ')).toBe(
			'a5 a6 a7 a8 a9 aA aB aC aD aE'
		)
		expect(generateNKeysBetween(undefined, 'a0', 5).join(' ')).toBe('Zv Zw Zx Zy Zz')
		expect(generateNKeysBetween('a0', 'a2', 20).join(' ')).toBe(
			'a04 a08 a0G a0K a0O a0V a0Z a0d a0l a0t a1 a14 a18 a1G a1O a1V a1Z a1d a1l a1t'
		)
	})
})
