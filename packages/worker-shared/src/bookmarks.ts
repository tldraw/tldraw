import { assert, exhaustiveSwitchError } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { unfurl } from 'cloudflare-workers-unfurl'
import { IRequest, StatusError } from 'itty-router'
import { parseRequestQuery } from './handleRequest'
export { unfurl } from 'cloudflare-workers-unfurl'

declare const fetch: typeof import('@cloudflare/workers-types').fetch

const queryValidator = T.object({
	url: T.httpUrl,
})

type UploadImage = (
	headers: Headers,
	body: ReadableStream<any> | null,
	objectName: string
) => Promise<string>

export async function handleExtractBookmarkMetadataRequest({
	request,
	uploadImage,
}: {
	request: IRequest
	uploadImage?: UploadImage
}) {
	assert(request.method === (uploadImage ? 'POST' : 'GET'))
	const url = parseRequestQuery(request, queryValidator).url

	const metadataResult = await unfurl(url)

	if (!metadataResult.ok) {
		switch (metadataResult.error) {
			case 'bad-param':
				throw new StatusError(400, 'Bad URL')
			case 'failed-fetch':
				throw new StatusError(422, 'Failed to fetch URL')
			default:
				exhaustiveSwitchError(metadataResult.error)
		}
	}

	const metadata = metadataResult.value
	if (uploadImage) {
		const id = crypto.randomUUID()
		await Promise.all([
			trySaveImage('image', metadata, id, 600, uploadImage),
			trySaveImage('favicon', metadata, id, 64, uploadImage),
		])
	}

	return Response.json(metadata)
}

async function trySaveImage<const K extends string>(
	key: K,
	metadata: { [_ in K]?: string },
	id: string,
	size: number,
	uploadImage: UploadImage
): Promise<void> {
	const initialUrl = metadata[key]
	if (!initialUrl) return

	try {
		const imageResponse = await fetch(initialUrl, {
			cf: {
				image: {
					width: size,
					fit: 'scale-down',
					quality: 80,
				},
			},
		})
		if (!imageResponse.ok) throw new Error('Failed to fetch image')

		const contentType = imageResponse.headers.get('content-type')
		if (!contentType) throw new Error('No content type')
		if (!contentType.startsWith('image/')) throw new Error('Not an image')

		const objectName = `bookmark-${key}-${id}`
		metadata[key] = await uploadImage(imageResponse.headers, imageResponse.body, objectName)
	} catch (error) {
		console.error(`Error saving ${key}:`, error)
	}
}
