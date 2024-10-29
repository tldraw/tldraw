import { NextApiRequest, NextApiResponse } from 'next'
import { reportError } from './reportError'

export function wrapRequest<Res>(
	name: string,
	handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		try {
			await handler(req, res as NextApiResponse<Res>)
		} catch (err: any) {
			reportError(`Error in ${name}`, err)
			res.status(500).json({ error: err.message })
		}
	}
}
