import { describe, expect, it } from 'vitest'
import { MAX_R2_CONNECTIONS, R2ConnectionQueue } from './libraryStorage'

describe('R2ConnectionQueue', () => {
	it('holds at most its connections at once, two for each copy, starting operations in order', async () => {
		const r2 = new R2ConnectionQueue()
		let open = 0
		let mostOpen = 0
		const started: string[] = []
		const operation = (name: string, connections: 1 | 2) =>
			r2.run(connections, async () => {
				started.push(name)
				open += connections
				mostOpen = Math.max(mostOpen, open)
				await new Promise((resolve) => setTimeout(resolve, 5))
				open -= connections
				return name
			})

		const results = await Promise.all([
			operation('copy 1', 2),
			operation('put 1', 1),
			operation('copy 2', 2),
			operation('put 2', 1),
			operation('put 3', 1),
			operation('copy 3', 2),
		])

		expect(results).toEqual(['copy 1', 'put 1', 'copy 2', 'put 2', 'put 3', 'copy 3'])
		expect(started).toEqual(results)
		expect(mostOpen).toBe(MAX_R2_CONNECTIONS)
	})

	it('frees an operation’s connections when it fails', async () => {
		const r2 = new R2ConnectionQueue()
		await expect(
			r2.run(2, async () => {
				throw new Error('R2 failed')
			})
		).rejects.toThrow('R2 failed')
		let open = 0
		let mostOpen = 0
		const copy = () =>
			r2.run(2, async () => {
				open += 2
				mostOpen = Math.max(mostOpen, open)
				await new Promise((resolve) => setTimeout(resolve, 5))
				open -= 2
			})
		await Promise.all([copy(), copy()])
		expect(mostOpen).toBe(MAX_R2_CONNECTIONS)
	})
})
