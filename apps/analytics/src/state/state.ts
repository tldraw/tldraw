export class AnalyticsState<T> {
	// The current value of the state.
	protected value: T

	// Set of listeners to notify when the state changes.
	protected listeners = new Set<(value: T) => void>()

	constructor(initialValue: T) {
		this.value = initialValue
	}

	/**
	 * Subscribe to the state change.
	 *
	 * @param listener - The listener to notify when the state changes.
	 * @returns A function to unsubscribe the listener.
	 */
	subscribe(listener: (value: T) => void): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	/**
	 * Notify all listeners of the state change.
	 */
	notify() {
		this.listeners.forEach((listener) => listener(this.value))
	}

	/**
	 * Initialize the state.
	 */
	initialize(): void {}

	/**
	 * Clean up the state.
	 */
	dispose(): void {}

	/**
	 * Get the current value of the state.
	 *
	 * @returns The current value.
	 */
	getValue(): T {
		return this.value
	}

	/**
	 * Set the value of the state and notify all listeners.
	 *
	 * @param value - The new value to set.
	 */
	setValue(value: T): void {
		if (value === this.value) return
		this.value = value
		this.notify()
	}
}
