import { handleUserAssetUpload } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getUserDurableObject } from '../../utils/durableObjects'
import { getAuth } from '../../utils/tla/getAuth'

export async function upload(request: IRequest, env: Environment): Promise<Response> {
	const auth = await getAuth(request, env)
	if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
	console.log('have auth')

	const { body, url, headers } = request
	const searchParams = new URL(url).searchParams
	const fileId = searchParams.get('fileId')
	if (!fileId) return Response.json({ error: 'File id is required' }, { status: 400 })
	console.log('have file id', fileId)

	const objectName = request.params.objectName
	if (!objectName) return Response.json({ error: 'Object name is required' }, { status: 400 })
	console.log('have object name', objectName)

	const res = await handleUserAssetUpload({
		body,
		headers,
		bucket: env.UPLOADS,
		objectName: request.params.objectName,
	})
	console.log('💡[185]: uploads.ts:22: res=', res)
	if (res.status === 200) {
		const stub = getUserDurableObject(env, auth.userId)
		const res = await stub.storeAssetReference(fileId, objectName)
		console.log('💡[186]: uploads.ts:31: res=', res)
	}
	return res
}
