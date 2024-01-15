import { assert } from '@tldraw/utils'
import { NextApiRequest, NextApiResponse } from 'next'
import { getAppOctokit } from '../../../src/octokit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	assert(process.env.NODE_ENV !== 'production')
	assert(req.method === 'POST')
	const deliveryId = req.body.id as number
	assert(typeof deliveryId === 'number')

	const gh = getAppOctokit()
	await gh.octokit.rest.apps.redeliverWebhookDelivery({
		delivery_id: deliveryId,
	})

	return res.json({ ok: true })
}
