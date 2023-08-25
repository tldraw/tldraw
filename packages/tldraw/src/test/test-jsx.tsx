import {
	TLDefaultShape,
	TLShapeId,
	TLShapePartial,
	assert,
	assertExists,
	createShapeId,
	getIndexAbove,
	omitFromStackTrace,
} from '@tldraw/editor'

const shapeTypeSymbol = Symbol('shapeJsx')

const createElement = (tag: string) => {
	const component = () => {
		throw new Error(`Cannot render test tag ${tag}`)
	}
	;(component as any)[shapeTypeSymbol] = tag
	return component
}

type CommonProps = {
	x: number
	y: number
	id?: TLShapeId
	rotation?: number
	isLocked?: number
	ref?: string
	children?: JSX.Element | JSX.Element[]
	opacity?: number
}

type ShapeByType<Type extends TLDefaultShape['type']> = Extract<TLDefaultShape, { type: Type }>
type PropsForShape<Type extends string> = Type extends TLDefaultShape['type']
	? CommonProps & Partial<ShapeByType<Type>['props']>
	: CommonProps & Record<string, unknown>

/**
 * TL - jsx helpers for creating tldraw shapes in test cases
 */
export const TL = new Proxy(
	{},
	{
		get(target, key) {
			return createElement(key as string)
		},
	}
) as { [K in TLDefaultShape['type']]: (props: PropsForShape<K>) => null }

export function shapesFromJsx(shapes: JSX.Element | Array<JSX.Element>) {
	const ids = {} as Record<string, TLShapeId>
	const currentPageShapes: Array<TLShapePartial> = []

	function addChildren(children: JSX.Element | Array<JSX.Element>, parentId?: TLShapeId) {
		let nextIndex = 'a0'

		for (const el of Array.isArray(children) ? children : [children]) {
			const shapeType = (el.type as any)[shapeTypeSymbol] as string
			if (!shapeType) {
				throw new Error(
					`Cannot use ${el.type} as a shape. Only TL.* tags are allowed in shape jsx.`
				)
			}

			let id
			const ref = (el as any).ref as string | undefined
			if (ref) {
				assert(!ids[ref], `Duplicate shape ref: ${ref}`)
				assert(!el.props.id, `Cannot use both ref and id on shape: ${ref}`)
				id = createShapeId(ref)
				ids[ref] = id
			} else if (el.props.id) {
				id = el.props.id
			} else {
				id = createShapeId()
			}

			const x: number = assertExists(el.props.x, `Shape ${id} is missing x prop`)
			const y: number = assertExists(el.props.y, `Shape ${id} is missing y prop`)

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

			for (const [key, value] of Object.entries(el.props)) {
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

			if (el.props.children) {
				addChildren(el.props.children, id)
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
	}
}
