import { IRequest } from 'itty-router'
import { sql } from 'kysely'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'

/** The most uploads listed: the newest ones. */
export const MAX_LISTED_UPLOADS = 200

// The upload's file name, after the client's id prefix, has non-word characters turned into
// dashes (multiplayerAssetStore), so `photo.png` is stored as `<id>-photo-png`.
const IMAGE_OBJECT_NAME = '-(png|jpe?g|gif|webp|avif|svg)$'

export interface MyUpload {
	objectName: string
	fileId: string
	/** Milliseconds since the epoch. */
	uploadedAt: number
}

export interface GetMyUploadsResponseBody {
	/** Newest first. */
	uploads: MyUpload[]
}

/**
 * The images the caller uploaded, newest first, at most MAX_LISTED_UPLOADS of them: the asset rows
 * whose `userId` is theirs, which the upload route writes for the signed-in uploader, in files that
 * aren't deleted. Copies the server makes, of uploads pasted into another file, have no `userId`,
 * so they aren't listed, and neither are the thumbnails of board library items, which the client
 * marks when it uploads them.
 */
export async function getMyUploads(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	const db = createPostgresConnectionPool(env, 'getMyUploads')
	try {
		const rows = await db
			.selectFrom('asset')
			.innerJoin('file', 'file.id', 'asset.fileId')
			.select([
				'asset.objectName',
				'asset.fileId',
				// Not on TlaAsset, though every row has it (010_add_asset_info).
				sql<number>`(extract(epoch from "asset"."uploadedAt") * 1000)::float8`.as('uploadedAt'),
			])
			.where('asset.userId', '=', auth.userId)
			.where('asset.isLibraryThumbnail', '=', false)
			.where('file.isDeleted', '=', false)
			.where(sql<boolean>`"asset"."objectName" ~* ${IMAGE_OBJECT_NAME}`)
			.orderBy(sql`"asset"."uploadedAt"`, 'desc')
			.limit(MAX_LISTED_UPLOADS)
			.execute()
		const uploads = rows.map((row) => ({ ...row, uploadedAt: Number(row.uploadedAt) }))
		return Response.json({ uploads } satisfies GetMyUploadsResponseBody)
	} finally {
		await db.destroy()
	}
}
