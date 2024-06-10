import { unfurl } from '../lib/unfurl'
import { runCorsMiddleware } from './_cors'

interface RequestBody {
	url: string
}

export default async function handler(req: any, res: any) {
	try {
		await runCorsMiddleware(req, res)
		const { url } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as RequestBody)
		const results = await unfurl(url)
		res.send(results)
	} catch (error: any) {
		console.error(error)
		res.status(422).send(error.message)
	}
}
