import { vi } from 'vitest'
import { atom } from '../Atom'
import { reactor } from '../EffectScheduler'
import { transact } from '../transactions'

describe('reactors', () => {
	it('prevents infinite update loops', () => {
		const a = atom('', 1)
		const r = reactor('', () => {
			if (a.get() < +Infinity) {
				a.update((a) => a + 1)
			}
		})
		expect(() => r.start()).toThrowErrorMatchingInlineSnapshot(
			`[Error: Reaction update depth limit exceeded]`
		)
	})

	it('batches multiple atom updates in transactions', () => {
		const atomA = atom('', 1)
		const atomB = atom('', 1)

		const react = vi.fn(() => {
			atomA.get()
			atomB.get()
		})
		const r = reactor('', react)

		r.start()
		expect(react).toHaveBeenCalledTimes(1)

		transact(() => {
			atomA.set(2)
			atomB.set(2)
		})

		expect(react).toHaveBeenCalledTimes(2)
	})

	it('manages parent-child dependencies during start/stop lifecycle', () => {
		const a = atom('', 1)

		const rfn = vi.fn(() => {
			a.get()
		})
		const r = reactor('', rfn)

		expect(a.children.isEmpty).toBe(true)

		r.start()

		expect(a.children.isEmpty).toBe(false)

		a.set(8)

		expect(rfn).toHaveBeenCalledTimes(2)

		r.stop()

		expect(a.children.isEmpty).toBe(true)
		expect(rfn).toHaveBeenCalledTimes(2)

		a.set(2)

		expect(rfn).toHaveBeenCalledTimes(2)
	})

	it('respects force option when restarting', () => {
		const a = atom('', 1)

		const rfn = vi.fn(() => {
			a.get()
		})

		const r = reactor('', rfn)
		r.start()

		expect(rfn).toHaveBeenCalledTimes(1)

		r.stop()

		// Without force, should not re-execute if nothing changed
		r.start()
		expect(rfn).toHaveBeenCalledTimes(1)

		r.stop()

		// With force, should re-execute even if nothing changed
		r.start({ force: true })
		expect(rfn).toHaveBeenCalledTimes(2)
	})

	it('integrates with custom effect schedulers', () => {
		let numSchedules = 0
		let numExecutes = 0

		const r = reactor(
			'',
			() => {
				numExecutes++
			},
			{
				scheduleEffect: () => {
					numSchedules++
				},
			}
		)
		r.start()

		expect(numSchedules).toBe(1)
		expect(numExecutes).toBe(0)
	})
})
