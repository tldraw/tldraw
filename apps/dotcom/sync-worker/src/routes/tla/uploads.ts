import { handleUserAssetUpload } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getUserDurableObject } from '../../utils/durableObjects'
import { getAuthFromCookies } from '../../utils/tla/getAuth'

export async function upload(request: IRequest, env: Environment): Promise<Response> {
	const auth = await getAuthFromCookies(request, env)
	if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

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
		const stub = getUserDurableObject(env, auth.userId)
		await stub.associateFileAsset(objectName, fileId)
	}
	return res
}
