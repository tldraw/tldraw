export class Queue {
	currentTask = Promise.resolve()

	enqueue<T>(task: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			this.currentTask = this.currentTask.then(async () => {
				try {
					resolve(await task())
				} catch (err) {
					reject(err)
				}
			})
		})
	}
}
