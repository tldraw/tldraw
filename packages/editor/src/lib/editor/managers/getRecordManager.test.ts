import { atom } from '@tldraw/state'
import { getAtomManager } from './getRecordManager'

describe('atom manager', () => {
	it('manages an atom object', () => {
		const cb = jest.fn()
		const A = atom('abc', { a: 1, b: 2, c: 3 })
		const manager = getAtomManager(A, cb)

		expect(A.lastChangedEpoch).toBe(0)

		manager.a = 2
		expect(manager.a).toBe(2)
		expect(A.lastChangedEpoch).toBe(1)

		manager.b = 4
		expect(manager.b).toBe(4)
		expect(A.lastChangedEpoch).toBe(2)

		manager.b
		expect(A.get()).toMatchObject({ a: 2, b: 4, c: 3 })

		expect(cb).toHaveBeenCalledTimes(2)
	})
})
