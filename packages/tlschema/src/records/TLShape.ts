import { defineMigrations, ID, UnknownRecord } from '@tldraw/tlstore'
import { nanoid } from 'nanoid'
import { TLBaseShape } from '../shapes/shape-validation'
import { TLArrowShape } from '../shapes/TLArrowShape'
import { TLBookmarkShape } from '../shapes/TLBookmarkShape'
import { TLDrawShape } from '../shapes/TLDrawShape'
import { TLEmbedShape } from '../shapes/TLEmbedShape'
import { TLFrameShape } from '../shapes/TLFrameShape'
import { TLGeoShape } from '../shapes/TLGeoShape'
import { TLGroupShape } from '../shapes/TLGroupShape'
import { TLIconShape } from '../shapes/TLIconShape'
import { TLImageShape } from '../shapes/TLImageShape'
import { TLLineShape } from '../shapes/TLLineShape'
import { TLNoteShape } from '../shapes/TLNoteShape'
import { TLTextShape } from '../shapes/TLTextShape'
import { TLVideoShape } from '../shapes/TLVideoShape'
import { SmooshedUnionObject } from '../util-types'
import { TLPageId } from './TLPage'

/** @public */
export type TLUnknownShape = TLBaseShape<string, object>

/**
 * TLShape
 *
 * @public
 */
export type TLShape =
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
	| TLUnknownShape
	| TLIconShape

/** @public */
export type TLShapeType = TLShape['type']

/** @public */
export type TLShapePartial<T extends TLShape = TLShape> = T extends T
	? {
			id: TLShapeId
			type: T['type']
			props?: Partial<T['props']>
	  } & Partial<Omit<T, 'type' | 'id' | 'props'>>
	: never

/** @public */
export type TLShapeId = ID<TLUnknownShape>

/** @public */
export type TLShapeProps = SmooshedUnionObject<TLShape['props']>

/** @public */
export type TLShapeProp = keyof TLShapeProps

/** @public */
export type TLParentId = TLPageId | TLShapeId

/** @public */
export type TLNullableShapeProps = { [K in TLShapeProp]?: TLShapeProps[K] | null }

const Versions = {
	AddIsLocked: 1,
} as const

/** @internal */
export const rootShapeTypeMigrations = defineMigrations({
	currentVersion: Versions.AddIsLocked,
	migrators: {
		[Versions.AddIsLocked]: {
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
export function createShapeId(): TLShapeId {
	return `shape:${nanoid()}` as TLShapeId
}

/** @public */
export function createCustomShapeId(id: string): TLShapeId {
	return `shape:${id}` as TLShapeId
}
