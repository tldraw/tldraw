import * as github from '@actions/github'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { exec } from './exec'

export function getDeployInfo() {
	const githubPrNumber = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)\/merge/)?.[1]

	let previewId = process.env.TLDRAW_PREVIEW_ID
	if (!previewId && process.env.TLDRAW_ENV === 'preview') {
		if (githubPrNumber) {
			previewId = `pr-${githubPrNumber}`
		} else {
			throw new Error(
				'If running preview deploys from outside of a PR action, TLDRAW_PREVIEW_ID env var must be set'
			)
		}
	}

	const sha: string | undefined =
		// if the event is 'pull_request', github.context.sha is an ephemeral merge commit
		// while the actual commit we want to create the deployment for is the 'head' of the PR.
		github.context.eventName === 'pull_request'
			? github.context.payload.pull_request?.head.sha
			: github.context.sha

	if (!sha) {
		throw new Error('Could not determine the SHA of the commit to deploy')
	}

	return {
		githubPrNumber,
		previewId,
		sha,
	}
}

// Creates a github 'deployment', which creates a 'View Deployment' button in the PR timeline.
export async function createGithubDeployment(
	env: { GH_TOKEN: string; TLDRAW_ENV: string },
	{
		app,
		deploymentUrl,
		inspectUrl,
		sha,
	}: { app: string; deploymentUrl: string; inspectUrl?: string; sha: string }
) {
	const client = github.getOctokit(env.GH_TOKEN)

	const deployment = await client.rest.repos.createDeployment({
		owner: 'tldraw',
		repo: 'tldraw',
		ref: sha,
		payload: { web_url: deploymentUrl },
		environment: `${app}-${env.TLDRAW_ENV}`,
		transient_environment: env.TLDRAW_ENV === 'preview',
		production_environment: env.TLDRAW_ENV === 'production',
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

/** Deploy a worker to wrangler, returning the deploy ID */
export async function wranglerDeploy({
	location,
	dryRun,
	env,
	vars,
	sentry,
}: {
	location: string
	dryRun: boolean
	env: string
	vars: Record<string, string>
	sentry?: {
		authToken: string
		project: string
		environment?: string
	}
}) {
	const varsArray = []
	for (const [key, value] of Object.entries(vars)) {
		varsArray.push('--var', `${key}:${value}`)
	}

	const out = await exec(
		'yarn',
		[
			'wrangler',
			'deploy',
			dryRun ? '--dry-run' : null,
			'--env',
			env,
			'--outdir',
			'.wrangler/dist',
			...varsArray,
		],
		{
			pwd: location,
			env: {
				NODE_ENV: 'production',
				// wrangler needs CI=1 set to prevent it from trying to do interactive prompts
				CI: '1',
			},
		}
	)

	if (dryRun) return

	const versionMatch = out.match(/Current Version ID: (.+)/)
	if (!versionMatch) {
		throw new Error('Could not find the deploy ID in wrangler output')
	}

	const workerNameMatch = out.match(/Uploaded ([^ ]+)/)

	if (!workerNameMatch) {
		throw new Error('Could not find the worker name in wrangler output')
	}

	if (sentry) {
		const release = `${sentry.environment ?? workerNameMatch[1]}.${versionMatch[1]}`

		const sentryEnv = {
			SENTRY_AUTH_TOKEN: sentry.authToken,
			SENTRY_ORG: 'tldraw',
			SENTRY_PROJECT: sentry.project,
		}

		// create a sentry release:
		await exec('yarn', ['run', '-T', 'sentry-cli', 'releases', 'new', release], {
			pwd: location,
			env: sentryEnv,
		})

		// upload sourcemaps to the release:
		await exec(
			'yarn',
			[
				'run',
				'-T',
				'sentry-cli',
				'releases',
				'files',
				release,
				'upload-sourcemaps',
				'.wrangler/dist',
			],
			{
				pwd: location,
				env: sentryEnv,
			}
		)
	}
}

export interface ServiceBinding {
	binding: string
	service: string
}

export async function setWranglerPreviewConfig(
	location: string,
	{
		name,
		customDomain,
		serviceBinding,
	}: { name: string; customDomain?: string; serviceBinding?: ServiceBinding },
	queueName?: string
) {
	const additionalProperties = `name = "${name}"
${customDomain ? `routes = [ { pattern = "${customDomain}", custom_domain = true} ]` : ''}
${serviceBinding ? `services = [ {binding = "${serviceBinding.binding}", service = "${serviceBinding.service}" } ]` : ''}`

	const envPreviewSection = `\n[env.preview]\n${additionalProperties}\n`

	const path = join(location, 'wrangler.toml')
	let data = readFileSync(path).toString()

	// Replace the entire [env.preview] section including all its properties
	// Match from [env.preview] to the next section or end of file
	const previewSectionRegex = /\n\[env\.preview\]\n(?:[^[](?:[^\n]*\n)*)?/

	if (previewSectionRegex.test(data)) {
		data = data.replace(previewSectionRegex, envPreviewSection)
	} else {
		data += envPreviewSection
	}

	if (queueName) {
		const envPreviewQueuesSection = `\n[[env.preview.queues.producers]]
queue = "${queueName}"
binding = "QUEUE"

[[env.preview.queues.consumers]]
queue = "${queueName}"
max_retries =10
`
		data += envPreviewQueuesSection
	}

	writeFileSync(path, data)
}
