import { areArraysShallowEqual, areObjectsShallowEqual } from '@tldraw/utils'
import { useRef } from 'react'

function useIdentity<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
	const ref = useRef(value)
	if (isEqual(value, ref.current)) {
		return ref.current
	}
	ref.current = value
	return value
}

const areNullableArraysShallowEqual = (
	a: readonly any[] | null | undefined,
	b: readonly any[] | null | undefined
) => {
	a ??= null
	b ??= null
	if (a === b) {
		return true
	}
	if (!a || !b) {
		return false
	}
	return areArraysShallowEqual(a, b)
}

/** @internal */
export function useShallowArrayIdentity<T extends readonly any[] | null | undefined>(arr: T): T {
	return useIdentity(arr, areNullableArraysShallowEqual)
}

const areNullableObjectsShallowEqual = (
	a: object | null | undefined,
	b: object | null | undefined
) => {
	a ??= null
	b ??= null
	if (a === b) {
		return true
	}
	if (!a || !b) {
		return false
	}
	return areObjectsShallowEqual(a, b)
}

/** @internal */
export function useShallowObjectIdentity<T extends object | null | undefined>(obj: T): T {
	return useIdentity(obj, areNullableObjectsShallowEqual)
}
