import { createRecordType, defineMigrations, RecordId, UnknownRecord } from '@tldraw/store'
import { mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { nanoid } from 'nanoid'
import { SchemaShapeInfo } from '../createTLSchema'
import { TLArrowShape } from '../shapes/TLArrowShape'
import { createShapeValidator, TLBaseShape } from '../shapes/TLBaseShape'
import { TLBookmarkShape } from '../shapes/TLBookmarkShape'
import { TLDrawShape } from '../shapes/TLDrawShape'
import { TLEmbedShape } from '../shapes/TLEmbedShape'
import { TLFrameShape } from '../shapes/TLFrameShape'
import { TLGeoShape } from '../shapes/TLGeoShape'
import { TLGroupShape } from '../shapes/TLGroupShape'
import { TLHighlightShape } from '../shapes/TLHighlightShape'
import { TLImageShape } from '../shapes/TLImageShape'
import { TLLineShape } from '../shapes/TLLineShape'
import { TLNoteShape } from '../shapes/TLNoteShape'
import { TLTextShape } from '../shapes/TLTextShape'
import { TLVideoShape } from '../shapes/TLVideoShape'
import { StyleProp } from '../styles/StyleProp'
import { TLPageId } from './TLPage'

/**
 * The default set of shapes that are available in the editor.
 *
 * @public */
export type TLDefaultShape =
	| TLArrowShape
	| TLBookmarkShape
	| TLDrawShape
	| TLEmbedShape
	| TLFrameShape
	| TLGeoShape
	| TLGroupShape
	| TLImageShape
	| TLLineShape
	| TLNoteShape
	| TLTextShape
	| TLVideoShape
	| TLHighlightShape

/**
 * A type for a shape that is available in the editor but whose type is
 * unknown—either one of the editor's default shapes or else a custom shape.
 *
 * @public */
export type TLUnknownShape = TLBaseShape<string, object>

/**
 * The set of all shapes that are available in the editor, including unknown shapes.
 *
 * @public
 */
export type TLShape = TLDefaultShape | TLUnknownShape

/** @public */
export type TLShapePartial<T extends TLShape = TLShape> = T extends T
	? {
			id: TLShapeId
			type: T['type']
			props?: Partial<T['props']>
			meta?: Partial<T['meta']>
	  } & Partial<Omit<T, 'type' | 'id' | 'props' | 'meta'>>
	: never

/** @public */
export type TLShapeId = RecordId<TLUnknownShape>

// evil type shit that will get deleted in the next PR
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never

type Identity<T> = { [K in keyof T]: T[K] }

/** @public */
export type TLShapeProps = Identity<UnionToIntersection<TLDefaultShape['props']>>

/** @public */
export type TLShapeProp = keyof TLShapeProps

/** @public */
export type TLParentId = TLPageId | TLShapeId

/** @internal */
export const rootShapeVersions = {
	AddIsLocked: 1,
	HoistOpacity: 2,
	AddMeta: 3,
} as const

/** @internal */
export const rootShapeMigrations = defineMigrations({
	currentVersion: rootShapeVersions.AddMeta,
	migrators: {
		[rootShapeVersions.AddIsLocked]: {
			up: (record) => {
				return {
					...record,
					isLocked: false,
				}
			},
			down: (record) => {
				const { isLocked: _, ...rest } = record
				return {
					...rest,
				}
			},
		},
		[rootShapeVersions.HoistOpacity]: {
			up: ({ props: { opacity, ...props }, ...record }) => {
				return {
					...record,
					opacity: Number(opacity ?? '1'),
					props,
				}
			},
			down: ({ opacity, ...record }) => {
				return {
					...record,
					props: {
						...record.props,
						opacity:
							opacity < 0.175
								? '0.1'
								: opacity < 0.375
								? '0.25'
								: opacity < 0.625
								? '0.5'
								: opacity < 0.875
								? '0.75'
								: '1',
					},
				}
			},
		},
		[rootShapeVersions.AddMeta]: {
			up: (record) => {
				return {
					...record,
					meta: {},
				}
			},
			down: ({ meta: _, ...record }) => {
				return {
					...record,
				}
			},
		},
	},
})

/** @public */
export function isShape(record?: UnknownRecord): record is TLShape {
	if (!record) return false
	return record.typeName === 'shape'
}

/** @public */
export function isShapeId(id?: string): id is TLShapeId {
	if (!id) return false
	return id.startsWith('shape:')
}

/** @public */
export function createShapeId(id?: string): TLShapeId {
	return `shape:${id ?? nanoid()}` as TLShapeId
}

/** @internal */
export function getShapePropKeysByStyle(props: Record<string, T.Validatable<any>>) {
	const propKeysByStyle = new Map<StyleProp<unknown>, string>()
	for (const [key, prop] of Object.entries(props)) {
		if (prop instanceof StyleProp) {
			if (propKeysByStyle.has(prop)) {
				throw new Error(
					`Duplicate style prop ${prop.id}. Each style prop can only be used once within a shape.`
				)
			}
			propKeysByStyle.set(prop, key)
		}
	}
	return propKeysByStyle
}

/** @internal */
export function createShapeRecordType(shapes: Record<string, SchemaShapeInfo>) {
	return createRecordType<TLShape>('shape', {
		migrations: defineMigrations({
			currentVersion: rootShapeMigrations.currentVersion,
			firstVersion: rootShapeMigrations.firstVersion,
			migrators: rootShapeMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: mapObjectMapValues(shapes, (_, v) => v.migrations ?? defineMigrations({})),
		}),
		scope: 'document',
		validator: T.model(
			'shape',
			T.union(
				'type',
				mapObjectMapValues(shapes, (type, { props, meta }) =>
					createShapeValidator(type, props, meta)
				)
			)
		),
	}).withDefaultProperties(() => ({
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
	}))
}
