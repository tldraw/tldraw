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

/** @internal */
export function useShallowObjectIdentity<T extends Record<string, unknown>>(arr: T): T {
	return useIdentity(arr, areObjectsShallowEqual)
}
