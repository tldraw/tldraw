import { StyleProp } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { ReadonlySharedStyleMap, SharedStyleMap } from './SharedStylesMap'

const colorProp = StyleProp.define('test:color', { defaultValue: 'black', type: T.string })
const sizeProp = StyleProp.defineEnum('test:size', { defaultValue: 's', values: ['s', 'm', 'l'] })
const weightProp = StyleProp.define('test:weight', { defaultValue: 1, type: T.number })

describe('ReadonlySharedStyleMap', () => {
	it('starts empty when constructed without entries', () => {
		const map = new ReadonlySharedStyleMap()
		expect(map.size).toBe(0)
		expect(map.get(colorProp)).toBeUndefined()
		expect(map.getAsKnownValue(colorProp)).toBeUndefined()
	})

	it('is populated from an iterable of entries', () => {
		const map = new ReadonlySharedStyleMap([
			[colorProp, { type: 'shared', value: 'red' }],
			[sizeProp, { type: 'mixed' }],
		])
		expect(map.size).toBe(2)
		expect(map.get(colorProp)).toEqual({ type: 'shared', value: 'red' })
		expect(map.get(sizeProp)).toEqual({ type: 'mixed' })
		expect(map.get(weightProp)).toBeUndefined()
	})

	it('getAsKnownValue returns the value for shared styles and undefined for mixed ones', () => {
		const map = new ReadonlySharedStyleMap([
			[colorProp, { type: 'shared', value: 'red' }],
			[sizeProp, { type: 'mixed' }],
		])
		expect(map.getAsKnownValue(colorProp)).toBe('red')
		expect(map.getAsKnownValue(sizeProp)).toBeUndefined()
	})

	it('iterates keys, values, entries and via the iterator in insertion order', () => {
		const map = new ReadonlySharedStyleMap([
			[sizeProp, { type: 'mixed' }],
			[colorProp, { type: 'shared', value: 'red' }],
		])
		expect(Array.from(map.keys())).toEqual([sizeProp, colorProp])
		expect(Array.from(map.values())).toEqual([{ type: 'mixed' }, { type: 'shared', value: 'red' }])
		expect(Array.from(map.entries())).toEqual([
			[sizeProp, { type: 'mixed' }],
			[colorProp, { type: 'shared', value: 'red' }],
		])
		expect(Array.from(map)).toEqual(Array.from(map.entries()))
	})

	describe('equals', () => {
		it('is true for maps with the same shared values and mixed keys', () => {
			const a = new ReadonlySharedStyleMap([
				[colorProp, { type: 'shared', value: 'red' }],
				[sizeProp, { type: 'mixed' }],
			])
			const b = new ReadonlySharedStyleMap([
				[sizeProp, { type: 'mixed' }],
				[colorProp, { type: 'shared', value: 'red' }],
			])
			expect(a.equals(b)).toBe(true)
			expect(b.equals(a)).toBe(true)
			expect(new ReadonlySharedStyleMap().equals(new ReadonlySharedStyleMap())).toBe(true)
		})

		it('is false when sizes differ', () => {
			const a = new ReadonlySharedStyleMap([[colorProp, { type: 'shared', value: 'red' }]])
			const b = new ReadonlySharedStyleMap([
				[colorProp, { type: 'shared', value: 'red' }],
				[sizeProp, { type: 'mixed' }],
			])
			expect(a.equals(b)).toBe(false)
			expect(b.equals(a)).toBe(false)
		})

		it('is false when a shared value differs', () => {
			const a = new ReadonlySharedStyleMap([[colorProp, { type: 'shared', value: 'red' }]])
			const b = new ReadonlySharedStyleMap([[colorProp, { type: 'shared', value: 'blue' }]])
			expect(a.equals(b)).toBe(false)
		})

		it('is false when one side is mixed and the other is shared', () => {
			const a = new ReadonlySharedStyleMap([[colorProp, { type: 'mixed' }]])
			const b = new ReadonlySharedStyleMap([[colorProp, { type: 'shared', value: 'red' }]])
			expect(a.equals(b)).toBe(false)
			expect(b.equals(a)).toBe(false)
		})

		it('is false when the same number of entries have different keys', () => {
			const a = new ReadonlySharedStyleMap([[colorProp, { type: 'mixed' }]])
			const b = new ReadonlySharedStyleMap([[sizeProp, { type: 'mixed' }]])
			expect(a.equals(b)).toBe(false)
		})
	})
})

describe('SharedStyleMap', () => {
	it('set overwrites an existing entry', () => {
		const map = new SharedStyleMap()
		map.set(colorProp, { type: 'shared', value: 'red' })
		map.set(colorProp, { type: 'shared', value: 'blue' })
		expect(map.size).toBe(1)
		expect(map.get(colorProp)).toEqual({ type: 'shared', value: 'blue' })
	})

	describe('applyValue', () => {
		it('records the first value as shared', () => {
			const map = new SharedStyleMap()
			map.applyValue(colorProp, 'red')
			expect(map.get(colorProp)).toEqual({ type: 'shared', value: 'red' })
		})

		it('stays shared when the same value is applied again', () => {
			const map = new SharedStyleMap()
			map.applyValue(colorProp, 'red')
			map.applyValue(colorProp, 'red')
			expect(map.get(colorProp)).toEqual({ type: 'shared', value: 'red' })
		})

		it('becomes mixed when a different value is applied', () => {
			const map = new SharedStyleMap()
			map.applyValue(colorProp, 'red')
			map.applyValue(colorProp, 'blue')
			expect(map.get(colorProp)).toEqual({ type: 'mixed' })
			expect(map.getAsKnownValue(colorProp)).toBeUndefined()
		})

		it('stays mixed once mixed, even if the original value is applied again', () => {
			const map = new SharedStyleMap()
			map.applyValue(colorProp, 'red')
			map.applyValue(colorProp, 'blue')
			map.applyValue(colorProp, 'red')
			expect(map.get(colorProp)).toEqual({ type: 'mixed' })
		})

		it('tracks props independently', () => {
			const map = new SharedStyleMap()
			map.applyValue(colorProp, 'red')
			map.applyValue(colorProp, 'blue')
			map.applyValue(sizeProp, 'm')
			map.applyValue(weightProp, 2)
			map.applyValue(weightProp, 2)
			expect(Array.from(map.entries())).toEqual([
				[colorProp, { type: 'mixed' }],
				[sizeProp, { type: 'shared', value: 'm' }],
				[weightProp, { type: 'shared', value: 2 }],
			])
		})

		it('compares values by identity, so equal objects become mixed', () => {
			const objProp = StyleProp.define('test:obj', {
				defaultValue: { a: 1 },
				type: T.object({ a: T.number }),
			})
			const map = new SharedStyleMap()
			map.applyValue(objProp, { a: 1 })
			map.applyValue(objProp, { a: 1 })
			expect(map.get(objProp)).toEqual({ type: 'mixed' })
		})
	})
})
