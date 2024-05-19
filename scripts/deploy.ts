import * as github from '@actions/github'
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import assert from 'assert'
import { execSync } from 'child_process'
import { appendFileSync, existsSync, readdirSync, writeFileSync } from 'fs'
import path, { join } from 'path'
import { PassThrough } from 'stream'
import * as tar from 'tar'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

const worker = path.relative(process.cwd(), path.resolve(__dirname, '../apps/dotcom-worker'))
const healthWorker = path.relative(process.cwd(), path.resolve(__dirname, '../apps/health-worker'))
const assetUpload = path.relative(
	process.cwd(),
	path.resolve(__dirname, '../apps/dotcom-asset-upload')
)
const dotcom = path.relative(process.cwd(), path.resolve(__dirname, '../apps/dotcom'))

// Do not use `process.env` directly in this script. Add your variable to `makeEnv` and use it via
// `env` instead. This makes sure that all required env vars are present.
const env = makeEnv([
	'APP_ORIGIN',
	'ASSET_UPLOAD',
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'DISCORD_DEPLOY_WEBHOOK_URL',
	'DISCORD_HEALTH_WEBHOOK_URL',
	'HEALTH_WORKER_UPDOWN_WEBHOOK_PATH',
	'GC_MAPS_API_KEY',
	'RELEASE_COMMIT_HASH',
	'SENTRY_AUTH_TOKEN',
	'SENTRY_DSN',
	'SUPABASE_LITE_ANON_KEY',
	'SUPABASE_LITE_URL',
	'TLDRAW_ENV',
	'VERCEL_PROJECT_ID',
	'VERCEL_ORG_ID',
	'VERCEL_TOKEN',
	'WORKER_SENTRY_DSN',
	'MULTIPLAYER_SERVER',
	'GH_TOKEN',
	'R2_ACCESS_KEY_ID',
	'R2_ACCESS_KEY_SECRET',
])

const githubPrNumber = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)\/merge/)?.[1]
function getPreviewId() {
	if (env.TLDRAW_ENV !== 'preview') return undefined
	if (githubPrNumber) return `pr-${githubPrNumber}`
	return process.env.TLDRAW_PREVIEW_ID ?? undefined
}
const previewId = getPreviewId()

if (env.TLDRAW_ENV === 'preview' && !previewId) {
	throw new Error(
		'If running preview deploys from outside of a PR action, TLDRAW_PREVIEW_ID env var must be set'
	)
}
const sha =
	// if the event is 'pull_request', github.context.sha is an ephemeral merge commit
	// while the actual commit we want to create the deployment for is the 'head' of the PR.
	github.context.eventName === 'pull_request'
		? github.context.payload.pull_request?.head.sha
		: github.context.sha

const sentryReleaseName = `${env.TLDRAW_ENV}-${previewId ? previewId + '-' : ''}-${sha}`

async function main() {
	assert(
		env.TLDRAW_ENV === 'staging' || env.TLDRAW_ENV === 'production' || env.TLDRAW_ENV === 'preview',
		'TLDRAW_ENV must be staging or production or preview'
	)

	await discordMessage(`--- **${env.TLDRAW_ENV} deploy pre-flight** ---`)

	await discordStep('[1/7] setting up deploy', async () => {
		// make sure the tldraw .css files are built:
		await exec('yarn', ['lazy', 'prebuild'])

		// link to vercel and supabase projects:
		await vercelCli('link', ['--project', env.VERCEL_PROJECT_ID])
	})

	// deploy pre-flight steps:
	// 1. get the dotcom app ready to go (env vars and pre-build)
	await discordStep('[2/7] building dotcom app', async () => {
		await createSentryRelease()
		await prepareDotcomApp()
		await uploadSourceMaps()
		await coalesceWithPreviousAssets(`${dotcom}/.vercel/output/static/assets`)
	})

	await discordStep('[3/7] cloudflare deploy dry run', async () => {
		await deployAssetUploadWorker({ dryRun: true })
		await deployHealthWorker({ dryRun: true })
		await deployTlsyncWorker({ dryRun: true })
	})

	// --- point of no return! do the deploy for real --- //

	await discordMessage(`--- **pre-flight complete, starting real deploy** ---`)

	// 2. deploy the cloudflare workers:
	await discordStep('[4/7] deploying asset uploader to cloudflare', async () => {
		await deployAssetUploadWorker({ dryRun: false })
	})
	await discordStep('[5/7] deploying multiplayer worker to cloudflare', async () => {
		await deployTlsyncWorker({ dryRun: false })
	})
	await discordStep('[6/7] deploying health worker to cloudflare', async () => {
		await deployHealthWorker({ dryRun: false })
	})

	// 3. deploy the pre-build dotcom app:
	const { deploymentUrl, inspectUrl } = await discordStep(
		'[7/7] deploying dotcom app to vercel',
		async () => {
			return await deploySpa()
		}
	)

	let deploymentAlias = null as null | string

	if (previewId) {
		const aliasDomain = `${previewId}-preview-deploy.tldraw.com`
		await discordStep('[8/7] aliasing preview deployment', async () => {
			await vercelCli('alias', ['set', deploymentUrl, aliasDomain])
		})

		deploymentAlias = `https://${aliasDomain}`
	}

	nicelog('Creating deployment for', deploymentUrl)
	await createGithubDeployment(deploymentAlias ?? deploymentUrl, inspectUrl)

	await discordMessage(`**Deploy complete!**`)
}

async function prepareDotcomApp() {
	// pre-build the app:
	await exec('yarn', ['build-app'], {
		env: {
			NEXT_PUBLIC_TLDRAW_RELEASE_INFO: `${env.RELEASE_COMMIT_HASH} ${new Date().toISOString()}`,
			ASSET_UPLOAD: previewId
				? `https://${previewId}-tldraw-assets.tldraw.workers.dev`
				: env.ASSET_UPLOAD,
			MULTIPLAYER_SERVER: previewId
				? `https://${previewId}-tldraw-multiplayer.tldraw.workers.dev`
				: env.MULTIPLAYER_SERVER,
			NEXT_PUBLIC_CONTROL_SERVER: 'https://control.tldraw.com',
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
	if (previewId && !didUpdateAssetUploadWorker) {
		appendFileSync(
			join(assetUpload, 'wrangler.toml'),
			`
[env.preview]
name = "${previewId}-tldraw-assets"`
		)
		didUpdateAssetUploadWorker = true
	}
	await exec('yarn', ['wrangler', 'deploy', dryRun ? '--dry-run' : null, '--env', env.TLDRAW_ENV], {
		pwd: assetUpload,
		env: {
			NODE_ENV: 'production',
			// wrangler needs CI=1 set to prevent it from trying to do interactive prompts
			CI: '1',
		},
	})
}

let didUpdateTlsyncWorker = false
async function deployTlsyncWorker({ dryRun }: { dryRun: boolean }) {
	const workerId = `${previewId ?? env.TLDRAW_ENV}-tldraw-multiplayer`
	if (previewId && !didUpdateTlsyncWorker) {
		appendFileSync(
			join(worker, 'wrangler.toml'),
			`
[env.preview]
name = "${previewId}-tldraw-multiplayer"`
		)
		didUpdateTlsyncWorker = true
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
			`SUPABASE_URL:${env.SUPABASE_LITE_URL}`,
			'--var',
			`SUPABASE_KEY:${env.SUPABASE_LITE_ANON_KEY}`,
			'--var',
			`SENTRY_DSN:${env.WORKER_SENTRY_DSN}`,
			'--var',
			`TLDRAW_ENV:${env.TLDRAW_ENV}`,
			'--var',
			`APP_ORIGIN:${env.APP_ORIGIN}`,
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

let didUpdateHealthWorker = false
async function deployHealthWorker({ dryRun }: { dryRun: boolean }) {
	if (previewId && !didUpdateHealthWorker) {
		appendFileSync(
			join(healthWorker, 'wrangler.toml'),
			`
[env.preview]
name = "${previewId}-tldraw-health"`
		)
		didUpdateHealthWorker = true
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
			`DISCORD_HEALTH_WEBHOOK_URL:${env.DISCORD_HEALTH_WEBHOOK_URL}`,
			'--var',
			`HEALTH_WORKER_UPDOWN_WEBHOOK_PATH:${env.HEALTH_WORKER_UPDOWN_WEBHOOK_PATH}`,
		],
		{
			pwd: healthWorker,
			env: {
				NODE_ENV: 'production',
				// wrangler needs CI=1 set to prevent it from trying to do interactive prompts
				CI: '1',
			},
		}
	)
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

function sanitizeVariables(errorOutput: string): string {
	const regex = /(--var\s+(\w+):[^ \n]+)/g

	const sanitizedOutput = errorOutput.replace(regex, (_, match) => {
		const [variable] = match.split(':')
		return `${variable}:*`
	})

	return sanitizedOutput
}

async function discord(method: string, url: string, body: unknown): Promise<any> {
	const response = await fetch(`${env.DISCORD_DEPLOY_WEBHOOK_URL}${url}`, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!response.ok) {
		throw new Error(`Discord webhook request failed: ${response.status} ${response.statusText}`)
	}
	return response.json()
}

const AT_TEAM_MENTION = '<@&959380625100513310>'
async function discordMessage(content: string, { always = false }: { always?: boolean } = {}) {
	const shouldNotify = env.TLDRAW_ENV === 'production' || always
	if (!shouldNotify) {
		return {
			edit: () => {
				// noop
			},
		}
	}

	const message = await discord('POST', '?wait=true', { content: sanitizeVariables(content) })

	return {
		edit: async (newContent: string) => {
			await discord('PATCH', `/messages/${message.id}`, { content: sanitizeVariables(newContent) })
		},
	}
}

async function discordStep<T>(content: string, cb: () => Promise<T>): Promise<T> {
	const message = await discordMessage(`${content}...`)
	try {
		const result = await cb()
		await message.edit(`${content} ✅`)
		return result
	} catch (err) {
		await message.edit(`${content} ❌`)
		throw err
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

// Creates a github 'deployment', which creates a 'View Deployment' button in the PR timeline.
async function createGithubDeployment(deploymentUrl: string, inspectUrl: string) {
	const client = github.getOctokit(env.GH_TOKEN)

	const deployment = await client.rest.repos.createDeployment({
		owner: 'tldraw',
		repo: 'tldraw',
		ref: sha,
		payload: { web_url: deploymentUrl },
		environment: env.TLDRAW_ENV,
		transient_environment: true,
		required_contexts: [],
		auto_merge: false,
		task: 'deploy',
	})

	await client.rest.repos.createDeploymentStatus({
		owner: 'tldraw',
		repo: 'tldraw',
		deployment_id: (deployment.data as any).id,
		state: 'success',
		environment_url: deploymentUrl,
		log_url: inspectUrl,
	})
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
	// have been more deploys in the last two weeks, include those too.
	const twoWeeks = 1000 * 60 * 60 * 24 * 14
	const recentOthers = others.filter(
		(o) => (o.LastModified?.getTime() ?? 0) > Date.now() - twoWeeks
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
		await discordMessage(`${AT_TEAM_MENTION} Deploy failed: ${err.stack}`, { always: true })
	}
	console.error(err)
	process.exit(1)
})
