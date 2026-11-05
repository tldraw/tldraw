import type { TLRecord } from '@tldraw/tlschema'

/**
 * Drops assets no other record names, for a .tldr download. A record names an asset by holding its
 * id anywhere: a shape's assetId, or the asset ids a board collection item keeps for its content.
 */
export function pruneUnusedAssetsForTldr(records: TLRecord[]): TLRecord[] {
	const assetIds = new Set<string>(records.filter((r) => r.typeName === 'asset').map((r) => r.id))
	if (assetIds.size === 0) return records
	const usedAssets = new Set<string>()
	const visit = (value: unknown) => {
		if (typeof value === 'string') {
			if (assetIds.has(value)) usedAssets.add(value)
		} else if (value && typeof value === 'object') {
			for (const child of Object.values(value)) visit(child)
		}
	}
	for (const record of records) {
		if (record.typeName !== 'asset') visit(record)
	}
	return records.filter((r) => r.typeName !== 'asset' || usedAssets.has(r.id))
}
