import { assert, assertExists } from '@tldraw/utils'
import { NextApiRequest, NextApiResponse } from 'next'
import { Ctx } from '../../../src/ctx'
import { NamedEvent, onGithubEvent } from '../../../src/flow'
import { getAppOctokit, getInstallationToken } from '../../../src/octokit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	assert(process.env.NODE_ENV !== 'production')
	assert(req.method === 'POST')
	const deliveryId = req.body.id as number
	assert(typeof deliveryId === 'number')

	const app = getAppOctokit()

	const { data: delivery } = await app.octokit.rest.apps.getWebhookDelivery({
		delivery_id: deliveryId,
	})

	const installationId = assertExists(delivery.installation_id)
	const ctx: Ctx = {
		app,
		installationId,
		octokit: await app.getInstallationOctokit(installationId),
		installationToken: await getInstallationToken(app, installationId),
	}

	try {
		const messages = await onGithubEvent(ctx, {
			name: delivery.event,
			payload: delivery.request.payload,
		} as NamedEvent)
		return res.json({ message: JSON.stringify(messages, null, '\t') })
	} catch (err: any) {
		console.log(err.stack)
		return res.json({ message: err.message })
	}
}
