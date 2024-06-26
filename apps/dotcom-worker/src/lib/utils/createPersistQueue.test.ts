import { createPersistQueue } from './createPersistQueue'

const tick = () => Promise.resolve()

const resolvable = () => {
	let resolve: () => void = () => {
		//noop
	}
	const promise = new Promise<void>((_r) => {
		resolve = _r
	})
	return { promise, resolve }
}

describe('createPersistQueue', () => {
	it('creates a function that runs some async function when invoked', async () => {
		let numExecutions = 0
		const persist = createPersistQueue(async () => {
			numExecutions++
		}, 10)

		expect(numExecutions).toBe(0)
		await tick()
		// nothing happens until we call the function
		expect(numExecutions).toBe(0)

		await persist()
		expect(numExecutions).toBe(1)

		await tick()
		expect(numExecutions).toBe(1)
	})

	it('will queue up a second invocation if invoked while executing', async () => {
		let numExecutions = 0
		const { promise, resolve } = resolvable()
		const persist = createPersistQueue(async () => {
			await promise
			numExecutions++
		}, 10)

		const persistPromiseA = persist()
		await tick()
		expect(numExecutions).toBe(0)
		persist()
		persist()
		const persistPromiseB = persist()
		await tick()
		expect(numExecutions).toBe(0)

		// nothing happens until we resolve the promise
		resolve!()
		await persistPromiseA
		expect(numExecutions).toBe(2)
		await persistPromiseB
		expect(numExecutions).toBe(2)
	})
})
