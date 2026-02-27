import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import assert from 'assert'
import { execSync } from 'child_process'
import * as fs from 'fs'
import { existsSync, readdirSync, writeFileSync } from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'
import { PassThrough } from 'stream'
import * as tar from 'tar'
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

const worker = path.relative(process.cwd(), path.resolve(REPO_ROOT, './apps/dotcom/sync-worker'))
const healthWorker = path.relative(
	process.cwd(),
	path.resolve(REPO_ROOT, './internal/health-worker')
)
const assetUpload = path.relative(
	process.cwd(),
	path.resolve(REPO_ROOT, './apps/dotcom/asset-upload-worker')
)
const imageResize = path.relative(
	process.cwd(),
	path.resolve(REPO_ROOT, './apps/dotcom/image-resize-worker')
)
const tldrawusercontent = path.relative(
	process.cwd(),
	path.resolve(REPO_ROOT, './apps/dotcom/tldrawusercontent-worker')
)
const dotcom = path.relative(process.cwd(), path.resolve(REPO_ROOT, './apps/dotcom/client'))
const zeroCacheFolder = path.relative(
	process.cwd(),
	path.resolve(REPO_ROOT, './apps/dotcom/zero-cache')
)

const zeroCachePackageJsonPath = path.join(zeroCacheFolder, 'package.json')
const zeroVersion = JSON.parse(fs.readFileSync(zeroCachePackageJsonPath).toString()).dependencies[
	'@rocicorp/zero'
] as string

const { previewId, sha } = getDeployInfo()

// Do not use `process.env` directly in this script. Add your variable to `makeEnv` and use it via
// `env` instead. This makes sure that all required env vars are present.
const env = makeEnv([
	'ANALYTICS_API_TOKEN',
	'ANALYTICS_API_URL',
	'ANTHROPIC_API_KEY',
	'ASSET_UPLOAD_SENTRY_DSN',
	'ASSET_UPLOAD',
	'CLERK_SECRET_KEY',
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'DISCORD_DEPLOY_WEBHOOK_URL',
	'DISCORD_FEEDBACK_WEBHOOK_URL',
	'DISCORD_HEALTH_WEBHOOK_URL',
	'GC_MAPS_API_KEY',
	'GH_TOKEN',
	'GOOGLE_API_KEY',
	'HEALTH_CHECK_BEARER_TOKEN',
	'HEALTH_WORKER_UPDOWN_WEBHOOK_PATH',
	'IMAGE_WORKER',
	'MULTIPLAYER_SERVER',
	'OPENAI_API_KEY',
	'R2_ACCESS_KEY_ID',
	'R2_ACCESS_KEY_SECRET',
	'RELEASE_COMMIT_HASH',
	'SENTRY_AUTH_TOKEN',
	'SENTRY_CSP_REPORT_URI',
	'SENTRY_DSN',
	'SUPABASE_LITE_ANON_KEY',
	'SUPABASE_LITE_URL',
	'TLDRAW_ENV',
	'TLDRAW_LICENSE',
	'VERCEL_ORG_ID',
	'VERCEL_PROJECT_ID',
	'VERCEL_TOKEN',
	'VITE_CLERK_PUBLISHABLE_KEY',
	'WORKER_SENTRY_DSN',
	'BOTCOM_POSTGRES_CONNECTION_STRING',
	'BOTCOM_POSTGRES_POOLED_CONNECTION_STRING',
	'USER_CONTENT_SENTRY_DSN',
	'USER_CONTENT_URL',
	'DEPLOY_ZERO',
	'ZERO_ADMIN_PASSWORD',
	'ZERO_R2_ENDPOINT',
	'ZERO_R2_BUCKET_NAME',
	'ZERO_R2_ACCESS_KEY_ID',
	'ZERO_R2_SECRET_ACCESS_KEY',
])

// Multinode (flyio-multinode) is staging-only right now, preview use single not as it is faster / cheaper
const deployZero =
	env.DEPLOY_ZERO === 'false'
		? false
		: previewId && env.DEPLOY_ZERO === 'flyio-multinode'
			? ('flyio' as const)
			: (env.DEPLOY_ZERO as 'flyio' | 'flyio-multinode')
// For multinode: -vs = view syncer, -rm = replication manager (abbreviated for Fly.io's 30-char app name limit)
const flyioAppName =
	deployZero === 'flyio'
		? `${previewId ?? env.TLDRAW_ENV}-zero-cache`
		: deployZero === 'flyio-multinode'
			? `${env.TLDRAW_ENV}-zero-vs`
			: undefined
const flyioReplAppName = deployZero === 'flyio-multinode' ? `${env.TLDRAW_ENV}-zero-rm` : undefined

// pierre is not in production yet, so get the key directly from process.env
const pierreKey = process.env.PIERRE_KEY ?? ''

const discord = new Discord({
	webhookUrl: env.DISCORD_DEPLOY_WEBHOOK_URL,
	shouldNotify: env.TLDRAW_ENV === 'production',
	totalSteps: previewId ? 10 : 9,
	messagePrefix: '[DOTCOM]',
})

const sentryReleaseName = `${env.TLDRAW_ENV}-${previewId ? previewId + '-' : ''}-${sha}`

interface TimingEntry {
	label: string
	durationMs: number
}

const timings: TimingEntry[] = []

function formatDurationMs(durationMs: number) {
	if (durationMs >= 60_000) return `${(durationMs / 60_000).toFixed(2)}m`
	if (durationMs >= 1_000) return `${(durationMs / 1_000).toFixed(2)}s`
	return `${durationMs.toFixed(0)}ms`
}

async function withTiming<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
	const startedAt = performance.now()
	try {
		return await fn()
	} finally {
		const durationMs = performance.now() - startedAt
		timings.push({ label, durationMs })
		nicelog(`[timing] ${label}: ${formatDurationMs(durationMs)}`)
	}
}

function logTimingSummary() {
	if (!timings.length) return
	nicelog('[timing] deploy breakdown (longest first):')
	for (const [index, entry] of timings
		.slice()
		.sort((a, b) => b.durationMs - a.durationMs)
		.entries()) {
		nicelog(
			`[timing] ${String(index + 1).padStart(2, '0')}. ${entry.label}: ${formatDurationMs(
				entry.durationMs
			)}`
		)
	}
}

if (previewId) {
	env.ASSET_UPLOAD = `https://${previewId}-tldraw-assets.tldraw.workers.dev`
	env.MULTIPLAYER_SERVER = `https://${previewId}-tldraw-multiplayer.tldraw.workers.dev`
	env.IMAGE_WORKER = `https://${previewId}-images.tldraw.xyz`
	env.USER_CONTENT_URL = `https://${previewId}-tldrawusercontent.tldraw.workers.dev`
}

const zeroMutateUrl = `${env.MULTIPLAYER_SERVER.replace(/^ws/, 'http')}/app/zero/mutate`
const zeroQueryUrl = `${env.MULTIPLAYER_SERVER.replace(/^ws/, 'http')}/app/zero/query`

// Zero connection limits per environment.
// All DBs use direct connections. Pooled connections (PgBouncer/Supavisor transaction mode) break
// prepared statements which Zero's postgres.js driver uses internally.
// Staging: Supabase Micro (60 max_connections, 200 pooled clients)
// Preview: Supabase branch instance (~60 max_connections per branch, isolated)
// Production: higher limits but sync worker also connects, so ~30% of capacity for Zero
// TODO(production): tune these once we know prod Postgres limits
const zeroConnectionLimits = {
	staging: {
		rm: { upstream: 1, cvr: 1, change: 3 },
		vs: { upstream: 2, cvr: 3, change: 1 },
	},
	production: {
		rm: { upstream: 1, cvr: 3, change: 5 },
		vs: { upstream: 5, cvr: 10, change: 3 },
	},
	// Previews use Supabase branch DB
	preview: {
		single: { upstream: 3, cvr: 5, change: 3 },
	},
} as const
interface ConnLimits {
	upstream: number
	cvr: number
	change: number
}
interface SingleNodeConnLimits {
	single: ConnLimits
}
interface MultiNodeConnLimits {
	rm: ConnLimits
	vs: ConnLimits
}
const zeroConns = zeroConnectionLimits[env.TLDRAW_ENV as keyof typeof zeroConnectionLimits] as
	| SingleNodeConnLimits
	| MultiNodeConnLimits

async function main() {
	const deployStart = performance.now()
	assert(
		env.TLDRAW_ENV === 'staging' || env.TLDRAW_ENV === 'production' || env.TLDRAW_ENV === 'preview',
		'TLDRAW_ENV must be staging or production or preview'
	)

	await discord.message(`--- **${env.TLDRAW_ENV} dotcom deploy pre-flight** ---`)

	await discord.step('setting up deploy', async () => {
		// make sure the tldraw .css files are built:
		await withTiming('prebuild assets', () => exec('yarn', ['lazy', 'prebuild']))

		// link to vercel and supabase projects:
		await withTiming('vercel link', () => vercelCli('link', ['--project', env.VERCEL_PROJECT_ID]))
	})

	// deploy pre-flight steps:
	// 1. get the dotcom app ready to go (env vars and pre-build)
	await withTiming('step: building dotcom app', () =>
		discord.step('building dotcom app', async () => {
			await withTiming('dotcom sentry release', () => createSentryRelease())
			await withTiming('dotcom build', () => prepareDotcomApp())
			await withTiming('dotcom sourcemap upload', () => uploadSourceMaps())
			await withTiming('dotcom asset coalescing', () =>
				coalesceWithPreviousAssets(`${dotcom}/.vercel/output/static/assets`)
			)
		})
	)

	await withTiming('step: cloudflare deploy dry run', () =>
		discord.step('cloudflare deploy dry run', async () => {
			await withTiming('worker dry run: asset-upload', () =>
				deployAssetUploadWorker({ dryRun: true })
			)
			await withTiming('worker dry run: health', () => deployHealthWorker({ dryRun: true }))
			await withTiming('worker dry run: multiplayer', () => deployTlsyncWorker({ dryRun: true }))
			await withTiming('worker dry run: tldrawusercontent', () =>
				deployTldrawUserContentWorker({ dryRun: true })
			)
			await withTiming('worker dry run: image-resize', () =>
				deployImageResizeWorker({ dryRun: true })
			)
		})
	)

	// --- point of no return! do the deploy for real --- //

	await discord.message(`--- **pre-flight complete, starting real dotcom deploy** ---`)

	// 2. deploy the cloudflare workers:
	await withTiming('step: deploy asset uploader worker', () =>
		discord.step('deploying asset uploader to cloudflare', async () => {
			await withTiming('worker deploy: asset-upload', () =>
				deployAssetUploadWorker({ dryRun: false })
			)
		})
	)
	await withTiming('step: deploy multiplayer worker', () =>
		discord.step('deploying multiplayer worker to cloudflare', async () => {
			await withTiming('worker deploy: multiplayer', () => deployTlsyncWorker({ dryRun: false }))
		})
	)
	await withTiming('step: deploy tldrawusercontent worker', () =>
		discord.step('deploying tldrawusercontent worker to cloudflare', async () => {
			await withTiming('worker deploy: tldrawusercontent', () =>
				deployTldrawUserContentWorker({ dryRun: false })
			)
		})
	)
	await withTiming('step: deploy image resizer worker', () =>
		discord.step('deploying image resizer to cloudflare', async () => {
			await withTiming('worker deploy: image-resize', () =>
				deployImageResizeWorker({ dryRun: false })
			)
		})
	)
	await withTiming('step: deploy health worker', () =>
		discord.step('deploying health worker to cloudflare', async () => {
			await withTiming('worker deploy: health', () => deployHealthWorker({ dryRun: false }))
		})
	)

	// 3. deploy the pre-build dotcom app:
	const { deploymentUrl, inspectUrl } = await withTiming(
		'step: deploy dotcom app to vercel',
		async () =>
			await discord.step('deploying dotcom app to vercel', async () => {
				return await withTiming('vercel deploy --prebuilt', () => deploySpa())
			})
	)

	let deploymentAlias = null as null | string

	if (previewId) {
		const aliasDomain = `${previewId}-preview-deploy.tldraw.com`
		await withTiming('step: alias preview deployment', () =>
			discord.step('aliasing preview deployment', async () => {
				await withTiming('vercel alias set', () =>
					vercelCli('alias', ['set', deploymentUrl, aliasDomain])
				)
			})
		)

		deploymentAlias = `https://${aliasDomain}`
	}

	nicelog('Creating deployment for', deploymentUrl)
	await withTiming('github deployment status update', () =>
		createGithubDeployment(env, {
			app: 'dotcom',
			deploymentUrl: deploymentAlias ?? deploymentUrl,
			inspectUrl,
			sha,
		})
	)

	const totalDurationMs = performance.now() - deployStart
	nicelog(`[timing] total deploy script runtime: ${formatDurationMs(totalDurationMs)}`)
	logTimingSummary()
	await discord.message(`**Deploy complete!**`)
}

function getZeroUrl() {
	switch (env.TLDRAW_ENV) {
		case 'preview': {
			if (deployZero === 'flyio') {
				return `https://${flyioAppName}.fly.dev/`
			} else {
				return 'https://zero-backend-not-deployed.tldraw.com'
			}
		}
		case 'staging':
			if (deployZero === 'flyio-multinode') {
				return `https://${flyioAppName}.fly.dev/`
			}
			return 'https://staging.zero.tldraw.com/'
		case 'production':
			return 'https://production.zero.tldraw.com/'
	}
	return 'https://zero-backend-not-deployed.tldraw.com'
}

async function prepareDotcomApp() {
	// pre-build the app:
	await exec('yarn', ['build-app'], {
		env: {
			NEXT_PUBLIC_TLDRAW_RELEASE_INFO: `${env.RELEASE_COMMIT_HASH} ${new Date().toISOString()}`,
			MULTIPLAYER_SERVER: env.MULTIPLAYER_SERVER,
			USER_CONTENT_URL: env.USER_CONTENT_URL,
			ZERO_SERVER: getZeroUrl(),
			NEXT_PUBLIC_GC_API_KEY: env.GC_MAPS_API_KEY,
			SENTRY_AUTH_TOKEN: env.SENTRY_AUTH_TOKEN,
			SENTRY_ORG: 'tldraw',
			SENTRY_PROJECT: 'lite',
			SUPABASE_KEY: env.SUPABASE_LITE_ANON_KEY,
			SUPABASE_URL: env.SUPABASE_LITE_URL,
			TLDRAW_ENV: env.TLDRAW_ENV,
		},
	})
}

let didUpdateAssetUploadWorker = false
async function deployAssetUploadWorker({ dryRun }: { dryRun: boolean }) {
	const workerId = `${previewId ?? env.TLDRAW_ENV}-tldraw-assets`
	if (previewId && !didUpdateAssetUploadWorker) {
		await setWranglerPreviewConfig(assetUpload, { name: workerId })
		didUpdateAssetUploadWorker = true
	}

	await wranglerDeploy({
		location: assetUpload,
		dryRun,
		env: env.TLDRAW_ENV,
		vars: {
			SENTRY_DSN: env.ASSET_UPLOAD_SENTRY_DSN,
			TLDRAW_ENV: env.TLDRAW_ENV,
			WORKER_NAME: workerId,
		},
		sentry: {
			project: 'asset-upload-worker',
			authToken: env.SENTRY_AUTH_TOKEN,
		},
	})
}

let didUpdateTldrawUserContentWorker = false
async function deployTldrawUserContentWorker({ dryRun }: { dryRun: boolean }) {
	const workerId = `${previewId ?? env.TLDRAW_ENV}-tldrawusercontent`
	if (previewId && !didUpdateTldrawUserContentWorker) {
		await setWranglerPreviewConfig(tldrawusercontent, {
			name: workerId,
			serviceBinding: {
				binding: 'SYNC_WORKER',
				service: `${previewId}-tldraw-multiplayer`,
			},
		})
		didUpdateTldrawUserContentWorker = true
	}

	await wranglerDeploy({
		location: tldrawusercontent,
		dryRun,
		env: env.TLDRAW_ENV,
		vars: {
			SENTRY_DSN: env.USER_CONTENT_SENTRY_DSN,
			TLDRAW_ENV: env.TLDRAW_ENV,
			WORKER_NAME: workerId,
		},
		sentry: {
			project: 'tldrawusercontent-worker',
			authToken: env.SENTRY_AUTH_TOKEN,
		},
	})
}

let didUpdateTlsyncWorker = false
async function deployTlsyncWorker({ dryRun }: { dryRun: boolean }) {
	const workerId = `${previewId ?? env.TLDRAW_ENV}-tldraw-multiplayer`
	if (previewId) {
		const queueName = `tldraw-multiplayer-queue-${previewId}`
		if (!didUpdateTlsyncWorker) {
			await setWranglerPreviewConfig(worker, { name: workerId }, queueName)
			didUpdateTlsyncWorker = true
		}
		if (!dryRun) {
			try {
				await exec('yarn', ['wrangler', 'queues', 'info', queueName], { pwd: worker })
			} catch (_e) {
				await exec('yarn', ['wrangler', 'queues', 'create', queueName], { pwd: worker })
			}
		}
	}
	await exec('yarn', ['workspace', '@tldraw/zero-cache', 'migrate', dryRun ? '--dry-run' : null], {
		env: {
			BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
		},
	})
	// Deploy zero after the migrations but before the sync worker
	if (!dryRun && deployZero !== false) {
		await deployZeroBackend()
	}
	await wranglerDeploy({
		location: worker,
		dryRun,
		env: env.TLDRAW_ENV,
		vars: {
			SUPABASE_URL: env.SUPABASE_LITE_URL,
			SUPABASE_KEY: env.SUPABASE_LITE_ANON_KEY,
			SENTRY_DSN: env.WORKER_SENTRY_DSN,
			TLDRAW_ENV: env.TLDRAW_ENV,
			PIERRE_KEY: pierreKey,
			ASSET_UPLOAD_ORIGIN: env.ASSET_UPLOAD,
			USER_CONTENT_URL: env.USER_CONTENT_URL,
			WORKER_NAME: workerId,
			CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
			CLERK_PUBLISHABLE_KEY: env.VITE_CLERK_PUBLISHABLE_KEY,
			BOTCOM_POSTGRES_CONNECTION_STRING: env.BOTCOM_POSTGRES_CONNECTION_STRING,
			BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
			MULTIPLAYER_SERVER: env.MULTIPLAYER_SERVER,
			DISCORD_FEEDBACK_WEBHOOK_URL: env.DISCORD_FEEDBACK_WEBHOOK_URL,
			HEALTH_CHECK_BEARER_TOKEN: env.HEALTH_CHECK_BEARER_TOKEN,
			ANALYTICS_API_URL: env.ANALYTICS_API_URL,
			ANALYTICS_API_TOKEN: env.ANALYTICS_API_TOKEN,
		},
		sentry: {
			project: 'tldraw-sync',
			authToken: env.SENTRY_AUTH_TOKEN,
			environment: workerId,
		},
	})
}

let didUpdateImageResizeWorker = false
async function deployImageResizeWorker({ dryRun }: { dryRun: boolean }) {
	const workerId = `${previewId ?? env.TLDRAW_ENV}-tldraw-image-optimizer`
	const multiplayerServer = previewId
		? `${previewId}-preview-deploy.tldraw.com`
		: env.MULTIPLAYER_SERVER
	if (previewId && !didUpdateImageResizeWorker) {
		await setWranglerPreviewConfig(imageResize, {
			name: workerId,
			customDomain: `${previewId}-images.tldraw.xyz`,
			serviceBinding: {
				binding: 'SYNC_WORKER',
				service: `${previewId}-tldraw-multiplayer`,
			},
		})
		didUpdateImageResizeWorker = true
	}

	await wranglerDeploy({
		location: imageResize,
		dryRun,
		env: env.TLDRAW_ENV,
		vars: {
			TLDRAW_ENV: env.TLDRAW_ENV,
			WORKER_NAME: workerId,
			MULTIPLAYER_SERVER: multiplayerServer,
		},
	})
}

let didUpdateHealthWorker = false
async function deployHealthWorker({ dryRun }: { dryRun: boolean }) {
	if (previewId && !didUpdateHealthWorker) {
		await setWranglerPreviewConfig(healthWorker, { name: `${previewId}-tldraw-health` })
		didUpdateHealthWorker = true
	}
	await wranglerDeploy({
		location: healthWorker,
		dryRun,
		env: env.TLDRAW_ENV,
		vars: {
			DISCORD_HEALTH_WEBHOOK_URL: env.DISCORD_HEALTH_WEBHOOK_URL,
			HEALTH_WORKER_UPDOWN_WEBHOOK_PATH: env.HEALTH_WORKER_UPDOWN_WEBHOOK_PATH,
		},
	})
}

type ExecOpts = NonNullable<Parameters<typeof exec>[2]>
async function vercelCli(command: string, args: string[], opts?: ExecOpts) {
	return exec(
		'yarn',
		[
			'run',
			'-T',
			'vercel',
			command,
			'--token',
			env.VERCEL_TOKEN,
			'--scope',
			env.VERCEL_ORG_ID,
			'--yes',
			...args,
		],
		{
			...opts,
			env: {
				// specify org id via args instead of via env vars because otherwise it gets upset
				// that there's no project id either
				VERCEL_ORG_ID: env.VERCEL_ORG_ID,
				VERCEL_PROJECT_ID: env.VERCEL_PROJECT_ID,
				...opts?.env,
			},
		}
	)
}

function withStatementTimeout(connString: string): string {
	const separator = connString.includes('?') ? '&' : '?'
	return `${connString}${separator}statement_timeout=0`
}

function updateFlyioToml(appName: string): void {
	assert('single' in zeroConns, 'single-node connection limits required')
	const tomlTemplate = path.join(zeroCacheFolder, 'flyio.template.toml')
	const flyioTomlFile = path.join(zeroCacheFolder, 'flyio.toml')

	const fileContent = fs.readFileSync(tomlTemplate, 'utf-8')

	const zeroAdminPassword = env.ZERO_ADMIN_PASSWORD

	const updatedContent = fileContent
		.replace('__APP_NAME', appName)
		.replace('__ZERO_VERSION', zeroVersion)
		.replaceAll(
			'__BOTCOM_POSTGRES_CONNECTION_STRING',
			withStatementTimeout(env.BOTCOM_POSTGRES_CONNECTION_STRING)
		)
		.replaceAll('__ZERO_MUTATE_URL', zeroMutateUrl)
		.replaceAll('__ZERO_QUERY_URL', zeroQueryUrl)
		.replaceAll('__ZERO_ADMIN_PASSWORD', zeroAdminPassword)
		.replaceAll('__SINGLE_UPSTREAM_MAX_CONNS', String(zeroConns.single.upstream))
		.replaceAll('__SINGLE_CVR_MAX_CONNS', String(zeroConns.single.cvr))
		.replaceAll('__SINGLE_CHANGE_MAX_CONNS', String(zeroConns.single.change))

	fs.writeFileSync(flyioTomlFile, updatedContent, 'utf-8')
}

async function deployZeroViaFlyIo() {
	if (!flyioAppName) {
		throw new Error('Fly.io app name is not defined')
	}
	updateFlyioToml(flyioAppName)
	const apps = await exec('flyctl', ['apps', 'list', '-o', 'tldraw-gb-ltd'])
	if (apps.indexOf(flyioAppName) === -1) {
		await exec('flyctl', ['app', 'create', flyioAppName, '-o', 'tldraw-gb-ltd'], {
			pwd: zeroCacheFolder,
		})
	}
	await exec('flyctl', ['deploy', '-a', flyioAppName, '-c', 'flyio.toml'], { pwd: zeroCacheFolder })
}

// See https://zero.rocicorp.dev/docs/deployment for Zero deployment config reference
function updateFlyioReplicationManagerToml(appName: string, backupPath: string): void {
	assert('rm' in zeroConns, 'multi-node connection limits required')
	const tomlTemplate = path.join(zeroCacheFolder, 'flyio-replication-manager.template.toml')
	const flyioTomlFile = path.join(zeroCacheFolder, 'flyio-replication-manager.toml')

	const fileContent = fs.readFileSync(tomlTemplate, 'utf-8')
	const zeroAdminPassword = env.ZERO_ADMIN_PASSWORD

	const updatedContent = fileContent
		.replaceAll('__APP_NAME', appName)
		.replaceAll('__BACKUP_PATH', backupPath)
		.replace('__ZERO_VERSION', zeroVersion)
		.replaceAll('__BOTCOM_POSTGRES_CONNECTION_STRING', env.BOTCOM_POSTGRES_CONNECTION_STRING)
		.replaceAll('__ZERO_ADMIN_PASSWORD', zeroAdminPassword)
		.replaceAll('__ZERO_R2_ENDPOINT', env.ZERO_R2_ENDPOINT)
		.replaceAll('__ZERO_R2_BUCKET_NAME', env.ZERO_R2_BUCKET_NAME)
		.replaceAll('__ZERO_R2_ACCESS_KEY_ID', env.ZERO_R2_ACCESS_KEY_ID)
		.replaceAll('__ZERO_R2_SECRET_ACCESS_KEY', env.ZERO_R2_SECRET_ACCESS_KEY)
		.replaceAll('__RM_UPSTREAM_MAX_CONNS', String(zeroConns.rm.upstream))
		.replaceAll('__RM_CVR_MAX_CONNS', String(zeroConns.rm.cvr))
		.replaceAll('__RM_CHANGE_MAX_CONNS', String(zeroConns.rm.change))

	fs.writeFileSync(flyioTomlFile, updatedContent, 'utf-8')
}

function updateFlyioViewSyncerToml(
	appName: string,
	replManagerUri: string,
	backupPath: string
): void {
	assert('vs' in zeroConns, 'multi-node connection limits required')
	const tomlTemplate = path.join(zeroCacheFolder, 'flyio-view-syncer.template.toml')
	const flyioTomlFile = path.join(zeroCacheFolder, 'flyio-view-syncer.toml')

	const fileContent = fs.readFileSync(tomlTemplate, 'utf-8')
	const zeroAdminPassword = env.ZERO_ADMIN_PASSWORD

	const updatedContent = fileContent
		.replaceAll('__APP_NAME', appName)
		.replaceAll('__BACKUP_PATH', backupPath)
		.replace('__ZERO_VERSION', zeroVersion)
		.replaceAll('__BOTCOM_POSTGRES_CONNECTION_STRING', env.BOTCOM_POSTGRES_CONNECTION_STRING)
		.replaceAll('__ZERO_MUTATE_URL', zeroMutateUrl)
		.replaceAll('__ZERO_QUERY_URL', zeroQueryUrl)
		.replaceAll('__ZERO_ADMIN_PASSWORD', zeroAdminPassword)
		.replaceAll('__REPLICATION_MANAGER_URI', replManagerUri)
		.replaceAll('__ZERO_R2_ENDPOINT', env.ZERO_R2_ENDPOINT)
		.replaceAll('__ZERO_R2_BUCKET_NAME', env.ZERO_R2_BUCKET_NAME)
		.replaceAll('__ZERO_R2_ACCESS_KEY_ID', env.ZERO_R2_ACCESS_KEY_ID)
		.replaceAll('__ZERO_R2_SECRET_ACCESS_KEY', env.ZERO_R2_SECRET_ACCESS_KEY)
		.replaceAll('__VS_UPSTREAM_MAX_CONNS', String(zeroConns.vs.upstream))
		.replaceAll('__VS_CVR_MAX_CONNS', String(zeroConns.vs.cvr))
		.replaceAll('__VS_CHANGE_MAX_CONNS', String(zeroConns.vs.change))

	fs.writeFileSync(flyioTomlFile, updatedContent, 'utf-8')

	// Also process the Dockerfile template to inject the Zero version
	const dockerfileTemplate = path.join(zeroCacheFolder, 'Dockerfile.template')
	const dockerfilePath = path.join(zeroCacheFolder, 'Dockerfile')
	const dockerfileContent = fs.readFileSync(dockerfileTemplate, 'utf-8')
	const updatedDockerfile = dockerfileContent.replace('__ZERO_VERSION', zeroVersion)
	fs.writeFileSync(dockerfilePath, updatedDockerfile, 'utf-8')
}

async function deployZeroViaFlyIoMultiNode() {
	if (!flyioAppName || !flyioReplAppName) {
		throw new Error('Fly.io app names are not defined for multi-node deployment')
	}

	const apps = await exec('flyctl', ['apps', 'list', '-o', 'tldraw-gb-ltd'])

	// Deploy replication manager first
	const backupPath = previewId ?? env.TLDRAW_ENV
	updateFlyioReplicationManagerToml(flyioReplAppName, backupPath)
	if (apps.indexOf(flyioReplAppName) === -1) {
		await exec('flyctl', ['app', 'create', flyioReplAppName, '-o', 'tldraw-gb-ltd'], {
			pwd: zeroCacheFolder,
		})
	}
	await exec(
		'flyctl',
		[
			'secrets',
			'set',
			`ZERO_UPSTREAM_DB=${withStatementTimeout(env.BOTCOM_POSTGRES_CONNECTION_STRING)}`,
			`ZERO_CVR_DB=${withStatementTimeout(env.BOTCOM_POSTGRES_CONNECTION_STRING)}`,
			`ZERO_CHANGE_DB=${withStatementTimeout(env.BOTCOM_POSTGRES_CONNECTION_STRING)}`,
			`ZERO_ADMIN_PASSWORD=${env.ZERO_ADMIN_PASSWORD}`,
			// Zero uses the AWS SDK to talk to R2 (S3-compatible), so it expects AWS_* env vars
			`AWS_ACCESS_KEY_ID=${env.ZERO_R2_ACCESS_KEY_ID}`,
			`AWS_SECRET_ACCESS_KEY=${env.ZERO_R2_SECRET_ACCESS_KEY}`,
			'-a',
			flyioReplAppName,
		],
		{ pwd: zeroCacheFolder }
	)
	await exec('flyctl', ['deploy', '-a', flyioReplAppName, '-c', 'flyio-replication-manager.toml'], {
		pwd: zeroCacheFolder,
	})

	// Deploy view syncer with reference to replication manager
	const replManagerUri = `http://${flyioReplAppName}.internal:4849`
	updateFlyioViewSyncerToml(flyioAppName, replManagerUri, backupPath)
	if (apps.indexOf(flyioAppName) === -1) {
		await exec('flyctl', ['app', 'create', flyioAppName, '-o', 'tldraw-gb-ltd'], {
			pwd: zeroCacheFolder,
		})
	}
	await exec(
		'flyctl',
		[
			'secrets',
			'set',
			`ZERO_UPSTREAM_DB=${withStatementTimeout(env.BOTCOM_POSTGRES_CONNECTION_STRING)}`,
			`ZERO_CVR_DB=${withStatementTimeout(env.BOTCOM_POSTGRES_CONNECTION_STRING)}`,
			`ZERO_CHANGE_DB=${withStatementTimeout(env.BOTCOM_POSTGRES_CONNECTION_STRING)}`,
			`ZERO_ADMIN_PASSWORD=${env.ZERO_ADMIN_PASSWORD}`,
			// Zero uses the AWS SDK to talk to R2 (S3-compatible), so it expects AWS_* env vars
			`AWS_ACCESS_KEY_ID=${env.ZERO_R2_ACCESS_KEY_ID}`,
			`AWS_SECRET_ACCESS_KEY=${env.ZERO_R2_SECRET_ACCESS_KEY}`,
			'-a',
			flyioAppName,
		],
		{ pwd: zeroCacheFolder }
	)
	await exec('flyctl', ['deploy', '-a', flyioAppName, '-c', 'flyio-view-syncer.toml'], {
		pwd: zeroCacheFolder,
	})
	await exec('flyctl', ['scale', 'count', '2', '-a', flyioAppName, '--yes'], {
		pwd: zeroCacheFolder,
	})
}

async function deployZeroBackend() {
	if (deployZero === 'flyio') {
		await deployZeroViaFlyIo()
	} else if (deployZero === 'flyio-multinode') {
		await deployZeroViaFlyIoMultiNode()
	}
}

async function deploySpa(): Promise<{ deploymentUrl: string; inspectUrl: string }> {
	// both 'staging' and 'production' are deployed to vercel as 'production' deploys
	// in separate 'projects'
	const prod = env.TLDRAW_ENV !== 'preview'
	const out = await vercelCli('deploy', ['--prebuilt', ...(prod ? ['--prod'] : [])], {
		pwd: dotcom,
	})

	const previewURL = out.match(/Preview: (https:\/\/\S*)/)?.[1]
	const inspectUrl = out.match(/Inspect: (https:\/\/\S*)/)?.[1]
	const productionURL = out.match(/Production: (https:\/\/\S*)/)?.[1]
	const deploymentUrl = previewURL ?? productionURL

	if (!deploymentUrl) {
		throw new Error('Could not find deployment URL in vercel output ' + out)
	}
	if (!inspectUrl) {
		throw new Error('Could not find inspect URL in vercel output ' + out)
	}

	return { deploymentUrl, inspectUrl }
}

const sentryEnv = {
	SENTRY_AUTH_TOKEN: env.SENTRY_AUTH_TOKEN,
	SENTRY_ORG: 'tldraw',
	SENTRY_PROJECT: 'lite',
}

const execSentry = (command: string, args: string[]) =>
	exec(`yarn`, ['run', '-T', 'sentry-cli', command, ...args], { env: sentryEnv })

async function createSentryRelease() {
	await execSentry('releases', ['new', sentryReleaseName])
	if (!existsSync(`${dotcom}/sentry-release-name.ts`)) {
		throw new Error('sentry-release-name.ts does not exist')
	}
	writeFileSync(
		`${dotcom}/sentry-release-name.ts`,
		`// This file is replaced during deployments to point to a meaningful release name in Sentry.` +
			`// DO NOT MESS WITH THIS LINE OR THE ONE BELOW IT. I WILL FIND YOU\n` +
			`export const sentryReleaseName = '${sentryReleaseName}'`
	)
}

async function uploadSourceMaps() {
	const sourceMapDir = `${dotcom}/dist/assets`

	await execSentry('sourcemaps', ['upload', '--release', sentryReleaseName, sourceMapDir])
	execSync('rm -rf ./.next/static/chunks/**/*.map')
}

const R2_URL = `https://c34edc4e76350954b63adebde86d5eb1.r2.cloudflarestorage.com`
const R2_BUCKET = `dotcom-deploy-assets-cache`

const R2 = new S3Client({
	region: 'auto',
	endpoint: R2_URL,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_ACCESS_KEY_SECRET,
	},
})

/**
 * When we run a vite prod build it creates a folder in the output dir called assets in which
 * every file includes a hash of its contents in the filename. These files include files that
 * are 'imported' by the js bundle, e.g. svg and css files, along with the js bundle itself
 * (split into chunks).
 *
 * By default, when we deploy a new version of the app it will replace the previous versions
 * of the files with new versions. This is problematic when we make a new deploy because if
 * existing users have tldraw open in tabs while we make the new deploy, they might still try
 * to fetch .js chunks or images which are no longer present on the server and may not have
 * been cached by vercel's CDN in their location (or at all).
 *
 * To avoid this, we keep track of the assets from previous deploys in R2 and include them in the
 * new deploy. This way, if a user has an old version of the app open in a tab, they will still
 * be able to fetch the old assets from the previous deploy.
 */
async function coalesceWithPreviousAssets(assetsDir: string) {
	nicelog('Saving assets to R2 bucket')
	const objectKey = `${previewId ?? env.TLDRAW_ENV}/${new Date().toISOString()}+${sha}.tar.gz`
	const pack = tar.c({ gzip: true, cwd: assetsDir }, readdirSync(assetsDir))
	// Need to pipe through a PassThrough here because the tar stream is not a first class node stream
	// and AWS's sdk expects a node stream (it checks `Body instanceof streams.Readable`)
	const Body = new PassThrough()
	pack.pipe(Body)
	await new Upload({
		client: R2,
		params: {
			Bucket: R2_BUCKET,
			Key: objectKey,
			Body,
		},
	}).done()

	nicelog('Extracting previous assets from R2 bucket')
	const { Contents } = await R2.send(
		new ListObjectsV2Command({
			Bucket: R2_BUCKET,
			Prefix: `${previewId ?? env.TLDRAW_ENV}/`,
		})
	)
	const [mostRecent, ...others] =
		// filter out the one we just uploaded
		Contents?.filter((obj) => obj.Key !== objectKey).sort(
			(a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0)
		) ?? []

	if (!mostRecent) {
		nicelog('No previous assets found')
		return
	}

	// Always include the assets from the directly previous build, but also if there
	// have been more deploys in the last six months, include those too.
	const oneMonth = 1000 * 60 * 60 * 24 * 30
	const recentOthers = others.filter(
		(o) => (o.LastModified?.getTime() ?? 0) > Date.now() - oneMonth
	)
	const objectsToFetch = [mostRecent, ...recentOthers]

	nicelog(
		`Fetching ${objectsToFetch.length} previous assets from R2 bucket:`,
		objectsToFetch.map((k) => k.Key)
	)
	for (const obj of objectsToFetch) {
		const { Body } = await R2.send(
			new GetObjectCommand({
				Bucket: R2_BUCKET,
				Key: obj.Key,
			})
		)
		if (!Body) {
			throw new Error(`Could not fetch object ${obj.Key}`)
		}
		// pipe into untar
		// `keep-existing` is important here because we don't want to overwrite the new assets
		// if they have the same name as the old assets becuase they will have different sentry debugIds
		// and it will mess up the inline source viewer on sentry errors.
		const out = tar.x({ cwd: assetsDir, 'keep-existing': true })
		for await (const chunk of Body?.transformToWebStream() as any as AsyncIterable<Uint8Array>) {
			out.write(Buffer.from(chunk.buffer))
		}
		out.end()
	}
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
