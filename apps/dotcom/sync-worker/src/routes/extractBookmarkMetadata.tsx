import { assert } from '@tldraw/utils'
import { handleExtractBookmarkMetadataRequest } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'

export async function extractBookmarkMetadata(request: IRequest, env: Environment) {
	if (request.method === 'GET') {
		// legacy route: extract metadata without saving image
		return handleExtractBookmarkMetadataRequest({ request })
	}

	return handleExtractBookmarkMetadataRequest({
		request,
		uploadImage: async (headers, body, objectName) => {
			assert(env.ASSET_UPLOAD_ORIGIN, 'ASSET_UPLOAD_ORIGIN is required')
			const url = `${env.ASSET_UPLOAD_ORIGIN}/uploads/${objectName}`

			const response = await fetch(url, {
				method: 'POST',
				headers,
				body,
			})
			if (!response.ok) {
				throw new Error('Failed to upload image')
			}

			return url
		},
	})
}
