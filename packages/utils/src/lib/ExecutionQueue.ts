import { sleep } from './control'

/**
 * A queue that executes tasks sequentially with optional delay between tasks.
 *
 * ExecutionQueue ensures that tasks are executed one at a time in the order they were added,
 * with an optional timeout delay between each task execution. This is useful for rate limiting,
 * preventing race conditions, or controlling the flow of asynchronous operations.
 *
 * @example
 * ```ts
 * // Create a queue with 100ms delay between tasks
 * const queue = new ExecutionQueue(100)
 *
 * // Add tasks to the queue
 * const result1 = await queue.push(() => fetch('/api/data'))
 * const result2 = await queue.push(async () => {
 *   const data = await processData()
 *   return data
 * })
 *
 * // Check if queue is empty
 * if (queue.isEmpty()) {
 *   console.log('All tasks completed')
 * }
 *
 * // Clean up
 * queue.close()
 * ```
 *
 * @internal
 */
export class ExecutionQueue {
	private queue: (() => Promise<any>)[] = []
	private running = false

	/**
	 * Creates a new ExecutionQueue.
	 *
	 * Creates a new execution queue that will process tasks sequentially.
	 * If a timeout is provided, there will be a delay between each task execution,
	 * which is useful for rate limiting or controlling execution flow.
	 *
	 * timeout - Optional delay in milliseconds between task executions
	 * @example
	 * ```ts
	 * // Create queue without delay
	 * const fastQueue = new ExecutionQueue()
	 *
	 * // Create queue with 500ms delay between tasks
	 * const slowQueue = new ExecutionQueue(500)
	 * ```
	 */
	constructor(private readonly timeout?: number) {}

	/**
	 * Checks if the queue is empty and not currently running a task.
	 *
	 * Determines whether the execution queue has completed all tasks and is idle.
	 * Returns true only when there are no pending tasks in the queue AND no task is currently being executed.
	 *
	 * @returns True if the queue has no pending tasks and is not currently executing
	 * @example
	 * ```ts
	 * const queue = new ExecutionQueue()
	 *
	 * console.log(queue.isEmpty()) // true - queue is empty
	 *
	 * queue.push(() => console.log('task'))
	 * console.log(queue.isEmpty()) // false - task is running/pending
	 * ```
	 */
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
			// console.log('\n\n\nrunning false\n\n\n')
			this.running = false
		}
	}

	/**
	 * Adds a task to the queue and returns a promise that resolves with the task's result.
	 *
	 * Enqueues a task for sequential execution. The task will be executed after all
	 * previously queued tasks have completed. If a timeout was specified in the constructor,
	 * there will be a delay between this task and the next one.
	 *
	 * @param task - The function to execute (can be sync or async)
	 * @returns Promise that resolves with the task's return value
	 * @example
	 * ```ts
	 * const queue = new ExecutionQueue(100)
	 *
	 * // Add async task
	 * const result = await queue.push(async () => {
	 *   const response = await fetch('/api/data')
	 *   return response.json()
	 * })
	 *
	 * // Add sync task
	 * const number = await queue.push(() => 42)
	 * ```
	 */
	async push<T>(task: () => T): Promise<Awaited<T>> {
		return new Promise<Awaited<T>>((resolve, reject) => {
			this.queue.push(() => Promise.resolve(task()).then(resolve).catch(reject))
			this.run()
		})
	}

	/**
	 * Clears all pending tasks from the queue.
	 *
	 * Immediately removes all pending tasks from the queue. Any currently
	 * running task will complete normally, but no additional tasks will be executed.
	 * This method does not wait for the current task to finish.
	 *
	 * @returns void
	 * @example
	 * ```ts
	 * const queue = new ExecutionQueue()
	 *
	 * // Add several tasks
	 * queue.push(() => console.log('task 1'))
	 * queue.push(() => console.log('task 2'))
	 * queue.push(() => console.log('task 3'))
	 *
	 * // Clear all pending tasks
	 * queue.close()
	 * // Only 'task 1' will execute if it was already running
	 * ```
	 */
	close() {
		this.queue = []
	}
}
