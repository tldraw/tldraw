import { vi } from 'vitest'
import { atom } from '../Atom'
import { whyAmIRunning } from '../capture'
import { computed } from '../Computed'
import { react, reactor } from '../EffectScheduler'

// Tests for SPEC.md §13 (debugging aids).
// Rule IDs like [D2] in test names refer to that document.

describe('whyAmIRunning (D)', () => {
	it('[D2] throws when called outside of a reactive context', () => {
		expect(() => whyAmIRunning()).toThrow('whyAmIRunning() called outside of a reactive context')
	})

	it('[D3] logs which ancestor atoms caused an effect to run', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		const name = atom('name', 'Bob')
		const stop = react('greeting', () => {
			whyAmIRunning()
			name.get()
		})

		expect(log).not.toHaveBeenCalled()

		name.set('Alice')

		expect(log).toHaveBeenCalledTimes(1)
		expect(log.mock.calls[0][0]).toContain('Effect(greeting) is executing because:')
		expect(log.mock.calls[0][0]).toContain('Atom(name) changed')

		stop()
		log.mockRestore()
	})

	it('[D3] logs which ancestors caused a computed to recompute, including nested computeds', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		const a = atom('a', 1)
		const double = computed('double', () => a.get() * 2)
		const quadruple = computed('quadruple', () => {
			whyAmIRunning()
			return double.get() * 2
		})

		const stop = react('r', () => {
			quadruple.get()
		})

		expect(log).not.toHaveBeenCalled()

		a.set(2)

		expect(log).toHaveBeenCalledTimes(1)
		expect(log.mock.calls[0][0]).toContain('Computed(quadruple) is recomputing because:')
		expect(log.mock.calls[0][0]).toContain('Computed(double) changed')
		expect(log.mock.calls[0][0]).toContain('Atom(a) changed')

		stop()
		log.mockRestore()
	})

	it('[D3] logs that an effect was executed manually when no ancestors changed', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		const a = atom('a', 1)
		const r = reactor('manual', () => {
			whyAmIRunning()
			a.get()
		})

		r.start()
		expect(log).not.toHaveBeenCalled()

		r.stop()
		r.start({ force: true })

		expect(log).toHaveBeenCalledTimes(1)
		expect(log.mock.calls[0][0]).toContain('Effect(manual) was executed manually.')

		r.stop()
		log.mockRestore()
	})
})
