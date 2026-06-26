import { assert } from '@tldraw/utils'
import { handleExtractBookmarkMetadataRequest } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import {
	SOCIAL_PREVIEW_DESCRIPTION,
	SOCIAL_PREVIEW_IMAGE,
	formatSocialTitle,
	getBoardNameForUrl,
} from './getSocialPreview'

// When the URL being unfurled is a tldraw board link, resolve the board name directly instead of
// fetching the page. tldraw's own unfurl bot can't be routed to the social preview worker by
// user-agent, so this is what makes pasting a board link into a tldraw canvas show the board name.
async function getBoardBookmarkMetadata(request: IRequest, env: Environment) {
	const url = new URL(request.url).searchParams.get('url')
	if (!url) return null
	const name = await getBoardNameForUrl(env, url)
	if (!name) return null
	return {
		title: formatSocialTitle(name),
		description: SOCIAL_PREVIEW_DESCRIPTION,
		image: SOCIAL_PREVIEW_IMAGE,
	}
}

export async function extractBookmarkMetadata(request: IRequest, env: Environment) {
	const boardMetadata = await getBoardBookmarkMetadata(request, env)
	if (boardMetadata) {
		return Response.json(boardMetadata)
	}

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
