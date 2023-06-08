import { SerializedSchema } from '@tldraw/store'
import { TLAsset } from '../../schema/records/TLAsset'
import { TLShape, TLShapeId } from '../../schema/records/TLShape'

/** @public */
export interface TLContent {
	shapes: TLShape[]
	rootShapeIds: TLShapeId[]
	assets: TLAsset[]
	schema: SerializedSchema
}
