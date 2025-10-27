import assert from 'assert'
import { readFileSync } from 'fs'
import path, { join } from 'path'
import toml from 'toml'
import {
	createGithubDeployment,
	getDeployInfo,
	setWranglerPreviewConfig,
	wranglerDeploy,
} from './lib/deploy'
import { Discord } from './lib/discord'
import { REPO_ROOT } from './lib/file'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

const workerDir = path.relative(process.cwd(), path.resolve(REPO_ROOT, './apps/analytics-worker'))

// Do not use `process.env` directly in this script. Add your variable to `makeEnv` and use it via
// `env` instead. This makes sure that all required env vars are present.
const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'DISCORD_DEPLOY_WEBHOOK_URL',
	'RELEASE_COMMIT_HASH',
	'TLDRAW_ENV',
	'GH_TOKEN',
])

const discord = new Discord({
	webhookUrl: env.DISCORD_DEPLOY_WEBHOOK_URL,
	shouldNotify: env.TLDRAW_ENV === 'production',
	totalSteps: 2,
	messagePrefix: '[ANALYTICS]',
})

const { previewId, sha } = getDeployInfo()

async function main() {
	assert(
		env.TLDRAW_ENV === 'staging' || env.TLDRAW_ENV === 'production' || env.TLDRAW_ENV === 'preview',
		'TLDRAW_ENV must be staging or production or preview'
	)

	await discord.message(`--- **${env.TLDRAW_ENV} analytics worker deploy pre-flight** ---`)

	await discord.step('cloudflare deploy dry run', async () => {
		await deployAnalyticsWorker({ dryRun: true })
	})

	// --- point of no return! do the deploy for real --- //

	await discord.message(`--- **pre-flight complete, starting real analytics worker deploy** ---`)

	await discord.step('deploying analytics worker to cloudflare', async () => {
		await deployAnalyticsWorker({ dryRun: false })
	})

	// Get the worker name from wrangler.toml
	const wranglerConfig = toml.parse(readFileSync(join(workerDir, 'wrangler.toml')).toString())
	const workerName = wranglerConfig?.env?.[env.TLDRAW_ENV]?.name || wranglerConfig?.name
	if (!workerName) {
		throw new Error('Could not find worker name in wrangler.toml')
	}

	// Analytics worker uses default workers.dev domain
	const deploymentUrl = `https://${workerName}.${env.CLOUDFLARE_ACCOUNT_ID}.workers.dev`

	nicelog('Creating deployment for', deploymentUrl)
	await createGithubDeployment(env, {
		app: 'analytics-worker',
		deploymentUrl,
		sha,
	})

	await discord.message(`**Deploy complete!**`)
}

let didUpdateAnalyticsWorker = false
async function deployAnalyticsWorker({ dryRun }: { dryRun: boolean }) {
	const workerId = `${previewId ?? env.TLDRAW_ENV}-tldraw-consent`
	if (previewId && !didUpdateAnalyticsWorker) {
		await setWranglerPreviewConfig(workerDir, {
			name: workerId,
			customDomain: `${previewId}-consent.tldraw.xyz`,
		})
		didUpdateAnalyticsWorker = true
	}

	await wranglerDeploy({
		location: workerDir,
		dryRun,
		env: env.TLDRAW_ENV,
		vars: {
			WORKER_NAME: workerId,
			TLDRAW_ENV: env.TLDRAW_ENV,
		},
	})
}

main().catch(async (err) => {
	// don't notify discord on preview builds
	if (env.TLDRAW_ENV !== 'preview') {
		await discord.message(`${Discord.AT_TEAM_MENTION} Deploy failed: ${err.stack}`, {
			always: true,
		})
	}
	console.error(err)
	process.exit(1)
})
