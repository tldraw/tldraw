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

/** @internal */
export function useShallowArrayIdentity<T>(arr: readonly T[]): readonly T[] {
	return useIdentity(arr, areArraysShallowEqual)
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
