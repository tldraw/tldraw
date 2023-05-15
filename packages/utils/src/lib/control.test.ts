import { once } from './control'

describe('@once', () => {
	it('should evaluate the function only once per instance', () => {
		class A {
			@once get cat() {
				return Math.random()
			}
			@once get dog() {
				return Math.random()
			}
		}

		const a = new A()
		const b = new A()

		expect(a.cat).toBe(a.cat)
		expect(a.dog).toBe(a.dog)
		expect(a.cat).not.toBe(a.dog)
		expect(a.cat).not.toBe(b.cat)
	})
})
