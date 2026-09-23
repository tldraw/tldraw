import type { StoreSnapshot } from '@tldraw/store'
import {
	createBindingId,
	createShapeId,
	TLAsset,
	TLAssetId,
	TLBinding,
	TLBindingId,
	TLImageAsset,
	TLRecord,
	TLShape,
	TLShapeId,
	TLUser,
	TLVideoAsset,
} from '@tldraw/tlschema'
import { assertExists, structuredClone } from '@tldraw/utils'
import type { TLContent } from '../types/clipboard-types'

// Pure content-placement data work: the record shuffling that putContentOntoCurrentPage does
// around its store reads and writes. Editor keeps the reads, the writes, and every shape util
// callback, so nothing in this file may read editor state.

export interface PartitionedContentRecords {
	assets: TLAsset[]
	shapes: TLShape[]
	bindings: TLBinding[]
	users: TLUser[]
}

/** Treat the content's records as a store snapshot so the store's schema can migrate it. */
export function toContentStoreSnapshot(content: TLContent): StoreSnapshot<TLRecord> {
	return {
		store: {
			...Object.fromEntries(content.assets.map((asset) => [asset.id, asset] as const)),
			...Object.fromEntries(content.shapes.map((shape) => [shape.id, shape] as const)),
			...Object.fromEntries(
				content.bindings?.map((bindings) => [bindings.id, bindings] as const) ?? []
			),
			...Object.fromEntries(content.users?.map((user) => [user.id, user] as const) ?? []),
		},
		schema: content.schema!,
	}
}

/** Sort migrated content records into the record types the put deals with separately. */
export function partitionContentRecords(records: TLRecord[]): PartitionedContentRecords {
	const assets: TLAsset[] = []
	const shapes: TLShape[] = []
	const bindings: TLBinding[] = []
	const users: TLUser[] = []

	for (const record of records) {
		switch (record.typeName) {
			case 'asset': {
				assets.push(record)
				break
			}
			case 'shape': {
				shapes.push(record)
				break
			}
			case 'binding': {
				bindings.push(record)
				break
			}
			case 'user': {
				users.push(record)
				break
			}
		}
	}

	return { assets, shapes, bindings, users }
}

/**
 * Map each content id to the id it will be created under. When ids are preserved the shape keeps
 * its identity, so the maps are the identity too.
 */
export function createContentIdMaps(
	shapes: TLShape[],
	bindings: TLBinding[],
	preserveIds: boolean
) {
	const shapeIdMap = new Map<string, TLShapeId>(
		preserveIds
			? shapes.map((shape) => [shape.id, shape.id])
			: shapes.map((shape) => [shape.id, createShapeId()])
	)
	const bindingIdMap = new Map<string, TLBindingId>(
		preserveIds
			? bindings.map((binding) => [binding.id, binding.id])
			: bindings.map((binding) => [binding.id, createBindingId()])
	)
	return { shapeIdMap, bindingIdMap }
}

/** Point the content's bindings at the ids their shapes are being created under. */
export function remapContentBindings(
	bindings: TLBinding[],
	shapeIdMap: Map<string, TLShapeId>,
	bindingIdMap: Map<string, TLBindingId>
): TLBinding[] {
	return bindings.map((oldBinding) => ({
		...oldBinding,
		id: assertExists(bindingIdMap.get(oldBinding.id)),
		fromId: assertExists(shapeIdMap.get(oldBinding.fromId)),
		toId: assertExists(shapeIdMap.get(oldBinding.toId)),
	}))
}

export interface TriagedContentAssets {
	assetsToCreate: TLAsset[]
	/** Assets whose src is a data url; they need hosting before the created copy can use them. */
	assetsToUpdate: (TLImageAsset | TLVideoAsset)[]
}

/** Split the content's assets into the ones to create as-is and the ones whose src needs hosting. */
export function triageContentAssets(
	assets: TLAsset[],
	existingAssetIds: ReadonlySet<TLAssetId>
): TriagedContentAssets {
	const assetsToCreate: TLAsset[] = []
	const assetsToUpdate: (TLImageAsset | TLVideoAsset)[] = []

	for (const asset of assets) {
		if (existingAssetIds.has(asset.id)) {
			// We already have this asset
			continue
		}

		if (
			(asset.type === 'image' && asset.props.src?.startsWith('data:image')) ||
			(asset.type === 'video' && asset.props.src?.startsWith('data:video'))
		) {
			// it's src is a base64 image or video; we need to create a new asset without the src,
			// then create a new asset from the original src. So we keep the original asset for the
			// upload and create a copy with its src removed. Copy rather than mutate: when no
			// migration applies, migrateStoreSnapshot hands back the caller's own record objects.
			assetsToUpdate.push(asset as TLImageAsset | TLVideoAsset)
			const assetWithoutSrc = structuredClone(asset as TLImageAsset | TLVideoAsset)
			assetWithoutSrc.props.src = null
			assetsToCreate.push(assetWithoutSrc)
			continue
		}

		// Add the asset to the list of assets to create
		assetsToCreate.push(asset)
	}

	return { assetsToCreate, assetsToUpdate }
}
