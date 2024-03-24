import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const stickerShapeProps = {
	w: T.number,
	h: T.number,
	kind: T.literalEnum('canonical', 'custom'),
	sticker: T.literalEnum(
		'thumbs-up',
		'thumbs-down',
		'star',
		'heart',
		'question-mark',
		'blue-circle'
	).optional(),
	url: T.optional(T.linkUrl),
}

/** @public */
export type TLStickerShapeProps = ShapePropsType<typeof stickerShapeProps>

/** @public */
export type TLStickerShape = TLBaseShape<'sticker', TLStickerShapeProps>

// const Versions = {} as const

/** @internal */
export const stickerShapeMigrations = defineMigrations({})
