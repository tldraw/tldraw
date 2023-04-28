import { filterSensitiveData, REDACTED_VALUE } from './util'

describe('filterSensitiveData', () => {
	it('string', () => {
		const input1 = 'user:foobar'
		const output1 = filterSensitiveData(input1)
		expect(output1).toEqual(REDACTED_VALUE)

		const input2 = 'something/user:foobar'
		const output2 = filterSensitiveData(input2)
		expect(output2).toEqual(input2)
	})

	it('number', () => {
		const input1 = -1
		const output1 = filterSensitiveData(input1)
		expect(output1).toEqual(input1)

		const input2 = 0
		const output2 = filterSensitiveData(input2)
		expect(output2).toEqual(input2)

		const input3 = 1
		const output3 = filterSensitiveData(input3)
		expect(output3).toEqual(input3)
	})

	it('object', () => {
		const input1 = {
			foo: 'user:foo',
			bar: {
				'inner:one': 'user:bar',
				'inner:two': 'two',
				'inner:three': 3,
				'inner:four': [4, 'five', false, true, 0, -1, 1, 'user:baz'],
				'inner:five': false,
				'inner:six': true,
				'inner:seven': 0,
				'inner:eight': -1,
				'inner:nine': 1,
			},
			one: 'user:bar',
			two: 'two',
			three: 3,
			four: [4, 'five', false, true, 0, -1, 1],
			five: false,
			six: true,
			seven: 0,
			eight: -1,
			nine: 1,
		}
		const output1 = filterSensitiveData(input1)
		expect(output1).toEqual({
			foo: REDACTED_VALUE,
			bar: {
				'inner:one': REDACTED_VALUE,
				'inner:two': 'two',
				'inner:three': 3,
				'inner:four': [4, 'five', false, true, 0, -1, 1, REDACTED_VALUE],
				'inner:five': false,
				'inner:six': true,
				'inner:seven': 0,
				'inner:eight': -1,
				'inner:nine': 1,
			},
			one: REDACTED_VALUE,
			two: 'two',
			three: 3,
			four: [4, 'five', false, true, 0, -1, 1],
			five: false,
			six: true,
			seven: 0,
			eight: -1,
			nine: 1,
		})
	})

	it('array', () => {
		const input1 = ['user:foo', 4, 'five', false, true, 'user:bar', 0, -1, 1, 'user:baz']
		const output1 = filterSensitiveData(input1)
		expect(output1).toEqual([
			REDACTED_VALUE,
			4,
			'five',
			false,
			true,
			REDACTED_VALUE,
			0,
			-1,
			1,
			REDACTED_VALUE,
		])
	})

	it('null', () => {
		const input1 = null
		const output1 = filterSensitiveData(input1)
		expect(output1).toEqual(input1)
	})

	it('JSONify it', () => {
		// Just some things that get nulled when JSONifying
		const input1 = new Set([1, 2, 3])
		const output1 = filterSensitiveData(input1)
		expect(output1).toEqual({})

		const input2 = new Map([
			['a', 1],
			['b', 2],
			['c', 3],
		])
		const output2 = filterSensitiveData(input2)
		expect(output2).toEqual({})

		const input3 = { one: 1, two: null, three: undefined }
		const output3 = filterSensitiveData(input3)
		expect(output3).toEqual({
			one: 1,
			two: null,
		})
	})
})
