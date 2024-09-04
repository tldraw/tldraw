import { bind } from '@tldraw/utils'

export class ExportDelay {
	private isResolved = false
	private readonly promisesToWaitFor: Promise<void>[] = []

	constructor(private readonly maxDelayTimeMs: number) {}

	@bind waitUntil(promise: Promise<void>): void {
		// console.log('waitUntil', new Error().stack)
		if (this.isResolved) {
			throw new Error(
				'Cannot `waitUntil` - the export has already been resolved. Make sure to call `waitUntil` as soon as possible during an export - ie within the first react effect after rendering.'
			)
		}
		this.promisesToWaitFor.push(
			promise.catch((err) => console.error('Error whilst waiting for export:', err))
		)
	}

	private async resolvePromises() {
		let lastLength = null
		while (this.promisesToWaitFor.length !== lastLength) {
			lastLength = this.promisesToWaitFor.length
			await Promise.allSettled(this.promisesToWaitFor)

			// wait for a cycle of the event loop to allow any of those promises to add more if needed.
			// eslint-disable-next-line no-restricted-globals
			await new Promise((r) => setTimeout(r, 0))
		}
	}

	async resolve() {
		const timeoutPromise = new Promise<'timeout'>((r) =>
			// eslint-disable-next-line no-restricted-globals
			setTimeout(() => r('timeout'), this.maxDelayTimeMs)
		)
		const resolvePromise = this.resolvePromises().then(() => 'resolved' as const)

		const result = await Promise.race([timeoutPromise, resolvePromise])
		if (result === 'timeout') {
			console.warn('[tldraw] Export delay timed out after ${this.maxDelayTimeMs}ms')
		}

		this.isResolved = true
	}
}
