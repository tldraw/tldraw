import { sleep } from '@tldraw/utils'

export function createPersistQueue(persist: () => Promise<void>, timeout: number) {
	let persistAgain = false
	let queue: null | Promise<void> = null
	// check whether the worker was woken up to persist after having gone to sleep
	return async () => {
		if (queue) {
			persistAgain = true
			return await queue
		}

		try {
			queue = Promise.resolve(
				(async () => {
					do {
						if (persistAgain) {
							if (timeout > 0) {
								await sleep(timeout)
							}
							persistAgain = false
						}
						await persist()
					} while (persistAgain)
				})()
			)
			await queue
		} finally {
			queue = null
		}
	}
}
