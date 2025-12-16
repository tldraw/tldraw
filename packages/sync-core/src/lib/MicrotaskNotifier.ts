/**
 * A notifier that queues its notifications to the microtask queue.
 * This is useful for avoiding race conditions where callbacks are triggered prematurely.
 */
export class MicrotaskNotifier<T extends unknown[]> {
	private listeners = new Set<(...props: T) => void>()

	notify(...props: T) {
		queueMicrotask(() => {
			for (const listener of this.listeners) {
				try {
					listener(...props)
				} catch (error) {
					console.error('Error in MicrotaskNotifier listener', error)
				}
			}
		})
	}

	register(_listener: (...props: T) => void) {
		// Track if unsubscribe was called before the add microtask ran
		let didDelete = false

		// We defer the add to the microtask queue to ensure the callback isn't invoked
		// for changes that happened before this registration
		queueMicrotask(() => {
			if (didDelete) return
			this.listeners.add(_listener)
		})

		return () => {
			if (didDelete) return
			didDelete = true
			// Synchronous delete ensures immediate unsubscription
			this.listeners.delete(_listener)
		}
	}
}
