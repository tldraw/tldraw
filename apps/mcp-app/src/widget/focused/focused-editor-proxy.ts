/**
 * ES Proxy that wraps the tldraw Editor to auto-convert between focused format
 * and tldraw's internal format at method boundaries.
 *
 * AI agents interact entirely in focused format — simple string IDs, flat shape
 * objects with `_type` — and the proxy silently translates to/from tldraw's
 * `TLShape`, `TLShapeId`, etc.
 */
import {
	Editor,
	TLBindingId,
	TLCreateShapePartial,
	TLShape,
	TLShapeId,
	TLShapePartial,
} from 'tldraw'
import { getDefaultShape } from './defaults'
import { convertSimpleIdToTldrawId, convertTldrawIdToSimpleId, type FocusedShape } from './format'
import { METHOD_MAP, type RetKind } from './generated-method-map'
import { convertTldrawShapeToFocusedShape } from './to-focused'
import { convertFocusedShapeToTldrawShape } from './to-tldraw'

// ---------------------------------------------------------------------------
// Input conversion helpers
// ---------------------------------------------------------------------------

/** Convert a single value that might be a focused ID or focused shape into tldraw format. */
function convertIdOrShape(val: string | TLShapeId | TLShape | FocusedShape | null | undefined) {
	if (val === null || val === undefined) return val
	if (typeof val === 'string') return ensureTldrawId(val)
	if ('_type' in val) {
		return ensureTldrawId((val as FocusedShape).shapeId)
	}
	return val
}

/** Convert an array where each element might be a focused ID or focused shape. */
function convertIdsOrShapes(
	arr: Array<string | TLShapeId | TLShape | FocusedShape> | TLShapeId[] | TLShape[]
) {
	return arr.map(convertIdOrShape)
}

/** Ensure a string is a valid TLShapeId. Passthrough if already prefixed. */
function ensureTldrawId(id: string): TLShapeId {
	if (id.startsWith('shape:')) return id as TLShapeId
	return convertSimpleIdToTldrawId(id)
}

/** Detect whether a value is a focused shape (has `_type` field). */
function isFocusedShape(
	val: FocusedShape | TLShapePartial | TLCreateShapePartial
): val is FocusedShape {
	return '_type' in val
}

// ---------------------------------------------------------------------------
// Output conversion helpers
// ---------------------------------------------------------------------------

function convertOutputShape(editor: Editor, shape: TLShape): FocusedShape {
	try {
		return convertTldrawShapeToFocusedShape(editor, shape)
	} catch {
		return {
			_type: 'unknown',
			shapeId: convertTldrawIdToSimpleId(shape.id),
			subType: shape.type,
			note: '',
			x: shape.x,
			y: shape.y,
		}
	}
}

function isTLShape(val: TLShape | FocusedShape | string | null | undefined): val is TLShape {
	if (val === null || val === undefined || typeof val === 'string') return false
	return 'typeName' in val && val.typeName === 'shape'
}

/**
 * Convert a return value from tldraw format to focused format based on the method spec.
 * Uses targeted casts because the Proxy handler is inherently dynamic dispatch —
 * the `result` type varies per method and can't be statically narrowed from the spec string.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type ProxyResult =
	| TLShape
	| TLShape[]
	| TLShapeId
	| TLShapeId[]
	| Set<TLShapeId>
	| Editor
	| null
	| undefined
	| void

function convertReturnValue(editor: Editor, proxy: Editor, spec: RetKind, result: ProxyResult) {
	switch (spec) {
		case 'this':
			return proxy
		case 'shape': {
			const shape = result as TLShape | undefined
			return shape && isTLShape(shape) ? convertOutputShape(editor, shape) : result
		}
		case 'shape-or-null': {
			if (result === null || result === undefined) return result
			const shape = result as TLShape
			return isTLShape(shape) ? convertOutputShape(editor, shape) : result
		}
		case 'shapes': {
			const shapes = result as TLShape[]
			if (!Array.isArray(shapes)) return result
			return shapes.map((s) => (isTLShape(s) ? convertOutputShape(editor, s) : s))
		}
		case 'id': {
			const id = result as TLShapeId
			return typeof id === 'string' ? convertTldrawIdToSimpleId(id) : result
		}
		case 'id-or-null': {
			if (result === null || result === undefined) return result
			const id = result as TLShapeId
			return typeof id === 'string' ? convertTldrawIdToSimpleId(id) : result
		}
		case 'ids': {
			const ids = result as TLShapeId[]
			if (!Array.isArray(ids)) return result
			return ids.map((id) => (typeof id === 'string' ? convertTldrawIdToSimpleId(id) : id))
		}
		case 'id-set': {
			const idSet = result as Set<TLShapeId>
			if (!(idSet instanceof Set)) return result
			const out = new Set<string>()
			for (const id of idSet) {
				out.add(convertTldrawIdToSimpleId(id))
			}
			return out
		}
	}
}

// ---------------------------------------------------------------------------
// Special-case handlers for create/update (arrow bindings)
// ---------------------------------------------------------------------------

type EditorMethod = (...args: Parameters<Editor['createShape']>) => Editor

function handleCreateShape(
	editor: Editor,
	proxy: Editor,
	partial: FocusedShape | TLCreateShapePartial,
	realMethod: EditorMethod
): Editor {
	if (!isFocusedShape(partial)) {
		realMethod.call(editor, partial)
		return proxy
	}

	const result = convertFocusedShapeToTldrawShape(editor, partial, {
		defaultShape: getDefaultShape(partial._type),
	})

	editor.createShape(result.shape)

	if (result.bindings) {
		for (const binding of result.bindings) {
			editor.createBinding({
				type: binding.type,
				fromId: binding.fromId,
				toId: binding.toId,
				props: binding.props,
				meta: binding.meta,
			})
		}
	}

	return proxy
}

function handleCreateShapes(
	editor: Editor,
	proxy: Editor,
	partials: Array<FocusedShape | TLCreateShapePartial>,
	realMethod: EditorMethod
): Editor {
	if (!Array.isArray(partials)) {
		realMethod.call(editor, partials)
		return proxy
	}

	for (const partial of partials) {
		handleCreateShape(editor, proxy, partial, realMethod)
	}
	return proxy
}

function handleUpdateShape(
	editor: Editor,
	proxy: Editor,
	partial: FocusedShape | TLShapePartial,
	realMethod: EditorMethod
): Editor {
	if (!isFocusedShape(partial)) {
		realMethod.call(editor, partial)
		return proxy
	}

	const shapeId = ensureTldrawId(partial.shapeId)
	const existingShape = editor.getShape(shapeId)
	if (!existingShape) {
		return proxy
	}

	const result = convertFocusedShapeToTldrawShape(editor, partial, {
		defaultShape: existingShape,
	})

	editor.updateShape(result.shape)

	if (result.bindings) {
		const existingBindings = editor.getBindingsFromShape(shapeId, 'arrow')
		for (const binding of existingBindings) {
			editor.deleteBinding(binding.id as TLBindingId)
		}
		for (const binding of result.bindings) {
			editor.createBinding({
				type: binding.type,
				fromId: binding.fromId,
				toId: binding.toId,
				props: binding.props,
				meta: binding.meta,
			})
		}
	}

	return proxy
}

function handleUpdateShapes(
	editor: Editor,
	proxy: Editor,
	partials: Array<FocusedShape | TLShapePartial>,
	realMethod: EditorMethod
): Editor {
	if (!Array.isArray(partials)) {
		realMethod.call(editor, partials)
		return proxy
	}

	for (const partial of partials) {
		handleUpdateShape(editor, proxy, partial, realMethod)
	}
	return proxy
}

// ---------------------------------------------------------------------------
// The Proxy factory
// ---------------------------------------------------------------------------

export function createFocusedEditorProxy(editor: Editor): Editor {
	const proxy: Editor = new Proxy(editor, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver)

			// Only intercept function calls on string-named properties
			if (typeof prop !== 'string' || typeof value !== 'function') {
				return value
			}

			const spec = METHOD_MAP[prop]

			// --- Special-case: create/update need binding handling ---
			if (prop === 'createShape') {
				return (partial: FocusedShape | TLCreateShapePartial) =>
					handleCreateShape(target, proxy, partial, value as EditorMethod)
			}
			if (prop === 'createShapes') {
				return (partials: Array<FocusedShape | TLCreateShapePartial>) =>
					handleCreateShapes(target, proxy, partials, value as EditorMethod)
			}
			if (prop === 'updateShape') {
				return (partial: FocusedShape | TLShapePartial) =>
					handleUpdateShape(target, proxy, partial, value as EditorMethod)
			}
			if (prop === 'updateShapes') {
				return (partials: Array<FocusedShape | TLShapePartial>) =>
					handleUpdateShapes(target, proxy, partials, value as EditorMethod)
			}
			if (prop === 'animateShape') {
				return (partial: FocusedShape | TLShapePartial, ...rest: [Record<string, number>?]) => {
					if (isFocusedShape(partial)) {
						const shapeId = ensureTldrawId(partial.shapeId)
						const existing = target.getShape(shapeId)
						if (existing) {
							const converted = convertFocusedShapeToTldrawShape(target, partial, {
								defaultShape: existing,
							})
							value.call(target, converted.shape, ...rest)
							return proxy
						}
					}
					value.call(target, partial, ...rest)
					return proxy
				}
			}
			if (prop === 'animateShapes') {
				return (
					partials: Array<FocusedShape | TLShapePartial>,
					...rest: [Record<string, number>?]
				) => {
					if (Array.isArray(partials)) {
						const converted = partials.map((p) => {
							if (isFocusedShape(p)) {
								const shapeId = ensureTldrawId(p.shapeId)
								const existing = target.getShape(shapeId)
								if (existing) {
									return convertFocusedShapeToTldrawShape(target, p, {
										defaultShape: existing,
									}).shape
								}
							}
							return p
						})
						value.call(target, converted, ...rest)
					} else {
						value.call(target, partials, ...rest)
					}
					return proxy
				}
			}

			// --- No spec: pass through, but still catch `this` returns ---
			if (!spec) {
				return (...args: Parameters<typeof value>) => {
					const result = value.apply(target, args)
					return result === target ? proxy : result
				}
			}

			// --- Generic handler for mapped methods ---
			// The proxy handler is dynamic dispatch: args vary per intercepted method.
			// We use targeted casts inside the switch rather than a single static signature.
			return (...args: Parameters<typeof value>) => {
				const convertedArgs: Parameters<typeof value> = [...args]
				for (let i = 0; i < spec.args.length && i < convertedArgs.length; i++) {
					const kind = spec.args[i]
					const arg = convertedArgs[i]
					switch (kind) {
						case 'id':
							if (typeof arg === 'string') {
								convertedArgs[i] = ensureTldrawId(arg)
							}
							break
						case 'id-or-shape':
							convertedArgs[i] = convertIdOrShape(
								arg as string | TLShapeId | TLShape | FocusedShape
							)
							break
						case 'ids-or-shapes':
							convertedArgs[i] = convertIdsOrShapes(
								arg as Array<string | TLShapeId | TLShape | FocusedShape>
							)
							break
						case 'spread-ids':
							for (let j = i; j < convertedArgs.length; j++) {
								convertedArgs[j] = convertIdOrShape(
									convertedArgs[j] as string | TLShapeId | TLShape | FocusedShape
								)
							}
							break
					}
				}

				const result = value.apply(target, convertedArgs)
				return convertReturnValue(target, proxy, spec.ret, result)
			}
		},
	}) as Editor

	return proxy
}
