import { fetchBackgroundRemovedImage } from './removeBackground'

function imageResponse() {
	return new Response(new Uint8Array([1, 2, 3]), {
		status: 200,
		headers: { 'content-type': 'image/png' },
	})
}

describe('fetchBackgroundRemovedImage', () => {
	it('asks Cloudflare to segment the foreground as a png', async () => {
		const fetchImage = vi.fn(async () => imageResponse())

		const response = await fetchBackgroundRemovedImage(
			'https://tldrawusercontent.com/',
			'abc-photo.png',
			fetchImage
		)

		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe('image/png')
		expect(fetchImage).toHaveBeenCalledWith('https://tldrawusercontent.com/abc-photo.png', {
			cf: { image: { segment: 'foreground', format: 'png' } },
		})
	})

	it('rejects an object name that is not a single path segment', async () => {
		const fetchImage = vi.fn()

		const response = await fetchBackgroundRemovedImage(
			'https://tldrawusercontent.com',
			'../secret',
			fetchImage
		)

		expect(response.status).toBe(400)
		expect(fetchImage).not.toHaveBeenCalled()
	})

	it('fails when the transform does not return an image', async () => {
		const fetchImage = vi.fn(
			async () => new Response('nope', { status: 200, headers: { 'content-type': 'text/plain' } })
		)

		const response = await fetchBackgroundRemovedImage(
			'https://tldrawusercontent.com',
			'abc-photo.png',
			fetchImage
		)

		expect(response.status).toBe(502)
	})
})
