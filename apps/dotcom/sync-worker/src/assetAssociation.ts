import { uniqueId } from '@tldraw/utils'
import { isValidR2ObjectName } from '@tldraw/worker-shared'

export interface AssetToReplace {
	objectName: string
	newObjectName: string
	newSrc: string
	assetId: string
}

export interface AssetToMigrate {
	assetId: string
	newSrc: string
}

/**
 * The uploads-bucket object name an asset's src points at, or null for assets the
 * association pass can never act on: bookmark assets (their src is the bookmarked page URL,
 * not an uploads object), non-http srcs, and object names R2 would reject. Shared with the
 * admin asset diagnostics so its `external` count matches what the pass actually skips.
 */
export function getUploadObjectName(asset: {
	type?: string
	props?: { src?: string | null }
}): string | null {
	if (asset.type === 'bookmark') return null
	const src = asset.props?.src
	if (!src || !src.startsWith('http')) return null
	const objectName = src.split('/').pop()
	if (!objectName || !isValidR2ObjectName(objectName)) return null
	return objectName
}

/**
 * Decides which asset records an association pass should act on. Assets `getUploadObjectName`
 * rejects are skipped entirely so the pass doesn't re-attempt them on every run; `skipObjectNames`
 * (objects a previous pass already found missing from the uploads bucket) only gates the copy
 * path — URL migration is a string rewrite and needs no R2 access.
 */
export function collectAssetAssociationChanges(
	records: Iterable<unknown>,
	{
		slug,
		userContentUrl,
		skipObjectNames,
	}: {
		slug: string
		userContentUrl: string
		skipObjectNames?: ReadonlySet<string>
	}
): { assetsToReplace: AssetToReplace[]; assetsToMigrate: AssetToMigrate[] } {
	const assetsToReplace: AssetToReplace[] = []
	const assetsToMigrate: AssetToMigrate[] = []
	for (const record of records) {
		if ((record as any).typeName !== 'asset') continue
		const asset = record as any
		const objectName = getUploadObjectName(asset)
		if (!objectName) continue
		const meta = asset.meta
		const src = asset.props.src

		// Migrate old-format HTTP URLs to tldrawusercontent.com (same R2 bucket, no copy needed)
		if (meta?.fileId === slug && !src.startsWith(userContentUrl)) {
			assetsToMigrate.push({
				assetId: asset.id,
				newSrc: `${userContentUrl}/${objectName}`,
			})
			continue
		}

		if (meta?.fileId === slug) continue
		if (skipObjectNames?.has(objectName)) continue

		const split = objectName.split('-')
		const fileType = split.length > 1 ? split.pop() : null
		const id = uniqueId()
		const newObjectName = fileType ? `${id}-${fileType}` : id
		assetsToReplace.push({
			objectName,
			newObjectName,
			assetId: asset.id,
			newSrc: `${userContentUrl}/${newObjectName}`,
		})
	}
	return { assetsToReplace, assetsToMigrate }
}
