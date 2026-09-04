import { handleUserAssetUpload } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getAuth } from '../../utils/tla/getAuth'
import { hasWriteAccessToFile } from '../../utils/tla/hasWriteAccessToFile'

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
		canWrite = await hasWriteAccessToFile(db, fileId, userId)
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
