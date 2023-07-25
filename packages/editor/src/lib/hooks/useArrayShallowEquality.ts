import { useState } from 'react'

export function useArrayShallowEquality<T>(array: ReadonlyArray<T>): ReadonlyArray<T> {
	const [current, setCurrent] = useState(array)
	if (current === array) {
		return current
	}
	if (current.length !== array.length) {
		setCurrent(array)
		return array
	}
	for (let i = 0; i < current.length; i++) {
		if (!Object.is(current[i], array[i])) {
			setCurrent(array)
			return array
		}
	}
	return current
}
