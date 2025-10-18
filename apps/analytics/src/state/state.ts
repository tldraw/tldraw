export class AnalyticsState<T> {
	protected value: T
	protected initialized = false
	protected listeners = new Set<(value: T) => void>()

	constructor(value: T) {
		this.value = value
	}

	subscribe(listener: (value: T) => void) {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	notify() {
		this.listeners.forEach((listener) => listener(this.value))
	}

	initialize(): void {}

	dispose() {
		this.initialized = false
	}

	getValue(): T {
		return this.value
	}

	setValue(value: T): void {
		this.value = value
		this.notify()
	}
}
