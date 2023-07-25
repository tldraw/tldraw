export class KeyedSet<Key extends string, Value extends { readonly [K in Key]: string }> {
	protected readonly map = new Map<string, Value>()

	constructor(
		protected readonly key: Key,
		protected readonly valueTypeForErrorMessages: string,
		values?: Iterable<Value>
	) {
		if (values) this.addAll(values)
	}

	add(value: Value) {
		const key = value[this.key]
		if (this.map.has(key)) {
			if (this.map.get(key) !== value) {
				throw Error(
					`Cannot have two ${this.valueTypeForErrorMessages}s with the ${this.key} "${key}"`
				)
			}
			return
		}
		this.map.set(key, value)
	}

	addAll(values: Iterable<Value>) {
		for (const value of values) this.add(value)
	}

	getByKey(key: string) {
		return this.map.get(key)
	}

	getByValue(value: Value) {
		return this.map.get(value[this.key])
	}

	asObject(): Record<string, Value> {
		return Object.fromEntries(this.map.entries())
	}

	assertHas(value: Value) {
		if (!this.map.has(value[this.key])) {
			throw Error(`${this.valueTypeForErrorMessages} "${value[this.key]}" not found`)
		}
		if (this.map.get(value[this.key]) !== value) {
			throw Error(`${this.valueTypeForErrorMessages} "${value[this.key]}" not found`)
		}
	}

	[Symbol.iterator]() {
		return this.map.values()
	}
}

export type ReadonlyKeyedSet<
	Key extends string,
	Value extends { readonly [K in Key]: string }
> = Omit<KeyedSet<Key, Value>, 'add' | 'addAll'>
