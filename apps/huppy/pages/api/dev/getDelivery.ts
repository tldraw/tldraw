import { assert } from '@tldraw/utils'
import { NextApiRequest, NextApiResponse } from 'next'
import { getAppOctokit } from '../../../src/octokit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	assert(process.env.NODE_ENV !== 'production')
	assert(req.method === 'GET')
	const id = req.query.id
	assert(typeof id === 'string')

	const gh = getAppOctokit()
	const { data: delivery } = await gh.octokit.rest.apps.getWebhookDelivery({
		delivery_id: Number(id),
	})

	return res.json(delivery)
}
