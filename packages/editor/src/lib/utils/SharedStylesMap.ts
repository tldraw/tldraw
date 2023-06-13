import { StyleProp } from '@tldraw/tlschema'
import { exhaustiveSwitchError } from '@tldraw/utils'

export type SharedStyle<T> = { type: 'mixed' } | { type: 'shared'; value: T }

export class ReadonlySharedStyleMap {
	constructor(protected map = new Map<StyleProp<unknown>, SharedStyle<unknown>>()) {}

	get<T>(prop: StyleProp<T>): SharedStyle<T> | undefined {
		return this.map.get(prop) as SharedStyle<T> | undefined
	}

	getAsKnownValue<T>(prop: StyleProp<T>): T | undefined {
		const value = this.get(prop)
		if (!value) return undefined
		if (value.type === 'mixed') return undefined
		return value.value
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
