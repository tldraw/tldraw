// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { reverseRecordsDiff, type UnknownRecord } from '@tldraw/store'
import type { TLBindingId, TLShape, TLShapeId } from '@tldraw/tlschema'
import { Result, type JsonObject } from '@tldraw/utils'
import type { Editor } from './Editor'

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

/**
 * Tell listeners that a page has reached its shape limit.
 *
 * @internal
 */
export function alertMaxShapes(editor: Editor, pageId = editor.getCurrentPageId()) {
	const name = editor.getPage(pageId)!.name
	editor.emit('max-shapes', { name, pageId, count: editor.options.maxShapesPerPage })
}

/**
 * Run `callback` in a world where all bindings from the shapes in `shapeIds` to shapes not in
 * `shapeIds` are removed. This is useful when you want to duplicate/copy shapes without worrying
 * about bindings that might be pointing to shapes that are not being duplicated.
 *
 * The callback is given the set of bindings that should be maintained.
 *
 * @internal
 */
export function withIsolatedShapes<T>(
	editor: Editor,
	shapeIds: Set<TLShapeId>,
	callback: (bindingsWithBoth: Set<TLBindingId>) => T
): T {
	let result!: Result<T, unknown>

	editor.run(
		() => {
			const changes = editor.store.extractingChanges(() => {
				const bindingsWithBoth = new Set<TLBindingId>()
				const bindingsToRemove = new Set<TLBindingId>()

				for (const shapeId of shapeIds) {
					const shape = editor.getShape(shapeId)
					if (!shape) continue

					for (const binding of editor.getBindingsInvolvingShape(shapeId)) {
						const hasFrom = shapeIds.has(binding.fromId)
						const hasTo = shapeIds.has(binding.toId)
						if (hasFrom && hasTo) {
							bindingsWithBoth.add(binding.id)
							continue
						}
						if (!hasFrom || !hasTo) {
							bindingsToRemove.add(binding.id)
						}
					}
				}

				editor._deleteBindings([...bindingsToRemove], { isolateShapes: true })

				try {
					result = Result.ok(callback(bindingsWithBoth))
				} catch (error) {
					result = Result.err(error)
				}
			})

			editor.store.applyDiff(reverseRecordsDiff(changes), { runCallbacks: false })
		},
		{ history: 'ignore' }
	)

	if (result.ok) {
		return result.value
	} else {
		throw result.error
	}
}
