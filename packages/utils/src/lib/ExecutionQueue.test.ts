import { ExecutionQueue } from './ExecutionQueue'
import { promiseWithResolve } from './control'

const tick = () => Promise.resolve()

describe('ExecutionQueue', () => {
	it('creates a function that runs some async function when invoked', async () => {
		const queue = new ExecutionQueue(10)
		let numExecutions = 0

		await queue.push(async () => {
			numExecutions++
		})

		expect(numExecutions).toBe(1)

		// push without awaiting
		queue.push(async () => {
			numExecutions++
		})

		expect(numExecutions).toBe(1)

		// push a new task and wait for it to finish
		await queue.push(tick)

		expect(numExecutions).toBe(2)
	})

	it('allows returning a value', async () => {
		const queue = new ExecutionQueue(10)

		const value = await queue.push(async () => {
			return 'ok'
		})
		expect(value).toBe('ok')
	})

	it('will queue up a second invocation if invoked while executing', async () => {
		const completions: string[] = []
		const promise = promiseWithResolve()
		const queue = new ExecutionQueue(10)

		const persistPromiseA = queue.push(async () => {
			await promise
			completions.push('A')
		})

		const persistPromiseB = queue.push(async () => {
			completions.push('B')
		})

		await tick()
		expect(completions).toEqual([])
		await tick()
		expect(completions).toEqual([])

		// nothing happens until we resolve the promise
		promise.resolve(undefined)
		await persistPromiseA
		expect(completions).toEqual(['A'])
		await persistPromiseB
		expect(completions).toEqual(['A', 'B'])
	})

	it('will throw in the event of an error', async () => {
		const queue = new ExecutionQueue()
		const promise = promiseWithResolve()

		const result = queue.push(async () => {
			await promise
		})

		promise.reject(new Error('oh no'))

		await expect(result).rejects.toThrow('oh no')
	})
})
