import {
	AssetRecordType,
	TLAsset,
	TLAssetId,
	TLDefaultShape,
	TLShapeId,
	TLShapePartial,
	ZERO_INDEX_KEY,
	assert,
	createShapeId,
	getIndexAbove,
	mapObjectMapValues,
	omitFromStackTrace,
} from '@tldraw/editor'
import React, { Fragment } from 'react'

const shapeTypeSymbol = Symbol('shapeJsx')
const assetTypeSymbol = Symbol('assetJsx')

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

const createElement = (type: typeof shapeTypeSymbol | typeof assetTypeSymbol, tag: string) => {
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
			return createElement(shapeTypeSymbol, key as string)
		},
	}
) as { asset: typeof tlAsset } & {
	[K in TLDefaultShape['type']]: (props: PropsForShape<K>) => null
} & Record<string, (props: PropsForShape<string>) => null>

export function shapesFromJsx(shapes: React.JSX.Element | Array<React.JSX.Element>) {
	const ids = {} as Record<string, TLShapeId>
	const currentPageShapes: Array<TLShapePartial> = []
	const assets: Array<TLAsset> = []

	function addChildren(
		children: React.JSX.Element | Array<React.JSX.Element>,
		parentId?: TLShapeId
	) {
		let nextIndex = ZERO_INDEX_KEY

		for (const el of Array.isArray(children) ? children : [children]) {
			if (el.type === Fragment) {
				addChildren(el.props.children, parentId)
				continue
			}

			if (el.type[assetTypeSymbol]) {
				throw new Error('TL.asset types can only be used as props')
			}
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
			const ref = (el as any).ref as string | undefined
			if (ref) {
				assert(!ids[ref], `Duplicate ref: ${ref}`)
				assert(!props.id, `Cannot use both ref and id on shape: ${ref}`)
				id = createShapeId(ref)
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

	addChildren(shapes)

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
	}
}
