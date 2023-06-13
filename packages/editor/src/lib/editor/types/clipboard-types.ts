import { VecLike } from '@tldraw/primitives'
import { SerializedSchema } from '@tldraw/store'
import { TLAsset, TLShape, TLShapeId } from '@tldraw/tlschema'

/** @public */
export interface TLContent {
	shapes: TLShape[]
	rootShapeIds: TLShapeId[]
	assets: TLAsset[]
	schema: SerializedSchema
}

/**
 * Options for placing content into the editor.
 * @param point - Where to place the content.
 * @param select - Whether to select the placed content.
 * @param preservePosition - Whether to preserve the position of the content.
 * @param preserveIds - Whether to preserve the ids of the content.
 * @public
 */
export interface TLPutContentOptions {
	point?: VecLike
	select?: boolean
	preservePosition?: boolean
	preserveIds?: boolean
}
