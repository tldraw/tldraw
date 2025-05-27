import {
	AssetRecordType,
	TLAsset,
	TLAssetId,
	TLBinding,
	TLBindingCreate,
	TLBindingId,
	TLDefaultBinding,
	TLDefaultShape,
	TLShapeId,
	TLShapePartial,
	ZERO_INDEX_KEY,
	assert,
	createBindingId,
	createShapeId,
	getIndexAbove,
	isShapeId,
	mapObjectMapValues,
	omitFromStackTrace,
} from '@tldraw/editor'
import React, { Fragment } from 'react'

const shapeTypeSymbol = Symbol('shapeJsx')
const assetTypeSymbol = Symbol('assetJsx')
const bindingTypeSymbol = Symbol('bindingJsx')
interface CommonShapeProps {
	x?: number
	y?: number
	id?: TLShapeId
	rotation?: number
	isLocked?: number
	ref?: string
	children?: React.JSX.Element | React.JSX.Element[]
	opacity?: number
}

type ShapeByType<Type extends TLDefaultShape['type']> = Extract<TLDefaultShape, { type: Type }>
type FormatShapeProps<Props extends object> = {
	[K in keyof Props]?: Props[K] extends TLAssetId
		? TLAssetId | React.JSX.Element
		: Props[K] extends TLAssetId | null
			? TLAssetId | React.JSX.Element | null
			: Props[K]
}
type PropsForShape<Type extends string> = Type extends TLDefaultShape['type']
	? CommonShapeProps & FormatShapeProps<ShapeByType<Type>['props']>
	: CommonShapeProps & Record<string, unknown>

type AssetByType<Type extends TLAsset['type']> = Extract<TLAsset, { type: Type }>
type PropsForAsset<Type extends string> = Type extends TLAsset['type']
	? Partial<AssetByType<Type>['props']>
	: Record<string, unknown>

interface CommonBindingProps {
	from?: string | TLShapeId
	to: string | TLShapeId
}

type BindingByType<Type extends TLBinding['type']> = Extract<TLBinding, { type: Type }>
type PropsForBinding<Type extends string> = Type extends TLBinding['type']
	? CommonBindingProps & Partial<BindingByType<Type>['props']>
	: CommonBindingProps & Record<string, unknown>

const createElement = (
	type: typeof shapeTypeSymbol | typeof assetTypeSymbol | typeof bindingTypeSymbol,
	tag: string
) => {
	const component = () => {
		throw new Error(`Cannot render test tag ${tag}`)
	}
	;(component as any)[type] = tag
	return component
}
const tlAsset = new Proxy(
	{},
	{
		get(target, key) {
			return createElement(assetTypeSymbol, key as string)
		},
	}
) as { [K in TLAsset['type']]: (props: PropsForAsset<K>) => null } & Record<
	string,
	(props: PropsForAsset<string>) => null
>

const tlBinding = new Proxy(
	{},
	{
		get(target, key) {
			return createElement(bindingTypeSymbol, key as string)
		},
	}
) as { [K in TLDefaultBinding['type']]: (props: PropsForBinding<K>) => null } & Record<
	string,
	(props: PropsForBinding<string>) => null
>

/**
 * TL - jsx helpers for creating tldraw shapes in test cases
 */
export const TL = new Proxy(
	{},
	{
		get(target, key) {
			if (key === 'asset') {
				return tlAsset
			}
			if (key === 'binding') {
				return tlBinding
			}
			return createElement(shapeTypeSymbol, key as string)
		},
	}
) as { asset: typeof tlAsset; binding: typeof tlBinding } & {
	[K in TLDefaultShape['type']]: (props: PropsForShape<K>) => null
} & Record<string, (props: PropsForShape<string>) => null>

export function shapesFromJsx(shapes: React.JSX.Element | Array<React.JSX.Element>, idPrefix = '') {
	const ids = { bindings: {} } as Record<string, TLShapeId> & {
		bindings: Record<string, TLBindingId>
	}
	const currentPageShapes: Array<TLShapePartial> = []
	const assets: Array<TLAsset> = []

	const bindingsToCreate: Array<{
		type: string
		props: Record<string, unknown>
		parentId: TLShapeId | undefined
		ref: string | undefined
	}> = []

	function addChildren(
		children: React.JSX.Element | Array<React.JSX.Element>,
		parentId?: TLShapeId
	) {
		let nextIndex = ZERO_INDEX_KEY

		for (const el of Array.isArray(children) ? children : [children]) {
			if (
				el.type === Fragment ||
				(el.type &&
					typeof el.type === 'object' &&
					'__pw_jsx_fragment' in el.type &&
					el.type.__pw_jsx_fragment === true)
			) {
				addChildren(el.props.children, parentId)
				continue
			}

			if (el.type[assetTypeSymbol]) {
				throw new Error('TL.asset types can only be used as props')
			}

			if (el.type[bindingTypeSymbol]) {
				const bindingType = (el.type as any)[bindingTypeSymbol] as string
				const ref = ((el as any).ref || el.props.ref) as string | undefined
				assert(ref === undefined || typeof ref === 'string', 'ref must be string or undefined')
				bindingsToCreate.push({ type: bindingType, props: el.props, parentId, ref })
			} else {
				const shapeType = (el.type as any)[shapeTypeSymbol] as string
				if (!shapeType) {
					throw new Error(
						`Cannot use ${el.type} as a shape. Only TL.* tags are allowed in shape jsx.`
					)
				}

				const props: any = mapObjectMapValues(el.props, (key: string, value: any) => {
					if (key === 'children' || !value || typeof value !== 'object' || !value.type) return value
					if (value.type[shapeTypeSymbol]) {
						throw new Error("TL.* shape types can't be used as props.")
					}
					const assetType = (value.type as any)[assetTypeSymbol] as string
					if (!assetType) {
						return value
					}

					// inline assets:
					const asset = AssetRecordType.create({
						type: assetType as TLAsset['type'],
						props: value.props as any,
					})

					assets.push(asset)

					return asset.id
				})

				let id
				const ref = ((el as any).ref || props.ref) as string | undefined
				if (ref) {
					assert(!ids[ref], `Duplicate ref: ${ref}`)
					assert(!props.id, `Cannot use both ref and id on shape: ${ref}`)
					id = createShapeId(`${idPrefix}${ref}`)
					ids[ref] = id
				} else if (props.id) {
					id = props.id
				} else {
					id = createShapeId()
				}

				const x: number = props.x ?? 0
				const y: number = props.y ?? 0

				const shapePartial = {
					id,
					type: shapeType,
					x,
					y,
					index: nextIndex,
					props: {},
				} as TLShapePartial

				nextIndex = getIndexAbove(nextIndex)

				if (parentId) {
					shapePartial.parentId = parentId
				}

				for (const [key, value] of Object.entries(props)) {
					if (key === 'x' || key === 'y' || key === 'ref' || key === 'id' || key === 'children') {
						continue
					}
					if (key === 'rotation' || key === 'isLocked' || key === 'opacity') {
						shapePartial[key] = value as any
						continue
					}
					;(shapePartial.props as Record<string, unknown>)[key] = value
				}

				currentPageShapes.push(shapePartial)

				if (props.children) {
					addChildren(props.children, id)
				}
			}
		}
	}

	addChildren(shapes)

	const bindings: TLBindingCreate[] = []
	for (const binding of bindingsToCreate) {
		let fromId: TLShapeId, toId: TLShapeId
		if (binding.props.from) {
			assert(typeof binding.props.from === 'string', 'from must be a ref string or a shape id')
			if (isShapeId(binding.props.from)) {
				fromId = binding.props.from
			} else {
				assert(ids[binding.props.from], `Ref not found: ${binding.props.from}`)
				fromId = ids[binding.props.from]
			}
		} else if (binding.parentId) {
			fromId = binding.parentId
		} else {
			throw new Error('from must be specified, or binding must be a child of a shape')
		}

		assert(binding.props.to, 'to must be specified')
		assert(typeof binding.props.to === 'string', 'to must be a ref string or a shape id')
		if (isShapeId(binding.props.to)) {
			toId = binding.props.to
		} else {
			assert(ids[binding.props.to], `Ref not found: ${binding.props.to}`)
			toId = ids[binding.props.to]
		}

		let bindingId: TLBindingId = binding.props.id as TLBindingId
		if (binding.ref) {
			assert(typeof binding.ref === 'string', 'binding ref must be string')
			assert(!ids.bindings[binding.ref], `Duplicate ref: ${binding.ref}`)
			assert(!bindingId, `Cannot use both ref and id on binding: ${binding.ref}`)
			bindingId = createBindingId(`${idPrefix}${binding.ref}`)
			ids.bindings[binding.ref] = bindingId
		}
		if (!bindingId) {
			bindingId = createBindingId()
		}

		const props = { ...binding.props }
		delete props.ref
		delete props.id
		delete props.from
		delete props.to

		bindings.push({
			id: bindingId,
			type: binding.type,
			fromId,
			toId,
			props,
		})
	}

	return {
		ids: new Proxy(ids, {
			get: omitFromStackTrace((target, key) => {
				if (!(key in target)) {
					throw new Error(
						`Cannot access ID '${String(
							key
						)}'. No ref with that name was specified.\nAvailable refs: ${Object.keys(ids).join(
							', '
						)}`
					)
				}
				return target[key as string]
			}),
		}),
		shapes: currentPageShapes,
		assets,
		bindings,
	}
}
