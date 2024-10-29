import { atom } from '../Atom'
import { computed } from '../Computed'
import { react } from '../EffectScheduler'
import { transact, transaction } from '../transactions'

describe('transactions', () => {
	it('should be abortable', () => {
		const firstName = atom('', 'John')
		const lastName = atom('', 'Doe')

		let numTimesComputed = 0
		const fullName = computed('', () => {
			numTimesComputed++
			return `${firstName.get()} ${lastName.get()}`
		})

		let numTimesReacted = 0
		let name = ''

		react('', () => {
			name = fullName.get()
			numTimesReacted++
		})

		expect(numTimesReacted).toBe(1)
		expect(numTimesComputed).toBe(1)
		expect(name).toBe('John Doe')

		transaction((rollback) => {
			firstName.set('Wilbur')
			expect(numTimesComputed).toBe(1)
			expect(numTimesReacted).toBe(1)
			expect(name).toBe('John Doe')
			lastName.set('Jones')
			expect(numTimesComputed).toBe(1)
			expect(numTimesReacted).toBe(1)
			expect(name).toBe('John Doe')
			expect(fullName.get()).toBe('Wilbur Jones')

			expect(numTimesComputed).toBe(2)
			expect(numTimesReacted).toBe(1)
			expect(name).toBe('John Doe')

			rollback()
		})

		// computes again
		expect(numTimesComputed).toBe(3)
		expect(numTimesReacted).toBe(2)

		expect(fullName.get()).toBe('John Doe')
		expect(name).toBe('John Doe')
	})

	it('nested rollbacks work as expected', () => {
		const atomA = atom('', 0)
		const atomB = atom('', 0)

		transaction((rollback) => {
			atomA.set(1)
			atomB.set(-1)
			transaction((rollback) => {
				atomA.set(2)
				atomB.set(-2)
				transaction((rollback) => {
					atomA.set(3)
					atomB.set(-3)
					rollback()
				})
				rollback()
			})
			rollback()
		})

		expect(atomA.get()).toBe(0)
		expect(atomB.get()).toBe(0)

		transaction((rollback) => {
			atomA.set(1)
			atomB.set(-1)
			transaction((rollback) => {
				atomA.set(2)
				atomB.set(-2)
				transaction(() => {
					atomA.set(3)
					atomB.set(-3)
				})
				rollback()
			})
			rollback()
		})

		expect(atomA.get()).toBe(0)
		expect(atomB.get()).toBe(0)

		transaction((rollback) => {
			atomA.set(1)
			atomB.set(-1)
			transaction(() => {
				atomA.set(2)
				atomB.set(-2)
				transaction(() => {
					atomA.set(3)
					atomB.set(-3)
				})
			})
			rollback()
		})

		expect(atomA.get()).toBe(0)
		expect(atomB.get()).toBe(0)

		transaction(() => {
			atomA.set(1)
			atomB.set(-1)
			transaction((rollback) => {
				atomA.set(2)
				atomB.set(-2)
				transaction((rollback) => {
					atomA.set(3)
					atomB.set(-3)
					rollback()
				})
				rollback()
			})
		})

		expect(atomA.get()).toBe(1)
		expect(atomB.get()).toBe(-1)

		transaction(() => {
			atomA.set(1)
			atomB.set(-1)
			transaction(() => {
				atomA.set(2)
				atomB.set(-2)
				transaction((rollback) => {
					atomA.set(3)
					atomB.set(-3)
					rollback()
				})
			})
		})

		expect(atomA.get()).toBe(2)
		expect(atomB.get()).toBe(-2)
	})

	it('should restore the original even if an inner commits', () => {
		const a = atom('', 'a')

		transaction((rollback) => {
			transaction(() => {
				a.set('b')
			})
			rollback()
		})

		expect(a.get()).toBe('a')
	})
})

describe('transact', () => {
	it('executes things in a transaction', () => {
		const a = atom('', 'a')

		try {
			transact(() => {
				a.set('b')
				throw new Error('blah')
			})
		} catch (e: any) {
			expect(e.message).toBe('blah')
		}

		expect(a.get()).toBe('a')

		expect.assertions(2)
	})

	it('does not create nested transactions', () => {
		const a = atom('', 'a')

		transact(() => {
			a.set('b')

			try {
				transact(() => {
					a.set('c')
					throw new Error('blah')
				})
			} catch (e: any) {
				expect(e.message).toBe('blah')
			}
			expect(a.get()).toBe('c')
		})

		expect(a.get()).toBe('c')

		expect.assertions(3)
	})
})

describe('setting atoms during a reaction', () => {
	it('should work', () => {
		const a = atom('', 0)
		const b = atom('', 0)

		react('', () => {
			b.set(a.get() + 1)
		})

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(1)
	})

	it('should throw an error if it gets into a loop', () => {
		expect(() => {
			const a = atom('', 0)

			react('', () => {
				a.set(a.get() + 1)
			})
		}).toThrowErrorMatchingInlineSnapshot(`"Reaction update depth limit exceeded"`)
	})

	it('should work with a transaction running', () => {
		const a = atom('', 0)

		react('', () => {
			transact(() => {
				if (a.get() < 10) {
					a.set(a.get() + 1)
				}
			})
		})

		expect(a.get()).toBe(10)
	})

	it('[regression 1] should allow computeds to be updated properly', () => {
		const a = atom('', 0)
		const b = atom('', 0)
		const c = computed('', () => b.get() * 2)

		let cValue = 0

		react('', () => {
			b.set(a.get() + 1)
			cValue = c.get()
		})

		expect(a.get()).toBe(0)
		expect(b.get()).toBe(1)
		expect(cValue).toBe(2)

		transact(() => {
			a.set(1)
		})
		expect(cValue).toBe(4)
	})

	it('[regression 2] should allow computeds to be updated properly', () => {
		const a = atom('', 0)
		const b = atom('', 1)
		const c = atom('', 0)
		const d = computed('', () => a.get() * 2)

		let dValue = 0
		react('', () => {
			// update a, causes a and d to be traversed (but not updated)
			a.set(b.get())
			// update c
			c.set(a.get())
			// make sure that when we get d, it is updated properly
			dValue = d.get()
		})

		expect(a.get()).toBe(1)
		expect(b.get()).toBe(1)
		expect(c.get()).toBe(1)

		expect(dValue).toBe(2)

		transact(() => {
			b.set(2)
		})
		expect(dValue).toBe(4)
	})
})

test('it should be possible to run a transaction during a reaction', () => {
	const a = atom('', 0)
	const b = atom('', 0)

	react('', () => {
		transaction(() => {
			b.set(a.get() + 1)
		})
	})

	expect(a.get()).toBe(0)
	expect(b.get()).toBe(1)

	a.set(1)

	expect(b.get()).toBe(2)

	transaction(() => {
		a.set(2)
		expect(b.get()).toBe(2)
	})

	expect(b.get()).toBe(3)
})

test('it should be possible to abort a transaction during a reaction', () => {
	const a = atom('', 0)
	const b = atom('', 0)

	const unsub = react('', () => {
		transaction((rollback) => {
			b.set(a.get() + 1)
			rollback()
		})
		expect(b.get()).toBe(0)
	})

	expect(a.get()).toBe(0)
	expect(b.get()).toBe(0)

	unsub()

	react('', () => {
		transaction(() => {
			b.set(3)
			try {
				transaction(() => {
					b.set(a.get() + 1)
					throw new Error('oops')
				})
			} catch (e: any) {
				expect(e.message).toBe('oops')
			} finally {
				expect(b.get()).toBe(3)
			}
		})
		expect(b.get()).toBe(3)
	})

	expect(a.get()).toBe(0)
	expect(b.get()).toBe(3)

	expect.assertions(8)
})

it('should defer all side effects until the end of the outer transaction', () => {
	const a = atom('', 0)
	const b = atom('', 0)
	const c = atom('', 0)

	const aChanged = jest.fn()
	const bChanged = jest.fn()
	const cChanged = jest.fn()

	react('', () => {
		a.get()
		aChanged()
	})

	react('', () => {
		transaction(() => {
			a.set(b.get() + 1)
		})
		bChanged()
	})

	react('', () => {
		transaction(() => {
			b.set(c.get() + 1)
		})
		cChanged()
	})

	expect(aChanged).toHaveBeenCalledTimes(3)
	expect(bChanged).toHaveBeenCalledTimes(2)
	expect(cChanged).toHaveBeenCalledTimes(1)

	expect(a.__unsafe__getWithoutCapture()).toBe(2)

	cChanged.mockImplementationOnce(() => {
		// b was .set() during c's reaction
		expect(b.__unsafe__getWithoutCapture()).toBe(2)
		// a was not yet set because the effect was deferred
		// util the end of the reaction
		expect(a.__unsafe__getWithoutCapture()).toBe(2)
	})

	c.set(1)

	expect(a.__unsafe__getWithoutCapture()).toBe(3)
	expect(cChanged).toHaveBeenCalledTimes(2)
})
