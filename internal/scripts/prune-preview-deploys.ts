import * as github from '@actions/github'
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

// Do not use `process.env` directly in this script. Add your variable to `makeEnv` and use it via
// `env` instead. This makes sure that all required env vars are present.
const env = makeEnv([
	'CLOUDFLARE_ACCOUNT_ID',
	'CLOUDFLARE_API_TOKEN',
	'GH_TOKEN',
	'SUPABASE_ACCESS_TOKEN',
	'SUPABASE_PREVIEW_PROJECT_ID',
	'ZERO_R2_ENDPOINT',
	'ZERO_R2_BUCKET_NAME',
	'ZERO_R2_ACCESS_KEY_ID',
	'ZERO_R2_SECRET_ACCESS_KEY',
	'R2_ACCESS_KEY_ID',
	'R2_ACCESS_KEY_SECRET',
])

interface ListWorkersResult {
	success: boolean
	result: { id: string }[]
}

const _isPrClosedCache = new Map<number, boolean>()
async function isPrClosed(prNumber: number) {
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
	const result = prResult.data.state === 'closed'
	_isPrClosedCache.set(prNumber, result)
	return result
}

const CLOUDFLARE_WORKER_REGEX = /^pr-(\d+)-/
const CLOUDFLARE_SYNC_WORKER_REGEX = /^pr-\d+-tldraw-multiplayer$/

async function cloudflareV4Api(endpoint: string, options: RequestInit = {}): Promise<Response> {
	const url = `https://api.cloudflare.com/client/v4${endpoint}`
	return fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
			'Content-Type': 'application/json',
		},
	})
}

async function cloudflareApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
	return cloudflareV4Api(`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}${endpoint}`, options)
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
			// Delete workers with service bindings to other workers first (image-optimizer and tldrawusercontent both bind to the sync worker)
			.sort((a, b) => {
				const aHasBinding = a.includes('image-optimizer') || a.includes('tldrawusercontent')
				const bHasBinding = b.includes('image-optimizer') || b.includes('tldrawusercontent')
				if (aHasBinding && !bHasBinding) return -1
				if (!aHasBinding && bHasBinding) return 1
				return 0
			})
	)
}

// Preview routes and cert packs live on the preview zone rather than the account.
const CLOUDFLARE_PREVIEW_ZONE = 'tldraw.xyz'
let _previewZoneId: string | undefined
async function getPreviewZoneId() {
	if (_previewZoneId) return _previewZoneId
	const res = await cloudflareV4Api(`/zones?name=${CLOUDFLARE_PREVIEW_ZONE}`)
	if (!res.ok) {
		throw new Error(
			`Failed to look up zone ${CLOUDFLARE_PREVIEW_ZONE}: ${res.status} ${res.statusText}`
		)
	}
	const data = (await res.json()) as { success: boolean; result: { id: string }[] }
	if (!data.success || !data.result.length) {
		// an empty result also happens when the token lacks zone-scoped "Zone: Read"
		throw new Error(`Failed to find zone ${CLOUDFLARE_PREVIEW_ZONE}: ${JSON.stringify(data)}`)
	}
	_previewZoneId = data.result[0].id
	return _previewZoneId
}

// Preview workers are reachable via zone routes ("pr-NNNN-<app>.tldraw.xyz/*").
// Deleting a worker does not delete its routes, so prune them separately.
// Only routes matching this exact preview shape may ever be deleted — anything
// else on the zone (or anything a future refactor feeds in) must not qualify.
const PREVIEW_ROUTE_PATTERN_REGEX = /^pr-\d+-[a-z0-9-]+\.tldraw\.xyz\/\*$/
const _workerRouteIdCache = new Map<string, string>()
async function listPreviewWorkerRoutes() {
	const zoneId = await getPreviewZoneId()
	const res = await cloudflareV4Api(`/zones/${zoneId}/workers/routes`)
	if (!res.ok) {
		throw new Error(`Failed to list worker routes: ${res.status} ${res.statusText}`)
	}
	const data = (await res.json()) as {
		success: boolean
		result: { id: string; pattern: string }[]
	}
	if (!data.success) {
		throw new Error('Failed to list worker routes ' + JSON.stringify(data))
	}
	const previewRoutes = data.result.filter((r) => PREVIEW_ROUTE_PATTERN_REGEX.test(r.pattern))
	for (const r of previewRoutes) {
		_workerRouteIdCache.set(r.pattern, r.id)
	}
	return previewRoutes.map((r) => r.pattern)
}

async function deletePreviewWorkerRoute(pattern: string) {
	if (!PREVIEW_ROUTE_PATTERN_REGEX.test(pattern)) {
		throw new Error(`Refusing to delete non-preview route ${pattern}`)
	}
	const id = _workerRouteIdCache.get(pattern)
	if (!id) {
		nicelog(`Route ${pattern} did not exist, skipping`)
		return
	}
	nicelog('Deleting worker route:', pattern)
	const zoneId = await getPreviewZoneId()
	const res = await cloudflareV4Api(`/zones/${zoneId}/workers/routes/${id}`, { method: 'DELETE' })
	if (res.status === 404) {
		nicelog(`Route ${pattern} did not exist, skipping`)
		return
	}
	if (!res.ok) {
		throw new Error(`Failed to delete worker route ${pattern}: ${res.status} ${res.statusText}`)
	}
	const data = (await res.json()) as { success: boolean }
	if (!data.success) {
		throw new Error(`Failed to delete worker route ${pattern}: ${JSON.stringify(data)}`)
	}
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

// Deleting a worker with a custom domain leaves its edge certificate behind
// (https://github.com/cloudflare/workers-sdk/issues/5139), so prune per-PR
// advanced cert packs on the preview zone separately.
const CERT_PACK_HOST_REGEX = /^pr-\d+-/

// `status=all` also returns packs that are already gone (`deleted` /
// `pending_deletion`); a host can therefore appear on several packs. Skip the
// dead ones and keep every live pack id per host — caching just the last-seen
// id would let a dead pack shadow a live one, which would then never be pruned.
const _certPackCache = new Map<string, string[]>()
const CERT_PACKS_PER_PAGE = 50
const CERT_PACK_GONE_STATUSES = new Set(['deleted', 'pending_deletion'])
async function listPreviewCertPacks() {
	const zoneId = await getPreviewZoneId()
	for (let page = 1; ; page++) {
		const res = await cloudflareV4Api(
			`/zones/${zoneId}/ssl/certificate_packs?status=all&per_page=${CERT_PACKS_PER_PAGE}&page=${page}`
		)
		if (!res.ok) {
			throw new Error(`Failed to list certificate packs: ${res.status} ${res.statusText}`)
		}
		const data = (await res.json()) as {
			success: boolean
			result: { id: string; type: string; status: string; hosts: string[] }[]
		}
		if (!data.success) {
			throw new Error('Failed to list certificate packs ' + JSON.stringify(data))
		}
		for (const pack of data.result) {
			if (pack.type !== 'advanced') continue
			if (CERT_PACK_GONE_STATUSES.has(pack.status)) continue
			const prHost = pack.hosts.find((h) => CERT_PACK_HOST_REGEX.test(h))
			if (!prHost) continue
			const ids = _certPackCache.get(prHost) ?? []
			ids.push(pack.id)
			_certPackCache.set(prHost, ids)
		}
		if (data.result.length < CERT_PACKS_PER_PAGE) break
	}
	return [..._certPackCache.keys()]
}

async function deletePreviewCertPack(host: string) {
	const packIds = _certPackCache.get(host)
	if (!packIds?.length) {
		throw new Error(`Certificate pack for ${host} not found in cache`)
	}
	const zoneId = await getPreviewZoneId()
	for (const packId of packIds) {
		nicelog('Deleting certificate pack:', packId, 'for', host)
		const res = await cloudflareV4Api(`/zones/${zoneId}/ssl/certificate_packs/${packId}`, {
			method: 'DELETE',
		})
		if (!res.ok) {
			throw new Error(
				`Failed to delete certificate pack ${packId}: ${res.status} ${res.statusText}`
			)
		}
		const data = (await res.json()) as { success: boolean }
		if (!data.success) {
			throw new Error(`Failed to delete certificate pack ${packId}: ${JSON.stringify(data)}`)
		}
	}
}

const supabaseHeaders = {
	Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
}

async function deletePreviewDatabase(branchName: string) {
	const branchId = _supabaseBranchCache.get(branchName)
	if (!branchId) {
		nicelog(`Branch ${branchName} not found in cache`)
		return
	}
	const url = `https://api.supabase.com/v1/branches/${branchId}`
	nicelog('DELETE', url)
	const res = await fetch(url, { method: 'DELETE', headers: supabaseHeaders })
	if (!res.ok) {
		throw new Error(
			`Failed to delete Supabase branch ${branchName}: ${res.status} ${res.statusText}`
		)
	}
}

async function deleteFlyioPreviewApp(appName: string) {
	const result = await exec('flyctl', ['apps', 'list', '-o', 'tldraw-gb-ltd'])
	if (result.indexOf(appName) >= 0) {
		await exec('flyctl', ['apps', 'destroy', appName, '-y'])
	}
}

const PREVIEW_DB_REGEX = /^pr-\d+$/
const _supabaseBranchCache = new Map<string, string>()
async function listPreviewDatabases() {
	const url = `https://api.supabase.com/v1/projects/${env.SUPABASE_PREVIEW_PROJECT_ID}/branches`
	const res = await fetch(url, { headers: supabaseHeaders })
	if (!res.ok) {
		throw new Error(`Failed to list Supabase branches: ${res.status} ${res.statusText}`)
	}
	const branches = (await res.json()) as { id: string; name: string }[]
	const preview = branches.filter((b) => PREVIEW_DB_REGEX.test(b.name))
	for (const b of preview) {
		_supabaseBranchCache.set(b.name, b.id)
	}
	return preview.map((b) => b.name)
}
const ZERO_CACHE_APP_REGEX = /^pr-\d+-zero-(cache|rm|vs)$/
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

interface R2BucketRef {
	client: S3Client
	bucket: string
	label: string
}

async function listR2PrPrefixes({ client, bucket }: R2BucketRef): Promise<string[]> {
	const prefixes: string[] = []
	let continuationToken: string | undefined
	do {
		const res = await client.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: 'pr-',
				Delimiter: '/',
				ContinuationToken: continuationToken,
			})
		)
		for (const prefix of res.CommonPrefixes ?? []) {
			if (prefix.Prefix) prefixes.push(prefix.Prefix)
		}
		continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
	} while (continuationToken)
	return prefixes
}

async function deleteR2Prefix({ client, bucket, label }: R2BucketRef, prefix: string) {
	nicelog(`Deleting ${label}:`, prefix)
	while (true) {
		const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))
		const objects = list.Contents
		if (!objects || objects.length === 0) break
		const result = await client.send(
			new DeleteObjectsCommand({
				Bucket: bucket,
				Delete: { Objects: objects.map((o) => ({ Key: o.Key })) },
			})
		)
		if (result.Errors && result.Errors.length > 0) {
			throw new Error(
				`Failed to delete ${result.Errors.length} objects: ${JSON.stringify(result.Errors)}`
			)
		}
	}
}

const zeroBackups: R2BucketRef = {
	client: new S3Client({
		region: 'auto',
		endpoint: env.ZERO_R2_ENDPOINT,
		credentials: {
			accessKeyId: env.ZERO_R2_ACCESS_KEY_ID,
			secretAccessKey: env.ZERO_R2_SECRET_ACCESS_KEY,
		},
	}),
	bucket: env.ZERO_R2_BUCKET_NAME,
	label: 'Zero litestream backup',
}

// Matches the bucket / endpoint used by `coalesceWithPreviousAssets` in deploy-dotcom.ts.
const dotcomAssetsCache: R2BucketRef = {
	client: new S3Client({
		region: 'auto',
		endpoint: 'https://c34edc4e76350954b63adebde86d5eb1.r2.cloudflarestorage.com',
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_ACCESS_KEY_SECRET,
		},
	}),
	bucket: 'dotcom-deploy-assets-cache',
	label: 'dotcom deploy assets cache',
}

const deletionErrors: string[] = []

async function main() {
	nicelog('Pruning preview worker deployments')
	await processItems(listPreviewWorkerDeployments, deletePreviewWorkerDeployment)
	nicelog('\nPruning preview worker routes')
	await processItems(listPreviewWorkerRoutes, deletePreviewWorkerRoute)
	nicelog('\nPruning preview certificate packs')
	await processItems(listPreviewCertPacks, deletePreviewCertPack)
	nicelog('\nPruning Supabase preview databases')
	await processItems(listPreviewDatabases, deletePreviewDatabase)
	nicelog('\nPruning fly.io preview apps')
	await processItems(listFlyioPreviewApps, deleteFlyioPreviewApp)
	for (const r2 of [zeroBackups, dotcomAssetsCache]) {
		nicelog(`\nPruning ${r2.label}`)
		await processItems(
			() => listR2PrPrefixes(r2),
			(prefix) => deleteR2Prefix(r2, prefix)
		)
	}
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
		if (await isPrClosed(number)) {
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
