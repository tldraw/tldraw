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
 * Decides which asset records an association pass should act on. Assets that can never be
 * associated are skipped entirely so the pass doesn't re-attempt them on every run:
 * bookmark assets (their src is the bookmarked page URL, not an uploads object), non-http
 * srcs, object names R2 would reject, and `skipObjectNames` (objects a previous pass
 * already found missing from the uploads bucket).
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
		if (asset.type === 'bookmark') continue
		const meta = asset.meta
		const src = asset.props.src
		if (!src || !src.startsWith('http')) continue

		// Migrate old-format HTTP URLs to tldrawusercontent.com (same R2 bucket, no copy needed)
		if (meta?.fileId === slug && !src.startsWith(userContentUrl)) {
			const objectName = src.split('/').pop()
			if (objectName) {
				assetsToMigrate.push({
					assetId: asset.id,
					newSrc: `${userContentUrl}/${objectName}`,
				})
			}
			continue
		}

		if (meta?.fileId === slug) continue
		const objectName = src.split('/').pop()
		if (!objectName || !isValidR2ObjectName(objectName)) continue
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
