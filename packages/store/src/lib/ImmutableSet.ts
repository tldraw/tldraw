import { ImmutableMap } from './ImmutableMap'

export class ImmutableSet<T> {
	constructor(private readonly map: ImmutableMap<T, true>) {}
	static create<T>(value?: Iterable<T> | null | undefined) {
		if (value) {
			return new ImmutableSet<T>(
				new ImmutableMap<T, true>().withMutations((map) => {
					for (const v of value) {
						map.set(v, true)
					}
				})
			)
		} else {
			return new ImmutableSet<T>(new ImmutableMap<T, true>())
		}
	}

	has(value: T): boolean {
		return !!this.map.get(value)
	}

	add(value: T): ImmutableSet<T> {
		return new ImmutableSet(this.map.set(value, true))
	}

	addMany(values: Iterable<T>): ImmutableSet<T> {
		return new ImmutableSet(
			this.map.withMutations((map) => {
				for (const value of values) {
					map.set(value, true)
				}
			})
		)
	}

	asMutable(): TransientImmutableSet<T> {
		return new TransientImmutableSet(this.map.asMutable())
	}

	size() {
		return this.map.size
	}

	delete(value: T): ImmutableSet<T> {
		return new ImmutableSet(this.map.delete(value))
	}

	deleteMany(values: Iterable<T>): ImmutableSet<T> {
		return new ImmutableSet(
			this.map.withMutations((map) => {
				for (const value of values) {
					map.delete(value)
				}
			})
		)
	}

	values() {
		return this.map.keys()
	}

	[Symbol.iterator]() {
		return this.values()[Symbol.iterator]()
	}

	equals(other: ImmutableSet<T>): boolean {
		if (this.size() !== other.size()) return false
		for (const value of this) {
			if (!other.has(value)) return false
		}
		return true
	}
}

export class TransientImmutableSet<T> {
	constructor(private map: ImmutableMap<T, true>) {}

	size() {
		return this.map.size
	}

	has(value: T): boolean {
		return !!this.map.get(value)
	}

	add(value: T): TransientImmutableSet<T> {
		this.map.set(value, true)
		return this
	}

	addMany(values: Iterable<T>): TransientImmutableSet<T> {
		for (const value of values) {
			this.map.set(value, true)
		}
		return this
	}

	delete(value: T): TransientImmutableSet<T> {
		this.map.delete(value)
		return this
	}

	asImmutable(): ImmutableSet<T> {
		return new ImmutableSet(this.map.asImmutable())
	}
}