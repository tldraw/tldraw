import { RoomSnapshot } from '@tldraw/sync-core'
import { getR2KeyForRoom } from './r2'
import { reconstructVersion } from './versionChainRead'

/** A past version of an app file, for duplicating it. Versions are immutable, so no persist wait. */
export async function loadFileVersionSnapshot(
	chainBucket: R2Bucket,
	fileId: string,
	timestamp: string
): Promise<RoomSnapshot | null> {
	const result = await reconstructVersion({
		chainBucket,
		roomKey: getR2KeyForRoom({ slug: fileId, isApp: true }),
		timestamp,
	})
	return result?.snapshot ?? null
}
