import { SerializedSchema } from '@tldraw/store'
import { TLAsset, TLBinding, TLShape, TLShapeId } from '@tldraw/tlschema'

/** @public */
export interface TLContent {
	version: 1
	shapes: TLShape[]
	bindings: TLBinding[]
	rootShapeIds: TLShapeId[]
	assets: TLAsset[]
	schema: SerializedSchema
}
