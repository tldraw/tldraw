import { RoomSnapshot } from '@tldraw/sync-core'

// Lives in its own module (rather than getSocialPreview.ts) so the thumbnail/OG surfaces can read
// board names without importing getSocialPreview, which itself depends on the thumbnail modules —
// keeping the import graph acyclic.
export function getDocumentNameFromSnapshot(
	snapshot: RoomSnapshot | undefined | null
): string | null {
	if (!snapshot?.documents) return null
	for (const { state } of snapshot.documents) {
		if (state && (state as any).typeName === 'document') {
			return cleanName((state as any).name)
		}
	}
	return null
}

export function cleanName(name: string | null | undefined): string | null {
	const trimmed = name?.trim()
	return trimmed ? trimmed : null
}
