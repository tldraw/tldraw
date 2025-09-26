import { vi } from 'vitest'
import { atom } from '../Atom'
import { computed } from '../Computed'
import { EffectScheduler, react, reactor } from '../EffectScheduler'
import { advanceGlobalEpoch, transact } from '../transactions'

describe('EffectScheduler', () => {
	describe('constructor and basic properties', () => {
		it('accepts options with custom scheduleEffect function', () => {
			const effect = vi.fn()
			const customScheduler = vi.fn()
			const scheduler = new EffectScheduler('test', effect, {
				scheduleEffect: customScheduler,
			})

			scheduler.attach()
			scheduler.scheduleEffect()

			expect(customScheduler).toHaveBeenCalledTimes(1)
			expect(customScheduler).toHaveBeenCalledWith(scheduler.maybeExecute)
		})
	})

	describe('attach and detach', () => {
		test('when you detach and reattach, it retains the parents without rerunning', () => {
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

		test('when you detach and reattach, it retains the parents while rerunning if the parent has changed', () => {
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

		it('properly attaches and detaches from parent signals', () => {
			const a = atom('a', 1)
			const scheduler = new EffectScheduler('test', () => a.get())

			scheduler.attach()
			scheduler.execute()

			// Should be attached to the atom
			expect(a.children.has(scheduler)).toBe(true)

			scheduler.detach()

			// Should be detached from the atom
			expect(a.children.has(scheduler)).toBe(false)
		})
	})

	describe('execute', () => {
		it('captures parents during execution', () => {
			const a = atom('a', 1)
			const scheduler = new EffectScheduler('test', () => {
				a.get()
			})

			scheduler.execute()

			expect(scheduler.parents.length).toBe(1)
			expect(scheduler.parents[0]).toBe(a)
		})

		it('captures multiple parents', () => {
			const a = atom('a', 1)
			const b = atom('b', 2)
			const scheduler = new EffectScheduler('test', () => {
				a.get()
				b.get()
			})

			scheduler.execute()

			expect(scheduler.parents.length).toBe(2)
			expect(scheduler.parents).toContain(a)
			expect(scheduler.parents).toContain(b)
		})

		it('captures parents even when effect throws', () => {
			const a = atom('a', 1)
			const scheduler = new EffectScheduler('test', () => {
				a.get()
				throw new Error('test error')
			})

			expect(() => scheduler.execute()).toThrow()
			// Parent should still be captured despite the error
			expect(scheduler.parents.length).toBe(1)
			expect(scheduler.parents[0]).toBe(a)
		})
	})

	describe('scheduleEffect', () => {
		it('uses custom scheduleEffect when provided', () => {
			const effect = vi.fn()
			const customScheduler = vi.fn()
			const scheduler = new EffectScheduler('test', effect, {
				scheduleEffect: customScheduler,
			})

			scheduler.scheduleEffect()

			expect(customScheduler).toHaveBeenCalledTimes(1)
			expect(customScheduler).toHaveBeenCalledWith(scheduler.maybeExecute)
			expect(effect).not.toHaveBeenCalled()
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

		it('deferred execution with custom scheduler works correctly', () => {
			let deferredExecutions: Array<() => void> = []
			const customScheduler = (execute: () => void) => {
				deferredExecutions.push(execute)
			}

			const effect = vi.fn()
			const scheduler = new EffectScheduler('test', effect, {
				scheduleEffect: customScheduler,
			})

			scheduler.scheduleEffect()

			// Effect should not have run yet
			expect(effect).not.toHaveBeenCalled()
			expect(deferredExecutions).toHaveLength(1)

			// Execute deferred function (this is maybeExecute)
			// First attach the scheduler so maybeExecute will work
			scheduler.attach()
			deferredExecutions[0]()

			expect(effect).toHaveBeenCalledTimes(1)
		})
	})

	describe('maybeExecute', () => {
		it('does not execute when not actively listening', () => {
			const effect = vi.fn()
			const scheduler = new EffectScheduler('test', effect)

			scheduler.maybeExecute()

			expect(effect).not.toHaveBeenCalled()
		})

		it('does not execute after detach', () => {
			const effect = vi.fn()
			const scheduler = new EffectScheduler('test', effect)

			scheduler.attach()
			scheduler.detach()
			scheduler.maybeExecute()

			expect(effect).not.toHaveBeenCalled()
		})
	})

	describe('maybeScheduleEffect', () => {
		it('schedules when epoch has advanced', () => {
			const a = atom('a', 1)
			const effect = vi.fn(() => a.get())
			const scheduler = new EffectScheduler('test', effect)

			scheduler.attach()
			scheduler.execute()
			a.set(2) // This advances the epoch and triggers maybeScheduleEffect

			expect(scheduler.scheduleCount).toBe(1)
		})

		it('does not schedule when parents have not changed', () => {
			const a = atom('a', 1)
			const effect = vi.fn(() => a.get())
			const scheduler = new EffectScheduler('test', effect)

			scheduler.attach()
			scheduler.execute()

			// Advance global epoch but don't change the atom
			advanceGlobalEpoch()
			scheduler.maybeScheduleEffect()

			expect(scheduler.scheduleCount).toBe(0)
		})
	})

	describe('dependency tracking', () => {
		it('tracks dependencies with computed values', () => {
			const a = atom('a', 1)
			const b = computed('b', () => a.get() * 2)
			let result = 0

			const scheduler = new EffectScheduler('test', () => {
				result = b.get()
			})

			scheduler.attach()
			scheduler.execute()

			expect(result).toBe(2)
			a.set(5)
			expect(result).toBe(10)
		})

		it('updates dependencies when effect function changes them', () => {
			const a = atom('a', 1)
			const b = atom('b', 2)
			let useA = true
			let result = 0

			const scheduler = new EffectScheduler('test', () => {
				result = useA ? a.get() : b.get()
			})

			scheduler.attach()
			scheduler.execute()

			expect(result).toBe(1)
			expect(scheduler.parents).toEqual([a])

			useA = false
			scheduler.execute()

			expect(result).toBe(2)
			expect(scheduler.parents).toEqual([b])
		})

		it('clears dependencies when none are accessed', () => {
			const a = atom('a', 1)
			let shouldRead = true

			const scheduler = new EffectScheduler('test', () => {
				if (shouldRead) {
					a.get()
				}
			})

			scheduler.attach()
			scheduler.execute()

			expect(scheduler.parents).toEqual([a])

			shouldRead = false
			scheduler.execute()

			expect(scheduler.parents).toEqual([])
		})

		it('handles complex dependency changes', () => {
			const a = atom('a', 1)
			const b = atom('b', 2)
			const c = atom('c', 3)
			let phase = 1

			const scheduler = new EffectScheduler('test', () => {
				if (phase === 1) {
					a.get()
				} else if (phase === 2) {
					b.get()
					c.get()
				} else {
					a.get()
					b.get()
				}
			})

			scheduler.attach()
			scheduler.execute()
			expect(scheduler.parents).toEqual([a])

			phase = 2
			scheduler.execute()
			expect(scheduler.parents.length).toBe(2)
			expect(scheduler.parents).toContain(b)
			expect(scheduler.parents).toContain(c)

			phase = 3
			scheduler.execute()
			expect(scheduler.parents.length).toBe(2)
			expect(scheduler.parents).toContain(a)
			expect(scheduler.parents).toContain(b)
		})

		it('tracks parent epochs correctly', () => {
			const a = atom('a', 1)
			const scheduler = new EffectScheduler('test', () => a.get())

			scheduler.attach()
			scheduler.execute()

			expect(scheduler.parentEpochs.length).toBe(1)
			expect(scheduler.parentEpochs[0]).toBe(a.lastChangedEpoch)

			a.set(2)
			expect(scheduler.parentEpochs[0]).toBe(a.lastChangedEpoch)
		})
	})

	describe('integration with transactions', () => {
		it('reacts to changes made inside transactions', () => {
			const a = atom('a', 1)
			const b = atom('b', 2)
			let reactions = 0

			const scheduler = new EffectScheduler('test', () => {
				a.get()
				b.get()
				reactions++
			})

			scheduler.attach()
			scheduler.execute()
			expect(reactions).toBe(1)

			transact(() => {
				a.set(10)
				b.set(20)
			})

			// Should only react once after transaction
			expect(reactions).toBe(2)
		})

		it('does not react to intermediate changes in transactions', () => {
			const a = atom('a', 1)
			let reactions = 0

			const scheduler = new EffectScheduler('test', () => {
				a.get()
				reactions++
			})

			scheduler.attach()
			scheduler.execute()
			expect(reactions).toBe(1)

			transact(() => {
				a.set(10)
				expect(reactions).toBe(1) // Should not react yet
				a.set(20)
				expect(reactions).toBe(1) // Still should not react
			})

			expect(reactions).toBe(2) // Now should react
		})

		it('handles nested effects within transactions', () => {
			const a = atom('a', 1)
			const b = atom('b', 2)
			let aReactions = 0
			let bReactions = 0

			const aScheduler = new EffectScheduler('a-effect', () => {
				a.get()
				aReactions++
			})

			const bScheduler = new EffectScheduler('b-effect', () => {
				b.get()
				bReactions++
			})

			aScheduler.attach()
			bScheduler.attach()
			aScheduler.execute()
			bScheduler.execute()

			expect(aReactions).toBe(1)
			expect(bReactions).toBe(1)

			transact(() => {
				a.set(10)
				b.set(20)
			})

			expect(aReactions).toBe(2)
			expect(bReactions).toBe(2)
		})
	})

	describe('error handling', () => {
		it('continues to work after effect throws', () => {
			const a = atom('a', 1)
			let shouldThrow = true
			let successCount = 0

			const scheduler = new EffectScheduler('test', () => {
				a.get()
				if (shouldThrow) {
					throw new Error('test error')
				}
				successCount++
			})

			scheduler.attach()
			expect(() => scheduler.execute()).toThrow('test error')

			shouldThrow = false
			scheduler.execute()

			expect(successCount).toBe(1)
		})

		it('maintains parent tracking after errors', () => {
			const a = atom('a', 1)
			const scheduler = new EffectScheduler('test', () => {
				a.get()
				throw new Error('test error')
			})

			scheduler.attach()
			expect(() => scheduler.execute()).toThrow()

			// Parent should still be tracked
			expect(scheduler.parents).toEqual([a])
			expect(scheduler.parentSet.has(a)).toBe(true)
		})
	})

	describe('performance and edge cases', () => {
		it('handles large numbers of dependencies', () => {
			const atoms = Array.from({ length: 100 }, (_, i) => atom(`atom-${i}`, i))
			const scheduler = new EffectScheduler('test', () => {
				return atoms.map((a) => a.get()).reduce((sum, val) => sum + val, 0)
			})

			scheduler.attach()
			const result = scheduler.execute()

			expect(result).toBe(4950) // Sum of 0-99
			expect(scheduler.parents.length).toBe(100)

			// Change one atom and verify reaction
			atoms[0].set(1000)
			expect(scheduler.scheduleCount).toBe(1)
		})

		it('maintains correct behavior with deeply nested computed values', () => {
			const a = atom('a', 1)
			const b = computed('b', () => a.get() * 2)
			const c = computed('c', () => b.get() * 3)
			const d = computed('d', () => c.get() * 4)

			let result = 0
			const scheduler = new EffectScheduler('test', () => {
				result = d.get()
			})

			scheduler.attach()
			scheduler.execute()

			expect(result).toBe(24) // 1 * 2 * 3 * 4

			a.set(2)
			expect(result).toBe(48) // 2 * 2 * 3 * 4
		})
	})
})

describe('react function', () => {
	it('creates and starts an effect scheduler', () => {
		const a = atom('a', 1)
		let result = 0

		const stop = react('test', () => {
			result = a.get()
		})

		expect(result).toBe(1)

		a.set(2)
		expect(result).toBe(2)

		stop()
		a.set(3)
		expect(result).toBe(2) // Should not update after stop
	})

	it('accepts custom scheduleEffect options', () => {
		const a = atom('a', 1)
		let result = 0
		let scheduled = false

		const stop = react(
			'test',
			() => {
				result = a.get()
			},
			{
				scheduleEffect: (execute) => {
					scheduled = true
					execute()
				},
			}
		)

		expect(result).toBe(1)
		expect(scheduled).toBe(true) // Initial execution DOES use custom scheduler in react()

		a.set(2)
		expect(result).toBe(2)

		stop()
	})
})

describe('reactor function and Reactor interface', () => {
	describe('reactor creation', () => {
		it('accepts options', () => {
			const customScheduler = vi.fn()
			const r = reactor('test', vi.fn(), {
				scheduleEffect: customScheduler,
			})

			r.start()
			r.scheduler.scheduleEffect()

			expect(customScheduler).toHaveBeenCalled()
		})
	})

	describe('start and stop', () => {
		it('can be restarted after stopping', () => {
			const a = atom('a', 1)
			let result = 0

			const r = reactor('test', () => {
				result = a.get()
			})

			r.start()
			expect(result).toBe(1)

			r.stop()
			a.set(2)
			expect(result).toBe(1)

			r.start()
			expect(result).toBe(2) // Should execute and get new value
		})

		it('handles multiple start calls gracefully', () => {
			const effect = vi.fn()
			const r = reactor('test', effect)

			r.start()
			expect(effect).toHaveBeenCalledTimes(1)

			r.start() // Should use maybeScheduleEffect, not execute immediately
			expect(effect).toHaveBeenCalledTimes(1) // Still only once since no dependencies changed
		})
	})

	describe('force option', () => {
		it('forces execution when start({ force: true })', () => {
			let executions = 0
			const r = reactor('test', () => {
				executions++
			})

			r.start()
			expect(executions).toBe(1)

			r.start() // Should not execute again
			expect(executions).toBe(1)

			r.start({ force: true }) // Should force execution
			expect(executions).toBe(2)
		})

		it('force: false behaves like default start', () => {
			let executions = 0
			const r = reactor('test', () => {
				executions++
			})

			r.start()
			expect(executions).toBe(1)

			r.start({ force: false })
			expect(executions).toBe(1)
		})

		it('force works correctly with dependencies', () => {
			const a = atom('a', 1)
			let result = 0

			const r = reactor('test', () => {
				result = a.get()
			})

			r.start()
			expect(result).toBe(1)

			r.stop()
			a.set(2)

			// Start without force - should execute because parent changed
			r.start({ force: false })
			expect(result).toBe(2)

			// Force should also work when parent hasn't changed
			r.start({ force: true })
			expect(result).toBe(2) // Value same but execution happened
		})
	})

	describe('integration scenarios', () => {
		it('works with transactions', () => {
			const a = atom('a', 1)
			const b = atom('b', 2)
			let executions = 0
			let lastSum = 0

			const r = reactor('test', () => {
				executions++
				lastSum = a.get() + b.get()
			})

			r.start()
			expect(executions).toBe(1)
			expect(lastSum).toBe(3)

			transact(() => {
				a.set(10)
				b.set(20)
			})

			expect(executions).toBe(2) // Only one execution after transaction
			expect(lastSum).toBe(30)
		})

		it('handles errors gracefully', () => {
			let shouldThrow = true
			let executions = 0

			const r = reactor('test', () => {
				executions++
				if (shouldThrow) {
					throw new Error('test error')
				}
			})

			expect(() => r.start()).toThrow('test error')
			expect(executions).toBe(1)

			shouldThrow = false
			r.start({ force: true })
			expect(executions).toBe(2)
		})

		it('maintains correct state across complex start/stop cycles', () => {
			const a = atom('a', 1)
			let result = 0

			const r = reactor('test', () => {
				result = a.get() * 10
			})

			// Start, verify execution
			r.start()
			expect(result).toBe(10)
			expect(r.scheduler.isActivelyListening).toBe(true)

			// Stop, change atom, verify no execution
			r.stop()
			expect(r.scheduler.isActivelyListening).toBe(false)
			a.set(2)
			expect(result).toBe(10)

			// Restart, should execute with new value
			r.start()
			expect(r.scheduler.isActivelyListening).toBe(true)
			expect(result).toBe(20)

			// Continue normal reactivity
			a.set(3)
			expect(result).toBe(30)
		})
	})
})
