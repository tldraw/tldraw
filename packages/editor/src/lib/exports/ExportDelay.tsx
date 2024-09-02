export class ExportDelay {
	private isResolved = false
	private readonly promisesToWaitFor: Promise<void>[] = []

	waitUntil(promise: Promise<void>): void {
		if (this.isResolved) {
			throw new Error(
				'Cannot `waitUntil` - the export has already been resolved. Make sure to call `waitUntil` as soon as possible during an export - ie within the first react effect after rendering.'
			)
		}
		this.promisesToWaitFor.push(promise)
	}

	async resolve() {
		let lastLength = null
		while (this.promisesToWaitFor.length !== lastLength) {
			lastLength = this.promisesToWaitFor.length
			await Promise.all(this.promisesToWaitFor)

			// wait for a cycle of the event loop to allow any of those promises to add more if
			// needed.

			// eslint-disable-next-line no-restricted-globals
			await new Promise((r) => setTimeout(r, 0))
		}
		this.isResolved = true
	}
}
