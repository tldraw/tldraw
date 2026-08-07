import { vi } from 'vitest'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { EffectScheduler, react, reactor } from '../EffectScheduler'
import { advanceGlobalEpoch, transact } from '../transactions'
import { RESET_VALUE } from '../types'

// Tests for SPEC.md §9 (effects: EffectScheduler, react, reactor).
// Rule IDs like [E3] in test names refer to that document.

describe('react (E)', () => {
	it('[E1] runs immediately, re-runs on changes, and stops when unsubscribed', () => {
		const a = atom('', 234)

		let val = 0
		const stop = react('', () => {
			val = a.get()
		})

		expect(val).toBe(234)

		a.set(939)

		expect(val).toBe(939)

		stop()

		a.set(2342)

		expect(val).toBe(939)
		expect(a.get()).toBe(2342)
	})

	it('[E1] detaches from its parents when stopped', () => {
		const a = atom('', 1)

		const rfn = vi.fn(() => {
			a.get()
		})
		const stop = react('', rfn)

		expect(a.children.isEmpty).toBe(false)

		a.set(8)

		expect(rfn).toHaveBeenCalledTimes(2)

		stop()

		expect(a.children.isEmpty).toBe(true)

		a.set(2)
		a.set(3)

		expect(rfn).toHaveBeenCalledTimes(2)
	})

	it('[E4] does not re-run when a parent is set to an equal value', () => {
		const a = atom('', 'x')
		const effect = vi.fn(() => {
			a.get()
		})
		const stop = react('', effect)

		expect(effect).toHaveBeenCalledTimes(1)

		a.set('x')

		expect(effect).toHaveBeenCalledTimes(1)
		stop()
	})

	it('[E4] does not re-run when a computed parent recomputes to an equal value', () => {
		const a = atom('', 1.2)
		const floored = computed('', () => Math.floor(a.get()))
		const effect = vi.fn(() => {
			floored.get()
		})
		const stop = react('', effect)

		expect(effect).toHaveBeenCalledTimes(1)

		a.set(1.5)

		expect(effect).toHaveBeenCalledTimes(1)

		a.set(2.3)

		expect(effect).toHaveBeenCalledTimes(2)
		stop()
	})

	it('[E5] passes the epoch of the previous run, enabling incremental effects', () => {
		const a = atom('', 1, { historyLength: 5, computeDiff: (a, b) => b - a })

		const collected: Array<number[] | RESET_VALUE> = []
		const stop = react('', (lastReactedEpoch) => {
			collected.push(a.getDiffSince(lastReactedEpoch))
		})

		// the first run has no previous epoch, so the effect must initialize from scratch
		expect(collected).toEqual([RESET_VALUE])

		a.set(3)
		expect(collected).toEqual([RESET_VALUE, [+2]])

		a.set(6)
		expect(collected).toEqual([RESET_VALUE, [+2], [+3]])

		stop()
	})
})

describe('reactor (E)', () => {
	it('[E2] can be started and stopped', () => {
		const a = atom('', 1)
		const r = reactor('', () => {
			a.get()
		})
		expect(r.scheduler.isActivelyListening).toBe(false)
		r.start()
		expect(r.scheduler.isActivelyListening).toBe(true)
		r.stop()
		expect(r.scheduler.isActivelyListening).toBe(false)
		r.start()
		expect(r.scheduler.isActivelyListening).toBe(true)
	})

	it('[E2] start() does not re-run the effect if nothing changed while stopped', () => {
		const a = atom('', 1)

		const rfn = vi.fn(() => {
			a.get()
		})

		const r = reactor('', rfn)
		r.start()

		expect(rfn).toHaveBeenCalledTimes(1)

		r.stop()

		r.start()

		expect(rfn).toHaveBeenCalledTimes(1)
	})

	it('[E2] start() re-runs the effect if a parent changed while stopped', () => {
		const a = atom('', 1)

		const rfn = vi.fn(() => {
			a.get()
		})

		const r = reactor('', rfn)
		r.start()

		expect(rfn).toHaveBeenCalledTimes(1)

		r.stop()
		a.set(2)

		r.start()

		expect(rfn).toHaveBeenCalledTimes(2)
	})

	it('[E2] start({force: true}) re-runs the effect even if nothing has changed', () => {
		const a = atom('', 1)

		const rfn = vi.fn(() => {
			a.get()
		})

		const r = reactor('', rfn)
		r.start()

		expect(rfn).toHaveBeenCalledTimes(1)

		r.stop()

		r.start({ force: true })

		expect(rfn).toHaveBeenCalledTimes(2)
	})

	it('[E3] runs once per state change, even when several of its parents changed', () => {
		const atomA = atom('', 1)
		const atomB = atom('', 1)

		const rfn = vi.fn(() => {
			atomA.get()
			atomB.get()
		})
		const r = reactor('', rfn)

		r.start()
		expect(rfn).toHaveBeenCalledTimes(1)

		transact(() => {
			atomA.set(2)
			atomB.set(2)
		})

		expect(rfn).toHaveBeenCalledTimes(2)
	})

	it('[E9] maybeScheduleEffect is a no-op when the reactor is stopped', () => {
		const a = atom('', 1)
		const rfn = vi.fn(() => {
			a.get()
		})
		const r = reactor('', rfn)

		r.scheduler.maybeScheduleEffect()

		expect(rfn).not.toHaveBeenCalled()
	})

	it('[E9] maybeScheduleEffect is a no-op when the parents have not changed', () => {
		const a = atom('', 1)
		const rfn = vi
			.fn(() => {
				a.get()
			})
			.mockName('rfn')
		const r = reactor('', rfn)

		r.start()
		expect(rfn).toHaveBeenCalledTimes(1)

		advanceGlobalEpoch()
		r.scheduler.maybeScheduleEffect()
		expect(rfn).toHaveBeenCalledTimes(1)
	})
})

describe('custom scheduling (E6, E7)', () => {
	it('[E6] a custom scheduleEffect decouples scheduling from execution', () => {
		const a = atom('', 1)
		const scheduled: Array<() => void> = []
		let runs = 0

		react(
			'',
			() => {
				a.get()
				runs++
			},
			{
				scheduleEffect: (execute) => {
					scheduled.push(execute)
				},
			}
		)

		// the initial run of react() is also routed through scheduleEffect
		expect(scheduled).toHaveLength(1)
		expect(runs).toBe(0)

		scheduled.shift()!()
		expect(runs).toBe(1)

		a.set(2)

		expect(scheduled).toHaveLength(1)
		expect(runs).toBe(1)

		scheduled.shift()!()
		expect(runs).toBe(2)
	})

	it('[E6] reactor.start() with a custom scheduler only schedules, it does not execute', () => {
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

	it('[E6] scheduleCount counts scheduling events even if the effect never executes', () => {
		const a = atom('a', 1)
		let numReactions = 0
		let numSchedules = 0
		const scheduler = new EffectScheduler(
			'test',
			() => {
				a.get()
				numReactions++
			},
			{
				scheduleEffect: () => {
					numSchedules++
				},
			}
		)
		scheduler.attach()
		scheduler.execute()

		expect(scheduler.scheduleCount).toBe(0)
		expect(numSchedules).toBe(0)
		expect(numReactions).toBe(1)

		a.set(2)

		expect(scheduler.scheduleCount).toBe(1)
		expect(numSchedules).toBe(1)
		expect(numReactions).toBe(1)

		a.set(3)

		expect(scheduler.scheduleCount).toBe(2)
		expect(numSchedules).toBe(2)
		expect(numReactions).toBe(1)
	})

	it('[E7] a deferred execute callback is a no-op if the effect was detached in the meantime', () => {
		const a = atom('a', 1)
		const scheduled: Array<() => void> = []
		let runs = 0

		const r = reactor(
			'',
			() => {
				a.get()
				runs++
			},
			{
				scheduleEffect: (execute) => {
					scheduled.push(execute)
				},
			}
		)
		r.start()
		scheduled.shift()!()
		expect(runs).toBe(1)

		a.set(2)
		expect(scheduled).toHaveLength(1)

		r.stop()
		scheduled.shift()!()

		expect(runs).toBe(1)
	})
})

describe('EffectScheduler attach/detach (E8)', () => {
	it('[E8] retains parents across detach/attach without re-running if nothing changed', () => {
		const a = atom('a', 1)
		let numReactions = 0
		const scheduler = new EffectScheduler('test', () => {
			a.get()
			numReactions++
		})
		scheduler.attach()
		scheduler.execute()
		expect(numReactions).toBe(1)
		a.set(2)
		expect(numReactions).toBe(2)
		scheduler.detach()
		expect(numReactions).toBe(2)
		scheduler.attach()
		expect(numReactions).toBe(2)
		a.set(3)
		expect(numReactions).toBe(3)
	})

	it('[E8] does not observe changes while detached, but sees them after re-attaching and executing', () => {
		const a = atom('a', 1)
		let numReactions = 0
		const scheduler = new EffectScheduler('test', () => {
			a.get()
			numReactions++
		})
		scheduler.attach()
		scheduler.execute()
		expect(numReactions).toBe(1)
		a.set(2)
		expect(numReactions).toBe(2)
		scheduler.detach()
		a.set(3)
		expect(numReactions).toBe(2)
		scheduler.attach()
		scheduler.execute()
		expect(numReactions).toBe(3)
		a.set(4)
		expect(numReactions).toBe(4)
	})
})
