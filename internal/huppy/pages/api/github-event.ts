import type { WebhookEventName } from '@octokit/webhooks-types'
import { assert } from '@tldraw/utils'
import { NextApiRequest, NextApiResponse } from 'next'
import { Ctx } from '../../src/ctx'
import { NamedEvent, onGithubEvent } from '../../src/flow'
import { getAppOctokit, getInstallationToken } from '../../src/octokit'
import { wrapRequest } from '../../src/requestWrapper'
import { header } from '../../src/utils'

const handler = wrapRequest(
	'/api/github-event',
	async function handler(req: NextApiRequest, res: NextApiResponse) {
		const app = getAppOctokit()
		const eventName = header(req, 'x-github-event') as WebhookEventName
		await app.webhooks.verifyAndReceive({
			id: header(req, 'x-github-delivery'),
			name: eventName,
			signature: header(req, 'x-hub-signature-256'),
			payload: JSON.stringify(req.body),
		})

		const event = { name: eventName, payload: req.body } as NamedEvent
		assert(
			'installation' in event.payload && event.payload.installation,
			'event must have installation'
		)

		const installationId = event.payload.installation.id
		const ctx: Ctx = {
			app,
			octokit: await app.getInstallationOctokit(Number(installationId)),
			installationId: installationId,
			installationToken: await getInstallationToken(app, installationId),
		}

		// we deliberately don't await this so that the response is sent
		// immediately. we'll process the event in the background.
		onGithubEvent(ctx, event)

		return res.json({ ok: true })
	}
)

export default handler
