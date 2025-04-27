import { sleep } from './control'

/** @internal */
export class ExecutionQueue {
	private queue: (() => Promise<any>)[] = []
	private running = false

	constructor(private readonly timeout?: number) {}

	isEmpty() {
		return this.queue.length === 0 && !this.running
	}

	private async run() {
		if (this.running) return
		try {
			this.running = true
			while (this.queue.length) {
				const task = this.queue.shift()!
				await task()
				if (this.timeout) {
					await sleep(this.timeout)
				}
			}
		} finally {
			// this try/finally should not be needed because the tasks don't throw
			// but better safe than sorry
			this.running = false
		}
	}

	async push<T>(task: () => T): Promise<Awaited<T>> {
		return new Promise<Awaited<T>>((resolve, reject) => {
			this.queue.push(() => Promise.resolve(task()).then(resolve).catch(reject))
			this.run()
		})
	}

	close() {
		this.queue = []
	}
}
