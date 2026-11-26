import type { UnknownRecord } from '@tldraw/store'
// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import type { TLShape, TLShapeId } from '@tldraw/tlschema'
import type { JsonObject } from '@tldraw/utils'

/**
 * Apply a partial to a shape or binding record. Props and meta merge one level deep. Returns
 * `prev` itself when nothing changes.
 *
 * @internal
 */
export function applyPartialToRecordWithProps<
	T extends UnknownRecord & { type: string; props: object; meta: object },
>(
	prev: T,
	partial?: T extends T ? Omit<Partial<T>, 'props'> & { props?: Partial<T['props']> } : never
): T {
	if (!partial) return prev
	let next = null as null | T
	const entries = Object.entries(partial)
	for (let i = 0, n = entries.length; i < n; i++) {
		const [k, v] = entries[i]
		if (v === undefined) continue

		// Is the key a special key? We don't update those
		if (k === 'id' || k === 'type' || k === 'typeName') continue

		// Is the value the same as it was before?
		if (v === (prev as any)[k]) continue

		// There's a new value, so create the new shape if we haven't already (should we be cloning this?)
		if (!next) next = { ...prev }

		// for props / meta properties, we support updates with partials of this object
		if (k === 'props' || k === 'meta') {
			next[k] = { ...prev[k] } as JsonObject
			for (const [nextKey, nextValue] of Object.entries(v as object)) {
				;(next[k] as JsonObject)[nextKey] = nextValue
			}
			continue
		}

		// base property
		;(next as any)[k] = v
	}
	if (!next) return prev
	return next
}

/**
 * Get the ids of shapes or shape ids.
 *
 * When `shapes` already holds ids this returns that same array, not a copy, so a caller that
 * mutates the result (for example to sort it) must copy it first.
 *
 * @internal
 */
export function toShapeIds(shapes: TLShapeId[] | TLShape[]): TLShapeId[] {
	return typeof shapes[0] === 'string'
		? (shapes as TLShapeId[])
		: (shapes as TLShape[]).map((shape) => shape.id)
}
