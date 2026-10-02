import { UnknownRecord, reverseRecordsDiff } from '@tldraw/store'
import { TLBindingId, TLShape, TLShapeId } from '@tldraw/tlschema'
import { JsonObject, Result } from '@tldraw/utils'
import type { Editor } from './Editor'
import { InputsManager } from './managers/InputsManager/InputsManager'

export const RENDERING_SHAPES_SORT_CACHE_THRESHOLD = 100

/**
 * The four debounced modifier keys, each paired with the way Editor reads, writes, releases and
 * recognises it. A modifier's release is dispatched through its own `Editor` method so a subclass
 * override still runs.
 */
export interface ModifierKey {
	key: 'Shift' | 'Alt' | 'Ctrl' | 'Meta'
	code: string
	flag: 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
	/**
	 * Whether a `key_up` that still reports the modifier as pressed should be taken as a release.
	 * The native `metaKey` property stays true on its own keyup, so without this the meta key would
	 * be left held with no release timer.
	 */
	ignoresKeyUp?: boolean
	get(inputs: InputsManager): boolean
	set(inputs: InputsManager, value: boolean): void
	release(editor: Editor): void
}

export const SHIFT_KEY: ModifierKey = {
	key: 'Shift',
	code: 'ShiftLeft',
	flag: 'shiftKey',
	get: (inputs) => inputs.getShiftKey(),
	set: (inputs, value) => inputs.setShiftKey(value),
	release: (editor) => editor._releaseShiftKey(),
}

export const ALT_KEY: ModifierKey = {
	key: 'Alt',
	code: 'AltLeft',
	flag: 'altKey',
	get: (inputs) => inputs.getAltKey(),
	set: (inputs, value) => inputs.setAltKey(value),
	release: (editor) => editor._releaseAltKey(),
}

export const CTRL_KEY: ModifierKey = {
	key: 'Ctrl',
	code: 'ControlLeft',
	flag: 'ctrlKey',
	get: (inputs) => inputs.getCtrlKey(),
	set: (inputs, value) => inputs.setCtrlKey(value),
	release: (editor) => editor._releaseCtrlKey(),
}

export const META_KEY: ModifierKey = {
	key: 'Meta',
	code: 'MetaLeft',
	flag: 'metaKey',
	ignoresKeyUp: true,
	get: (inputs) => inputs.getMetaKey(),
	set: (inputs, value) => inputs.setMetaKey(value),
	release: (editor) => editor._releaseMetaKey(),
}

export const MODIFIER_KEYS = [SHIFT_KEY, ALT_KEY, CTRL_KEY, META_KEY]

export function alertMaxShapes(editor: Editor, pageId = editor.getCurrentPageId()) {
	const name = editor.getPage(pageId)!.name
	editor.emit('max-shapes', { name, pageId, count: editor.options.maxShapesPerPage })
}

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

export function pushShapeWithDescendants(editor: Editor, id: TLShapeId, result: TLShape[]): void {
	const shape = editor.getShape(id)
	if (!shape) return
	result.push(shape)
	const childIds = editor.getSortedChildIdsForParent(id)
	for (let i = 0, n = childIds.length; i < n; i++) {
		pushShapeWithDescendants(editor, childIds[i], result)
	}
}

/**
 * When `shapes` already holds ids this returns that same array, not a copy, so a caller that
 * mutates the result (for example to sort it) must copy it first.
 */
export function toShapeIds(shapes: TLShapeId[] | TLShape[]): TLShapeId[] {
	return typeof shapes[0] === 'string'
		? (shapes as TLShapeId[])
		: (shapes as TLShape[]).map((shape) => shape.id)
}

/**
 * Run `callback` in a world where all bindings from the shapes in `shapeIds` to shapes not in
 * `shapeIds` are removed. This is useful when you want to duplicate/copy shapes without worrying
 * about bindings that might be pointing to shapes that are not being duplicated.
 *
 * The callback is given the set of bindings that should be maintained.
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
