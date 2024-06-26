import * as github from '@actions/github'
import { appendFile } from 'fs/promises'
import { join } from 'path'
import { env } from 'process'
import { exec } from './exec'

export function getDeployInfo() {
	const githubPrNumber = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)\/merge/)?.[1]

	let previewId = process.env.TLDRAW_PREVIEW_ID
	if (!previewId && env.TLDRAW_ENV === 'preview') {
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
}: {
	location: string
	dryRun: boolean
	env: string
	vars: Record<string, string>
}) {
	const varsArray = []
	for (const [key, value] of Object.entries(vars)) {
		varsArray.push('--var', `${key}:${value}`)
	}

	const out = await exec(
		'yarn',
		['wrangler', 'deploy', dryRun ? '--dry-run' : null, '--env', env, ...varsArray],
		{
			pwd: location,
			env: {
				NODE_ENV: 'production',
				// wrangler needs CI=1 set to prevent it from trying to do interactive prompts
				CI: '1',
			},
		}
	)

	const match = out.match(/Current Version ID: (.+)/)
	if (!match) {
		throw new Error('Could not find the deploy ID in wrangler output')
	}
	return match[1]
}

export async function setWranglerPreviewWorkerName(location: string, name: string) {
	await appendFile(
		join(location, 'wrangler.toml'),
		`
[env.preview]
name = "${name}"`
	)
}
