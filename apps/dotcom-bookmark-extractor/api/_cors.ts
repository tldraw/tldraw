import Cors from 'cors'

const whitelist = [
	'http://localhost:3000',
	'http://localhost:4000',
	'http://localhost:5420',
	'https://www.tldraw.com',
	'https://staging.tldraw.com',
	process.env.NEXT_PUBLIC_VERCEL_URL,
	'vercel.app',
]

export const cors = Cors({
	methods: ['POST'],
	origin: function (origin, callback) {
		if (origin?.endsWith('.tldraw.com')) {
			callback(null, true)
		} else if (origin?.endsWith('-tldraw.vercel.app')) {
			callback(null, true)
		} else if (origin && whitelist.includes(origin)) {
			callback(null, true)
		} else {
			callback(new Error(`Not allowed by CORS (${origin})`))
		}
	},
})

export function runCorsMiddleware(req: any, res: any) {
	return new Promise((resolve, reject) => {
		cors(req, res, (result) => {
			if (result instanceof Error) return reject(result)
			return resolve(result)
		})
	})
}
