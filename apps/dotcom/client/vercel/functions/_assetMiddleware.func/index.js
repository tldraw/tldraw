import { next } from '@vercel/edge'

export default async function middleware(_request, _event) {
	const response = await next()

	if (response.status === 200) {
		response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
	}

	return response
}
