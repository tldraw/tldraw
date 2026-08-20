import { can } from '@tldraw/dotcom-shared'
import { handleUserAssetUpload } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getAuth } from '../../utils/tla/getAuth'
import { getRole } from '../../utils/tla/getRole'

export async function upload(request: IRequest, env: Environment): Promise<Response> {
	const { body, url, headers } = request
	const auth = await getAuth(request, env)
	const userId = auth?.userId || null
	const searchParams = new URL(url).searchParams
	const fileId = searchParams.get('fileId')
	if (!fileId) return Response.json({ error: 'File id is required' }, { status: 400 })

	const db = createPostgresConnectionPool(env, 'sync-worker')
	let canWrite = false
	try {
		const file = await db
			.selectFrom('file')
			.where('id', '=', fileId)
			.select(['ownerId', 'owningGroupId', 'shared', 'sharedLinkType', 'isDeleted'])
			.executeTakeFirst()
		// Same write gate as the tldrawusercontent upload path (Worker.validateUpload): existence
		// alone would let anyone associate an object with someone else's file.
		if (file && !file.isDeleted) {
			if (userId && file.ownerId === userId) {
				canWrite = true
			} else if (file.shared && file.sharedLinkType === 'edit') {
				canWrite = true
			} else if (userId && file.owningGroupId) {
				canWrite = can(await getRole(db, userId, file.owningGroupId), 'accessFiles')
			}
		}
	} finally {
		await db.destroy()
	}
	if (!canWrite) {
		return Response.json({ error: 'Could not upload the file' }, { status: 403 })
	}

	const objectName = request.params.objectName
	if (!objectName) return Response.json({ error: 'Object name is required' }, { status: 400 })

	const res = await handleUserAssetUpload({
		body,
		headers,
		bucket: env.UPLOADS,
		objectName,
	})
	if (res.status === 200) {
		await env.QUEUE.send({ type: 'asset-upload', objectName, fileId, userId })
	}
	return res
}
