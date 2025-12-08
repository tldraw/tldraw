/**
 * A notifier that queues its notifications to the microtask queue.
 * This is useful for avoiding race conditions where callbacks are triggered prematurely.
 */
export class MicrotaskNotifier<T extends unknown[]> {
	private listeners = new Set<(...props: T) => void>()

	notify(...props: T) {
		queueMicrotask(() => {
			for (const listener of this.listeners) {
				listener(...props)
			}
		})
	}

	register(_listener: (...props: T) => void) {
		const listener = (...props: T) => {
			try {
				_listener(...props)
			} catch (error) {
				console.error(error)
			}
		}
		queueMicrotask(() => this.listeners.add(listener))
		return () => {
			queueMicrotask(() => this.listeners.delete(listener))
		}
	}
}
