import { atom } from '../Atom'
import { EffectScheduler } from '../EffectScheduler'

describe(EffectScheduler, () => {
	test('when you detatch and reattach, it retains the parents without rerunning', () => {
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

	test('when you detatch and reattach, it retains the parents while rerunning if the parent has changed', () => {
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

	test('when an effect is scheduled it increments a schedule count, even if the effect never runs', () => {
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
})
