import { bind, sleep } from '@tldraw/utils'

/**
 * Export delay is a helper class that allows you to wait for a set of promises to resolve before
 * proceeding with an export. Over time, promises can be added by calling `waitUntil`.
 *
 * When `resolve` is called, we'll wait for all the promises already added (and any new ones added
 * in the mean time) to resolve before proceeding. The class is designed to be used once: after
 * `resolve` has been called and finished, new promises cannot be added.
 */
export class ExportDelay {
	private isResolved = false
	private readonly promisesToWaitFor: Promise<void>[] = []

	constructor(private readonly maxDelayTimeMs: number) {}

	@bind waitUntil(promise: Promise<void>): void {
		if (this.isResolved) {
			throw new Error(
				'Cannot `waitUntil` - the export has already been resolved. Make sure to call `waitUntil` as soon as possible during an export - ie within the first react effect after rendering.'
			)
		}
		this.promisesToWaitFor.push(
			promise.catch((err) => console.error('Error while waiting for export:', err))
		)
	}

	private async resolvePromises() {
		let lastLength = null
		while (this.promisesToWaitFor.length !== lastLength) {
			lastLength = this.promisesToWaitFor.length
			await Promise.allSettled(this.promisesToWaitFor)

			// wait for a cycle of the event loop to allow any of those promises to add more if needed.
			await sleep(0)
		}
	}

	async resolve() {
		const timeoutPromise = sleep(this.maxDelayTimeMs).then(() => 'timeout' as const)
		const resolvePromise = this.resolvePromises().then(() => 'resolved' as const)

		const result = await Promise.race([timeoutPromise, resolvePromise])
		if (result === 'timeout') {
			console.warn('[tldraw] Export delay timed out after ${this.maxDelayTimeMs}ms')
		}

		this.isResolved = true
	}
}
