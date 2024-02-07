import { SerializedSchema, SerializedStore } from '@tldraw/store'
import {
	DocumentRecordType,
	PageRecordType,
	TLAsset,
	TLPageId,
	TLRecord,
	TLShape,
	TLShapeId,
	isPageId,
} from '@tldraw/tlschema'
import { getIndexAbove } from '../../utils/reordering/reordering'

/**
 * @public
 * @deprecated Use `TLContentV1` instead
 */
export interface TLContentV0 {
	shapes: TLShape[]
	rootShapeIds: TLShapeId[]
	assets: TLAsset[]
	schema: SerializedSchema
}

/** @public */
export interface TLContentV1 {
	version: 1
	rootShapeIds: TLShapeId[]
	snapshot: {
		schema: SerializedSchema
		store: SerializedStore<TLRecord>
	}
}

/** @public */
// eslint-disable-next-line deprecation/deprecation
export type TLContent = TLContentV0 | TLContentV1

export function migrateContent(content: TLContent): TLContentV1 {
	if ('version' in content) {
		return content
	}
	// The old schema migration system was fundamentally flawed and it allowed
	// us to migrate the assets and shapes independently. But the new migrations
	// system requires operating on the whole store at once apart from in carefully
	// controlled circumstances.
	// So to adapt the old version of the TLContent type to the new version,
	// we need to embed the shapes and assets in a 'realistic' store snapshot including
	// pages and the document type and whatnot.
	const referencedPageIds = new Set<TLPageId>()
	for (const shape of content.shapes) {
		if (isPageId(shape.parentId)) {
			referencedPageIds.add(shape.parentId)
		}
	}
	let index = 'a1'
	const fakePages = Array.from(referencedPageIds).map((id) => {
		index = getIndexAbove(index)
		return PageRecordType.create({
			id,
			index,
			name: 'Page',
		})
	})
	return {
		version: 1,
		rootShapeIds: content.rootShapeIds,
		snapshot: {
			schema: content.schema,
			store: Object.fromEntries(
				[DocumentRecordType.create({}), ...fakePages, ...content.shapes, ...content.assets].map(
					(r) => [r.id, r]
				)
			),
		},
	}
}
