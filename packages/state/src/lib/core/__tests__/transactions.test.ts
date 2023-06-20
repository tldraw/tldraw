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
			return `${firstName.value} ${lastName.value}`
		})

		let numTimesReacted = 0
		let name = ''

		react('', () => {
			name = fullName.value
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
			expect(fullName.value).toBe('Wilbur Jones')

			expect(numTimesComputed).toBe(2)
			expect(numTimesReacted).toBe(1)
			expect(name).toBe('John Doe')

			rollback()
		})

		// computes again
		expect(numTimesComputed).toBe(3)
		expect(numTimesReacted).toBe(2)

		expect(fullName.value).toBe('John Doe')
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

		expect(atomA.value).toBe(0)
		expect(atomB.value).toBe(0)

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

		expect(atomA.value).toBe(0)
		expect(atomB.value).toBe(0)

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

		expect(atomA.value).toBe(0)
		expect(atomB.value).toBe(0)

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

		expect(atomA.value).toBe(1)
		expect(atomB.value).toBe(-1)

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

		expect(atomA.value).toBe(2)
		expect(atomB.value).toBe(-2)
	})

	it('should restore the original even if an inner commits', () => {
		const a = atom('', 'a')

		transaction((rollback) => {
			transaction(() => {
				a.set('b')
			})
			rollback()
		})

		expect(a.value).toBe('a')
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

		expect(a.value).toBe('a')

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
			expect(a.value).toBe('c')
		})

		expect(a.value).toBe('c')

		expect.assertions(3)
	})
})
