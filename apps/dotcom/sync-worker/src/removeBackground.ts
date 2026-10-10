import { isValidR2ObjectName } from '@tldraw/worker-shared'

/**
 * Ask Cloudflare Image Transformations to isolate the subject. `segment=foreground` runs
 * BiRefNet and is billed as a normal Images transformation, not as Workers AI neurons.
 * The worker fetches it so the browser stays on the app origin.
 */
export async function fetchBackgroundRemovedImage(
	userContentUrl: string,
	objectName: string,
	fetchImage: typeof fetch = fetch
): Promise<Response> {
	if (
		!isValidR2ObjectName(objectName) ||
		objectName.includes('/') ||
		objectName.includes('\\') ||
		objectName.includes('..')
	) {
		return new Response('Invalid object name', { status: 400 })
	}

	const src = `${userContentUrl.replace(/\/$/, '')}/${objectName}`
	let fetched: Response
	try {
		fetched = await fetchImage(src, {
			cf: {
				image: {
					segment: 'foreground',
					format: 'png',
				},
			},
		} as RequestInit)
	} catch {
		return new Response('Failed to remove background', { status: 502 })
	}

	const contentType = fetched.headers.get('content-type') ?? ''
	if (!fetched.ok || !fetched.body || !contentType.startsWith('image/')) {
		return new Response('Failed to remove background', { status: 502 })
	}

	const headers = new Headers()
	headers.set('content-type', contentType.startsWith('image/png') ? 'image/png' : contentType)
	headers.set('cache-control', 'public, max-age=31536000, immutable')
	return new Response(fetched.body, { status: 200, headers })
}
