import { StyleProp } from '@tldraw/tlschema'
import { exhaustiveSwitchError } from '@tldraw/utils'

/** @public */
export type SharedStyle<T> =
	| { readonly type: 'mixed' }
	| { readonly type: 'shared'; readonly value: T }

function sharedStyleEquals<T>(a: SharedStyle<T>, b: SharedStyle<T> | undefined) {
	if (!b) return false
	switch (a.type) {
		case 'mixed':
			return b.type === 'mixed'
		case 'shared':
			return b.type === 'shared' && a.value === b.value
		default:
			throw exhaustiveSwitchError(a)
	}
}

/** @public */
export class ReadonlySharedStyleMap {
	protected map: Map<UnknownStyleProp, SharedStyle<unknown>>
	constructor(entries?: Iterable<[StyleProp<unknown>, SharedStyle<unknown>]>) {
		this.map = new Map(entries)
	}

	get<T>(prop: StyleProp<T, any, any>): SharedStyle<T> | undefined {
		return this.map.get(prop) as SharedStyle<T> | undefined
	}

	getAsKnownValue<T>(prop: StyleProp<T>): T | undefined {
		const value = this.get(prop)
		if (!value) return undefined
		if (value.type === 'mixed') return undefined
		return value.value
	}

	get size() {
		return this.map.size
	}

	equals(other: ReadonlySharedStyleMap) {
		if (this.size !== other.size) return false

		const checkedKeys = new Set()
		for (const [styleProp, value] of this) {
			if (!sharedStyleEquals(value, other.get(styleProp))) return false
			checkedKeys.add(styleProp)
		}
		for (const [styleProp, value] of other) {
			if (checkedKeys.has(styleProp)) continue
			if (!sharedStyleEquals(value, this.get(styleProp))) return false
		}

		return true
	}

	keys() {
		return this.map.keys()
	}

	values() {
		return this.map.values()
	}

	entries() {
		return this.map.entries()
	}

	[Symbol.iterator]() {
		return this.map[Symbol.iterator]()
	}
}

/** @internal */
export class SharedStyleMap extends ReadonlySharedStyleMap {
	set<T>(prop: StyleProp<T>, value: SharedStyle<T>) {
		this.map.set(prop, value)
	}

	applyValue<T>(prop: StyleProp<T>, value: T) {
		const existingValue = this.get(prop)

		// if we don't have a value yet, set it
		if (!existingValue) {
			this.set(prop, { type: 'shared', value })
			return
		}

		switch (existingValue.type) {
			case 'mixed':
				// we're already mixed, adding new values won't help
				return
			case 'shared':
				if (existingValue.value !== value) {
					// if the value is different, we're now mixed:
					this.set(prop, { type: 'mixed' })
				}
				return
			default:
				exhaustiveSwitchError(existingValue, 'type')
		}
	}
}
