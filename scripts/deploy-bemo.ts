import assert from 'assert'
import { appendFileSync } from 'fs'
import path, { join } from 'path'
import { createGithubDeployment, getDeployInfo } from './lib/deploy'
import { Discord } from './lib/discord'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

const worker = path.relative(process.cwd(), path.resolve(__dirname, '../apps/bemo-worker'))

// Do not use `process.env` directly in this script. Add your variable to `makeEnv` and use it via
// `env` instead. This makes sure that all required env vars are present.
const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'DISCORD_DEPLOY_WEBHOOK_URL',
	'DISCORD_HEALTH_WEBHOOK_URL',
	'RELEASE_COMMIT_HASH',
	'SENTRY_AUTH_TOKEN',
	'TLDRAW_ENV',
	'WORKER_SENTRY_DSN',
	'GH_TOKEN',
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

	// TODO(alex): real deploy url for bemo
	const deploymentUrl = `https://${previewId ?? env.TLDRAW_ENV}-bemo.tldraw.dev`

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
		appendFileSync(
			join(worker, 'wrangler.toml'),
			`
[env.preview]
name = "${previewId}-bemo"`
		)
		didUpdateBemoWorker = true
	}
	await exec(
		'yarn',
		[
			'wrangler',
			'deploy',
			dryRun ? '--dry-run' : null,
			'--env',
			env.TLDRAW_ENV,
			'--var',
			`SENTRY_DSN:${env.WORKER_SENTRY_DSN}`,
			'--var',
			`TLDRAW_ENV:${env.TLDRAW_ENV}`,
			'--var',
			`WORKER_NAME:${workerId}`,
		],
		{
			pwd: worker,
			env: {
				NODE_ENV: 'production',
				// wrangler needs CI=1 set to prevent it from trying to do interactive prompts
				CI: '1',
			},
		}
	)
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
