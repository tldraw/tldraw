import { handleUserAssetUpload } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'

export async function upload(request: IRequest, env: Environment): Promise<Response> {
	const { body, url, headers } = request
	const searchParams = new URL(url).searchParams
	const fileId = searchParams.get('fileId')
	if (!fileId) return Response.json({ error: 'File id is required' }, { status: 400 })

	const objectName = request.params.objectName
	if (!objectName) return Response.json({ error: 'Object name is required' }, { status: 400 })

	const res = await handleUserAssetUpload({
		body,
		headers,
		bucket: env.UPLOADS,
		objectName: request.params.objectName,
	})
	if (res.status === 200) {
		const db = createPostgresConnectionPool(env, 'sync-worker')
		await db.insertInto('asset').values({ objectName, fileId }).execute()
	}
	return res
}
