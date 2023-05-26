import { defineMigrations, ID, UnknownRecord } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { nanoid } from 'nanoid'
import { TLBaseShape } from '../shapes/shape-validation'
import { arrowShapeTypeValidator, TLArrowShape } from '../shapes/TLArrowShape'
import { bookmarkShapeTypeValidator, TLBookmarkShape } from '../shapes/TLBookmarkShape'
import { drawShapeTypeValidator, TLDrawShape } from '../shapes/TLDrawShape'
import { embedShapeTypeValidator, TLEmbedShape } from '../shapes/TLEmbedShape'
import { frameShapeTypeValidator, TLFrameShape } from '../shapes/TLFrameShape'
import { geoShapeTypeValidator, TLGeoShape } from '../shapes/TLGeoShape'
import { groupShapeTypeValidator, TLGroupShape } from '../shapes/TLGroupShape'
import { iconShapeTypeValidator, TLIconShape } from '../shapes/TLIconShape'
import { imageShapeTypeValidator, TLImageShape } from '../shapes/TLImageShape'
import { lineShapeTypeValidator, TLLineShape } from '../shapes/TLLineShape'
import { noteShapeTypeValidator, TLNoteShape } from '../shapes/TLNoteShape'
import { textShapeTypeValidator, TLTextShape } from '../shapes/TLTextShape'
import { TLVideoShape, videoShapeTypeValidator } from '../shapes/TLVideoShape'
import { SmooshedUnionObject } from '../util-types'
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
	| TLIconShape

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

/** @public */
export const shapeTypeValidator: T.Validator<TLShape> = T.model(
	'shape',
	T.union('type', {
		arrow: arrowShapeTypeValidator,
		bookmark: bookmarkShapeTypeValidator,
		draw: drawShapeTypeValidator,
		embed: embedShapeTypeValidator,
		frame: frameShapeTypeValidator,
		geo: geoShapeTypeValidator,
		group: groupShapeTypeValidator,
		image: imageShapeTypeValidator,
		line: lineShapeTypeValidator,
		note: noteShapeTypeValidator,
		text: textShapeTypeValidator,
		video: videoShapeTypeValidator,
		icon: iconShapeTypeValidator,
	})
)
