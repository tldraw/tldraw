import { atom } from '@tldraw/state'
import { TLAuthorize } from '@tldraw/tlschema'
import { useLayoutEffect, useMemo, useState } from 'react'

/**
 * Keeps one authorize object for the life of a store, so that an `authorize` written inline (for
 * example `composeAuthorize(...)` in a component) does not make a new store on every render. Each
 * hook calls the latest object, and reads it from a signal, so a reactive `editor.can` check runs
 * again when the object changes. A new store is made only when a hook is added or removed.
 *
 * @internal
 */
export function useStableAuthorize(authorize: TLAuthorize | undefined): TLAuthorize | undefined {
	const [current] = useState(() => atom('authorize', authorize))
	useLayoutEffect(() => {
		current.set(authorize)
	}, [current, authorize])
	const hasWrite = !!authorize?.write
	const hasRead = !!authorize?.read
	const hasCan = !!authorize?.can
	return useMemo(() => {
		if (!hasWrite && !hasRead && !hasCan) return undefined
		const stable: TLAuthorize = {}
		if (hasWrite) stable.write = (changes, ctx) => current.get()?.write?.(changes, ctx) ?? null
		if (hasRead) stable.read = (record, ctx) => current.get()?.read?.(record, ctx) ?? true
		if (hasCan) {
			stable.can = (permission, data, ctx) => current.get()?.can?.(permission, data, ctx) ?? true
		}
		return stable
	}, [current, hasWrite, hasRead, hasCan])
}
