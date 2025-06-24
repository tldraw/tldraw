import * as github from '@actions/github'
import { ECSClient, ListClustersCommand } from '@aws-sdk/client-ecs'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

// Do not use `process.env` directly in this script. Add your variable to `makeEnv` and use it via
// `env` instead. This makes sure that all required env vars are present.
const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'GH_TOKEN',
	'NEON_API_KEY',
	'NEON_PROJECT_ID',
])

interface ListWorkersResult {
	success: boolean
	result: { id: string }[]
}

const _isPrClosedCache = new Map<number, boolean>()
async function isPrClosedForAWhile(prNumber: number) {
	if (_isPrClosedCache.has(prNumber)) {
		return _isPrClosedCache.get(prNumber)!
	}

	let prResult
	try {
		prResult = await github.getOctokit(env.GH_TOKEN).rest.pulls.get({
			owner: 'tldraw',
			repo: 'tldraw',
			pull_number: prNumber,
		})
	} catch (err: any) {
		if (err.status === 404) {
			_isPrClosedCache.set(prNumber, true)
			return true
		}
		throw err
	}
	const timeout = 1000 * 60 * 60 * 24 * 2 // two days
	const result =
		prResult.data.state === 'closed' &&
		Date.now() - new Date(prResult.data.closed_at!).getTime() > timeout
	_isPrClosedCache.set(prNumber, result)
	return result
}

const CLOUDFLARE_WORKER_REGEX = /^pr-(\d+)-/
const CLOUDFLARE_SYNC_WORKER_REGEX = /^pr-\d+-tldraw-multiplayer$/

async function cloudflareApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
	const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}${endpoint}`
	return fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
			'Content-Type': 'application/json',
		},
	})
}

async function listPreviewWorkerDeployments() {
	const res = await cloudflareApi('/workers/scripts')
	const data = (await res.json()) as ListWorkersResult
	if (!data.success) {
		throw new Error('Failed to list workers ' + JSON.stringify(data))
	}
	return (
		data.result
			.map((r) => r.id)
			.filter((id) => id.match(CLOUDFLARE_WORKER_REGEX))
			// We want to delete the image optimizers first since they have a service binding to the main workers
			.sort((a, b) => {
				if (a.includes('image-optimizer')) return -1
				if (b.includes('image-optimizer')) return 1
				return 0
			})
	)
}

async function deleteQueue(queueName: string) {
	nicelog('Deleting queue:', queueName)
	await exec('npx', ['wrangler', 'queues', 'delete', queueName], {
		env: { CI: '1' },
	})
}

async function deleteQueueConsumer(queueName: string, scriptName: string) {
	nicelog('Deleting queue consumer:', scriptName, 'from queue:', queueName)
	await exec('npx', ['wrangler', 'queues', 'consumer', 'worker', 'remove', queueName, scriptName], {
		env: { CI: '1' },
	})
}

async function deletePreviewWorker(workerName: string) {
	nicelog('Deleting worker:', workerName)
	await exec('npx', ['wrangler', 'delete', '--name', workerName], {
		env: { CI: '1' },
	})
}

async function deletePreviewWorkerDeployment(id: string) {
	// We want to delete the queue consumer and the queue only once. We'll do it just before we delete the worker
	if (id.match(CLOUDFLARE_SYNC_WORKER_REGEX)) {
		const prNumber = Number(id.match(CLOUDFLARE_WORKER_REGEX)?.[1])
		const queueName = `tldraw-multiplayer-queue-pr-${prNumber}`

		try {
			await deleteQueueConsumer(queueName, id)
		} catch (err) {
			nicelog(`Failed to delete consumer ${id}: ${err}`)
		}
		await deletePreviewWorker(id)
		try {
			await deleteQueue(queueName)
		} catch (err) {
			nicelog(`Failed to delete queue ${queueName}: ${err}`)
		}
	} else {
		await deletePreviewWorker(id)
	}
}

const neonHeaders = {
	Authorization: `Bearer ${env.NEON_API_KEY}`,
}

async function getBranchId(branchName: string) {
	const url = `https://console.neon.tech/api/v2/projects/${env.NEON_PROJECT_ID}/branches?search=${branchName}`
	nicelog('GET', url)
	const res = await fetch(url, {
		headers: neonHeaders,
	})

	if (!res.ok) {
		throw new Error('Failed to list branches ' + JSON.stringify(await res.json()))
	}

	const data = (await res.json()) as { branches: { id: string; name: string }[] }

	return data.branches.find((b) => b.name === branchName)?.id
}

async function deletePreviewDatabase(branchName: string) {
	const id = await getBranchId(branchName)
	if (!id) {
		nicelog(`Branch ${branchName} not found`)
		return
	}

	const url = `https://console.neon.tech/api/v2/projects/${env.NEON_PROJECT_ID}/branches/${id}`
	nicelog('DELETE', url)
	const res = await fetch(url, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${env.NEON_API_KEY}`,
		},
	})
	nicelog('status', res.status)
}

async function deleteFlyioPreviewApp(appName: string) {
	const result = await exec('flyctl', ['apps', 'list', '-o', 'tldraw-gb-ltd'])
	if (result.indexOf(appName) >= 0) {
		await exec('flyctl', ['apps', 'destroy', appName, '-y'])
	}
}

const NEON_PREVIEW_DB_REGEX = /^pr-\d+$/
async function listPreviewDatabases() {
	const url = `https://console.neon.tech/api/v2/projects/${env.NEON_PROJECT_ID}/branches`
	const res = await fetch(url, {
		headers: {
			method: 'GET',
			Authorization: `Bearer ${env.NEON_API_KEY}`,
		},
	})
	if (!res.ok) {
		return []
	}
	return ((await res.json()) as { branches: { name: string }[] }).branches
		.filter((b) => NEON_PREVIEW_DB_REGEX.test(b.name))
		.map((b) => b.name)
}
const ZERO_CACHE_APP_REGEX = /^pr-\d+-zero-cache$/
async function listFlyioPreviewApps() {
	// This is the kind of output this returns.
	// We'll skip the first line then get the first column of each line.
	// NAME                    OWNER           STATUS          LATEST DEPLOY
	// pr-5795-zero-cache      tldraw-gb-ltd   deployed        39m37s ago
	const result = await exec('flyctl', ['apps', 'list', '-o', 'tldraw-gb-ltd'])
	const lines = result.trim().split('\n')
	if (lines.length <= 1) return []

	const appNames = lines.slice(1).map((line) => {
		const [name] = line.trim().split(/\s+/)
		return name
	})

	return appNames.filter((name) => ZERO_CACHE_APP_REGEX.test(name))
}

async function listAmazonClusters() {
	const client = new ECSClient({ region: 'eu-north-1' })
	const data = await client.send(new ListClustersCommand({}))
	if (!data.clusterArns) {
		return []
	}
	const names = []
	for (const arn of data.clusterArns) {
		const match = arn.match(/tldraw-(pr-\d+)-/)
		if (match) {
			names.push(match[1])
		}
	}
	return names
}

async function deleteSstPreviewApp(stage: string) {
	await exec('yarn', ['sst', 'remove', '--stage', stage])
}

const deletionErrors: string[] = []

async function main() {
	nicelog('Getting queues information')
	await processItems(listPreviewWorkerDeployments, deletePreviewWorkerDeployment)
	nicelog('\nPruning preview databases')
	await processItems(listPreviewDatabases, deletePreviewDatabase)
	nicelog('\nPruning fly.io preview apps')
	await processItems(listFlyioPreviewApps, deleteFlyioPreviewApp)
	nicelog('\nPruning sst preview stages')
	await processItems(listAmazonClusters, deleteSstPreviewApp)
	nicelog('\nDone')
	if (deletionErrors.length > 0) {
		nicelog('\nDeletion errors:')
		for (const error of deletionErrors) {
			nicelog(error)
		}
		process.exit(1)
	}
}

async function processItems(
	fetchFn: () => Promise<string[]>,
	deleteFn: (id: string) => Promise<void>
) {
	const items = await fetchFn()
	for (const item of items) {
		const number = Number(item.match(/pr-(\d+)/)?.[1])
		if (!number || isNaN(number)) {
			nicelog(`Skipping ${item} because it doesn't match the regex`)
			continue
		}
		if (await isPrClosedForAWhile(number)) {
			nicelog(`Deleting ${item} because PR is closed`)
			try {
				await deleteFn(item)
			} catch (err) {
				deletionErrors.push(`${item}: ${err}`)
			}
		} else {
			nicelog(`Skipping ${item} because PR is still open`)
		}
	}
}

main()
