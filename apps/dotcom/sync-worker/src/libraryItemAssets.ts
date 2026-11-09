import { collectAssetAssociationChanges } from './assetAssociation'
import { Environment } from './types'

/** Library item content as stored: a TLLibraryItemContent, read only as far as its assets. */
export interface StoredItemContent {
	formatVersion: 1
	content: { assets?: unknown[]; [key: string]: unknown }
}

/**
 * Gives an item its own copy of each uploaded file its content refers to, so deleting the board
 * it was saved from, or the item it was copied from, can't break it. The uploads it copies, and how
 * it names the copies, are the ones a board's asset association pass would copy (see
 * collectAssetAssociationChanges); each asset's src is pointed at its copy and its `fileId` is
 * dropped, so a board the item is placed on makes a copy of its own. An asset whose object is
 * missing is left as it was.
 *
 * Returns the content to store and the names of the objects the item now owns. If a copy fails,
 * the copies already made are deleted and the error rethrown.
 */
export async function copyItemAssets(
	env: Environment,
	stored: StoredItemContent,
	itemId: string
): Promise<{ content: StoredItemContent; ownedObjectNames: string[] }> {
	const assets = stored.content.assets ?? []
	const userContentUrl = env.USER_CONTENT_URL
	if (assets.length === 0 || !userContentUrl) return { content: stored, ownedObjectNames: [] }

	const { assetsToReplace } = collectAssetAssociationChanges(assets, {
		slug: itemId,
		userContentUrl,
	})
	const newSrcByAssetId = new Map<string, string>()
	const ownedObjectNames: string[] = []
	try {
		for (const asset of assetsToReplace) {
			const object = await env.UPLOADS.get(asset.objectName)
			if (!object) continue
			await env.UPLOADS.put(asset.newObjectName, object.body, { httpMetadata: object.httpMetadata })
			ownedObjectNames.push(asset.newObjectName)
			newSrcByAssetId.set(asset.assetId, asset.newSrc)
		}
	} catch (error) {
		if (ownedObjectNames.length > 0) await env.UPLOADS.delete(ownedObjectNames)
		throw error
	}

	const content = {
		...stored,
		content: {
			...stored.content,
			assets: assets.map((record) => {
				const asset = record as { id: string; props: object; meta?: Record<string, unknown> }
				const newSrc = newSrcByAssetId.get(asset.id)
				if (!newSrc) return record
				const { fileId: _, ...meta } = asset.meta ?? {}
				return { ...asset, props: { ...asset.props, src: newSrc }, meta }
			}),
		},
	}
	return { content, ownedObjectNames }
}
