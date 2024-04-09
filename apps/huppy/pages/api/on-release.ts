import { assert } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { NextApiRequest, NextApiResponse } from 'next'
import { TLDRAW_ORG } from '../../src/config'
import { standaloneExamplesBranch } from '../../src/flows/standaloneExamplesBranch'
import { getCtxForOrg } from '../../src/getCtxForOrg'
import { wrapRequest } from '../../src/requestWrapper'

const bodySchema = T.object({
	tagToRelease: T.string,
	apiKey: T.string,
	canary: T.boolean.optional(),
})

const handler = wrapRequest(
	'/api/on-release',
	async function handler(req: NextApiRequest, res: NextApiResponse) {
		assert(req.method === 'POST')
		const body = bodySchema.validate(req.body)
		assert(typeof process.env.DEVELOPER_ACCESS_KEY === 'string')
		if (body.apiKey !== process.env.DEVELOPER_ACCESS_KEY) {
			res.status(401).send('Bad api key')
			return
		}

		const { tagToRelease } = body
		await standaloneExamplesBranch.onCustomHook(await getCtxForOrg(TLDRAW_ORG), {
			tagToRelease,
			canary: !!body.canary,
		})
		res.send('Created standalone examples branch')
	}
)

export default handler
