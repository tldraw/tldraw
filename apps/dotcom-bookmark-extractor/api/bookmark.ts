// @ts-expect-error
import grabity from 'grabity'
import { runCorsMiddleware } from './_cors'

interface RequestBody {
	url: string
}

interface ResponseBody {
	title?: string
	description?: string
	image?: string
}

export default async function handler(req: any, res: any) {
	try {
		await runCorsMiddleware(req, res)
		const { url } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as RequestBody)
		const it = await grabity.grabIt(url)
		res.send(it)
	} catch (error: any) {
		console.error(error)
		res.status(500).send(error.message)
	}
}
