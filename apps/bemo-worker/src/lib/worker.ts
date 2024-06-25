/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />
import { Router, createCors } from 'itty-router'
import Toucan from 'toucan-js'
import { getR2KeyForAsset } from './r2'
import { joinExistingRoom } from './routes/joinExistingRoom'
import { Environment } from './types'
import { fourOhFour } from './utils/fourOhFour'
export { BemoDO } from './BemoDO'

// allow everything
const { preflight, corsify } = createCors({
	origins: Object.assign([], { includes: () => true }),
})

const router = Router()
	.all('*', preflight)
	.get(`/connect/:roomId`, (req, env) => joinExistingRoom(req, env))
	.put(`/asset/:assetId`, async (req, env: Environment) => {
		const object = await env.DATA.put(getR2KeyForAsset(req.params.assetId), req.body, {
			httpMetadata: req.headers,
		})
		return new Response(null, { headers: { etag: object.httpEtag } })
	})
	.get(`/asset/:assetId`, async (req, env: Environment) => {
		const object = await env.DATA.get(getR2KeyForAsset(req.params.assetId))

		if (object === null) {
			return new Response('Object Not Found', { status: 404 })
		}

		const headers = new Headers()
		object.writeHttpMetadata(headers)
		headers.set('etag', object.httpEtag)

		return new Response(object.body, { headers })
	})
	.get(`/bookmark`, async (req, _env: Environment) => {
		const query = req.query.url
		if (!query) {
			return new Response('Missing url', { status: 400 })
		}
		if (typeof query !== 'string') {
			return new Response('Invalid url', { status: 400 })
		}
		const url = new URL(query)
		if (!url.hostname) {
			return new Response('Invalid url', { status: 400 })
		}

			return new Response('WIP', { status: 500 })
	})
	.all('*', fourOhFour)

const Worker = {
	fetch(request: Request, env: Environment, context: ExecutionContext) {
		const sentry = new Toucan({
			dsn: env.SENTRY_DSN,
			context, // Includes 'waitUntil', which is essential for Sentry logs to be delivered. Modules workers do not include 'request' in context -- you'll need to set it separately.
			request, // request is not included in 'context', so we set it here.
			allowedHeaders: ['user-agent'],
			allowedSearchParams: /(.*)/,
		})

		return router
			.handle(request, env, context)
			.catch((err) => {
				console.error(err)
				sentry.captureException(err)

				return new Response('Something went wrong', {
					status: 500,
					statusText: 'Internal Server Error',
				})
			})
			.then((response) => {
				const setCookies = response.headers.getAll('set-cookie')
				// unfortunately corsify mishandles the set-cookie header, so
				// we need to manually add it back in
				const result = corsify(response)
				if ([...setCookies].length === 0) {
					return result
				}
				const newResponse = new Response(result.body, result)
				newResponse.headers.delete('set-cookie')
				// add cookies from original response
				for (const cookie of setCookies) {
					newResponse.headers.append('set-cookie', cookie)
				}
				return newResponse
			})
	},
}

export default Worker
