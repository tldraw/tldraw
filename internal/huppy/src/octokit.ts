import { Octokit as OctokitCore } from '@octokit/core'
import { retry } from '@octokit/plugin-retry'
import { assert } from '@tldraw/utils'
import console from 'console'
import { App, Octokit } from 'octokit'
import { APP_ID } from './config'

export function getGitHubAuth() {
	const REPO_SYNC_PRIVATE_KEY_B64 = process.env.REPO_SYNC_PRIVATE_KEY_B64
	assert(
		typeof REPO_SYNC_PRIVATE_KEY_B64 === 'string',
		'REPO_SYNC_PRIVATE_KEY_B64 must be a string'
	)
	const REPO_SYNC_PRIVATE_KEY = Buffer.from(REPO_SYNC_PRIVATE_KEY_B64, 'base64').toString('utf-8')

	const REPO_SYNC_HOOK_SECRET = process.env.REPO_SYNC_HOOK_SECRET
	assert(typeof REPO_SYNC_HOOK_SECRET === 'string', 'REPO_SYNC_HOOK_SECRET must be a string')

	return {
		privateKey: REPO_SYNC_PRIVATE_KEY,
		webhookSecret: REPO_SYNC_HOOK_SECRET,
	}
}

export async function getInstallationToken(gh: App, installationId: number) {
	const { data } = await gh.octokit.rest.apps.createInstallationAccessToken({
		installation_id: installationId,
	} as any)
	return data.token
}

function requestLogPlugin(octokit: OctokitCore) {
	octokit.hook.wrap('request', async (request, options) => {
		const url = options.url.replace(/{([^}]+)}/g, (_, key) => (options as any)[key])
		let info = `${options.method} ${url}`
		if (options.request.retryCount) {
			info += ` (retry ${options.request.retryCount})`
		}

		try {
			const result = await request(options)
			console.log(`[gh] ${result.status} ${info}`)
			return result
		} catch (err: any) {
			console.log(`[gh] ${err.status} ${info}`)
			throw err
		}
	})
}

const OctokitWithRetry = Octokit.plugin(requestLogPlugin, retry).defaults({
	retry: {
		// retry on 404s, which can occur if we make a request for a resource before it's ready
		doNotRetry: [400, 401, 403, 422, 451],
	},
})

export function getAppOctokit() {
	const { privateKey, webhookSecret } = getGitHubAuth()
	return new App({
		Octokit: OctokitWithRetry,
		appId: APP_ID,
		privateKey,
		webhooks: { secret: webhookSecret },
		log: console,
	})
}
