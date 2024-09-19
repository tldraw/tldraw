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
import { exec } from './lib/exec'
import { REPO_ROOT } from './lib/file'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

const workerDir = path.relative(process.cwd(), path.resolve(REPO_ROOT, './apps/bemo-worker'))

// Do not use `process.env` directly in this script. Add your variable to `makeEnv` and use it via
// `env` instead. This makes sure that all required env vars are present.
const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'DISCORD_DEPLOY_WEBHOOK_URL',
	'RELEASE_COMMIT_HASH',
	'TLDRAW_ENV',
	'GH_TOKEN',
	'SENTRY_AUTH_TOKEN',
	'SENTRY_BEMO_WORKER_DSN',
])

const discord = new Discord({
	webhookUrl: env.DISCORD_DEPLOY_WEBHOOK_URL,
	shouldNotify: env.TLDRAW_ENV === 'production',
	totalSteps: 3,
})

const { previewId, sha } = getDeployInfo()

async function main() {
	assert(
		env.TLDRAW_ENV === 'staging' || env.TLDRAW_ENV === 'production' || env.TLDRAW_ENV === 'preview',
		'TLDRAW_ENV must be staging or production or preview'
	)

	await discord.message(`--- **${env.TLDRAW_ENV} bemo deploy pre-flight** ---`)

	await discord.step('setting up deploy', async () => {
		await exec('yarn', ['lazy', 'prebuild'])
	})

	await discord.step('cloudflare deploy dry run', async () => {
		await deployBemoWorker({ dryRun: true })
	})

	// --- point of no return! do the deploy for real --- //

	await discord.message(`--- **pre-flight complete, starting real bemo deploy** ---`)

	// 2. deploy the cloudflare workers:
	await discord.step('deploying bemo-worker to cloudflare', async () => {
		await deployBemoWorker({ dryRun: false })
	})

	// we set the domain in the wrangler.toml file since it's managed by cloudflare
	const domain = toml.parse(readFileSync(join(workerDir, 'wrangler.toml')).toString())?.env[
		env.TLDRAW_ENV
	]?.routes?.[0]?.pattern
	if (!domain) {
		throw new Error('Could not find the domain in wrangler.toml')
	}

	const deploymentUrl = `https://${domain}`

	nicelog('Creating deployment for', deploymentUrl)
	await createGithubDeployment(env, {
		app: 'bemo',
		deploymentUrl,
		sha,
	})

	await discord.message(`**Deploy complete!**`)
}

let didUpdateBemoWorker = false
async function deployBemoWorker({ dryRun }: { dryRun: boolean }) {
	const workerId = `${previewId ?? env.TLDRAW_ENV}-bemo`
	if (previewId && !didUpdateBemoWorker) {
		await setWranglerPreviewConfig(workerDir, {
			name: workerId,
			customDomain: `${previewId}-demo.tldraw.xyz`,
		})
		didUpdateBemoWorker = true
	}

	await wranglerDeploy({
		location: workerDir,
		dryRun,
		env: env.TLDRAW_ENV,
		vars: {
			WORKER_NAME: workerId,
			TLDRAW_ENV: env.TLDRAW_ENV,
			SENTRY_DSN: env.SENTRY_BEMO_WORKER_DSN,
		},
		sentry: {
			authToken: env.SENTRY_AUTH_TOKEN,
			project: 'bemo-worker',
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
