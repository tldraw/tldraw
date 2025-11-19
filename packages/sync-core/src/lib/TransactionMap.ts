import { mapObjectMapValues, objectMapValues } from 'tldraw'

const DELETED = Symbol('DELETED')
const $commit = Symbol('COMMIT')

export class TransactionMap<K, V> {
	private prospectiveChanges: Map<K, V | typeof DELETED> = new Map()
	private constructor(private readonly goldMap: ReadonlyMap<K, V>) {}

	// This provides a way to accumulate writes in a way that is abortable (by throwing). However
	// reads are not isolated so if someone updates the underlying map while a transaction is in progress,
	// the transaction will see the updated value.
	static async transact<
		Vals extends Record<string, ReadonlyMap<any, any> | ReadonlyValue<any>>,
		Result,
	>(
		maps: Vals,
		fn: (maps: {
			[K in keyof Vals]: Vals[K] extends ReadonlyValue<infer U>
				? TransactionValue<U>
				: Vals[K] extends ReadonlyMap<infer K, infer V>
					? TransactionMap<K, V>
					: never
		}) => Promise<Result>
	) {
		const txnMaps = mapObjectMapValues(maps, (_, map) =>
			map instanceof ReadonlyValue ? new TransactionValueImpl(map) : new TransactionMap(map)
		)
		const result = await fn(txnMaps as any)
		for (const map of objectMapValues(txnMaps)) {
			map[$commit]()
		}
		return result
	}

	set(key: K, value: V) {
		this.prospectiveChanges.set(key, value)
	}

	get(key: K) {
		const prospectiveChange = this.prospectiveChanges?.get(key)
		if (prospectiveChange) {
			return prospectiveChange === DELETED ? undefined : prospectiveChange
		}
		return this.goldMap.get(key)
	}

	has(key: K) {
		const prospectiveChange = this.prospectiveChanges?.get(key)
		if (prospectiveChange) {
			return prospectiveChange !== DELETED
		}
		return this.goldMap.has(key)
	}

	delete(key: K) {
		if (!this.goldMap.has(key)) {
			this.prospectiveChanges.delete(key)
		} else {
			this.prospectiveChanges.set(key, DELETED)
		}
	}

	deleteMany(keys: K[]) {
		for (const key of keys) {
			this.delete(key)
		}
	}

	*entries(): Generator<[K, V], undefined, unknown> {
		for (const [key, value] of this.goldMap.entries()) {
			if (this.prospectiveChanges?.has(key)) {
				continue
			}
			yield [key, value]
		}
		if (this.prospectiveChanges) {
			for (const [key, value] of this.prospectiveChanges.entries()) {
				if (value === DELETED) {
					continue
				}
				yield [key, value]
			}
		}
	}

	*keys() {
		for (const entry of this.entries()) {
			yield entry[0]
		}
	}

	*values() {
		for (const entry of this.entries()) {
			yield entry[1]
		}
	}

	// eslint-disable-next-line no-restricted-syntax
	get size(): number {
		let size = this.goldMap.size
		if (!this.prospectiveChanges) {
			return size
		}
		for (const [key, value] of this.prospectiveChanges?.entries() ?? []) {
			if (value === DELETED && !this.goldMap.has(key)) {
				size--
			} else if (value !== DELETED && !this.goldMap.has(key)) {
				size++
			}
		}
		return size
	}

	clear() {
		this.prospectiveChanges.clear()
		for (const key of this.goldMap.keys()) {
			this.prospectiveChanges?.set(key, DELETED)
		}
	}

	[$commit]() {
		const goldMap = this.goldMap as Map<K, V>
		for (const [key, value] of this.prospectiveChanges?.entries() ?? []) {
			if (value === DELETED) {
				goldMap.delete(key)
			} else {
				goldMap.set(key, value)
			}
		}
	}
}

export class ReadonlyValue<T> {
	constructor(private _value: T) {}

	get() {
		return this._value
	}
}

export interface TransactionValue<T> {
	get(): T
	set(value: T): void
}
class TransactionValueImpl<T> implements TransactionValue<T> {
	constructor(
		private readonly readonlyValue: ReadonlyValue<T>,
		private prospectiveValue = readonlyValue.get()
	) {}

	private isDisposed = false
	assertNotDisposed() {
		if (this.isDisposed) throw new Error('TransactionValue is disposed')
	}

	get() {
		this.assertNotDisposed()
		return this.prospectiveValue
	}

	set(value: T) {
		this.assertNotDisposed()
		this.prospectiveValue = value
	}

	[$commit]() {
		// sneaky sneaky sneaky
		;(this.readonlyValue as any)._value = this.prospectiveValue
		this.isDisposed = true
	}
}
