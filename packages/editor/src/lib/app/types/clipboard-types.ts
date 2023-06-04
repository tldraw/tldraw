import { SerializedSchema } from '@tldraw/store'
import { TLAsset, TLShape, TLShapeId } from '@tldraw/tlschema'

/** @public */
export interface TLClipboardModel {
	shapes: TLShape[]
	rootShapeIds: TLShapeId[]
	assets: TLAsset[]
	schema: SerializedSchema
}

/** @public */
export type ClipboardPayload =
	| {
			data: TLClipboardModel
			kind: 'content'
			type: 'application/tldraw'
	  }
	| {
			data: string
			kind: 'text'
			type: 'application/tldraw'
	  }
	| {
			data: string
			kind: 'file'
			type: 'application/tldraw'
	  }
