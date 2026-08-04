import { execFileSync } from 'child_process'
import { makeEnv } from '../lib/makeEnv'
import { nicelog } from '../lib/nicelog'

// Delete orphaned per-PR advanced cert packs (pr-NNNN-* hostnames) for CLOSED PRs only.
// Usage: CLOUDFLARE_API_TOKEN=xxx yarn tsx internal/scripts/cloudflare/ssl-cleanup.ts <zone_name> [--delete]
// Default is dry-run. Token needs "Zone: Read" + "SSL and Certificates: Edit";
// gh CLI must be authed for tldraw/tldraw.

const env = makeEnv(['CLOUDFLARE_API_TOKEN'])

const [zoneName, mode] = process.argv.slice(2)
if (!zoneName || (mode && mode !== '--delete')) {
	nicelog('usage: ssl-cleanup.ts <zone_name> [--delete]')
	process.exit(1)
}
const doDelete = mode === '--delete'

const API = 'https://api.cloudflare.com/client/v4'

async function cfApi<T>(endpoint: string, options: RequestInit = {}, attempt = 0): Promise<T> {
	const res = await fetch(`${API}${endpoint}`, {
		...options,
		headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
	})
	if (res.status === 429 && attempt < 3) {
		const waitSeconds = Number(res.headers.get('retry-after')) || 10
		nicelog(`rate limited, retrying in ${waitSeconds}s...`)
		await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000))
		return cfApi(endpoint, options, attempt + 1)
	}
	if (!res.ok) {
		throw new Error(`${options.method ?? 'GET'} ${endpoint}: ${res.status} ${res.statusText}`)
	}
	const data = (await res.json()) as { success: boolean; errors: unknown; result: T }
	if (!data.success) {
		throw new Error(`${options.method ?? 'GET'} ${endpoint}: ${JSON.stringify(data.errors)}`)
	}
	return data.result
}

// Only an HTTP 404 (deleted PR) counts as closed; any other gh failure throws
// so a broken token can't authorize deleting open-PR packs. Uses the gh CLI so
// local runs reuse the developer's existing auth.
const prStateCache = new Map<string, string>()
function prState(pr: string): string {
	let state = prStateCache.get(pr)
	if (!state) {
		try {
			state = execFileSync('gh', ['api', `repos/tldraw/tldraw/pulls/${pr}`, '--jq', '.state'], {
				encoding: 'utf-8',
				stdio: ['ignore', 'pipe', 'pipe'],
			}).trim()
		} catch (err: any) {
			if (String(err.stderr).includes('HTTP 404')) {
				state = 'closed'
			} else {
				throw new Error(`gh api failed for PR #${pr}: ${err.stderr ?? err}`)
			}
		}
		prStateCache.set(pr, state)
	}
	return state
}

interface CertPack {
	id: string
	type: string
	status: string
	hosts: string[]
}

function isPreviewPack(p: CertPack) {
	// status=all also returns packs that are already deleted/pending deletion, skip those
	return (
		p.type === 'advanced' &&
		p.status !== 'deleted' &&
		p.status !== 'pending_deletion' &&
		p.hosts.some((h) => /^pr-\d+-/.test(h))
	)
}

async function main() {
	const zones = await cfApi<{ id: string }[]>(`/zones?name=${zoneName}`)
	if (!zones[0]) throw new Error(`zone not found: ${zoneName}`)
	const zoneId = zones[0].id

	let deleted = 0
	let kept = 0
	let failed = 0

	// Process one page at a time instead of fetching everything up front, so an
	// abort partway through (rate limit, network) loses nothing already deleted
	// and a rerun picks up where it left off. Deleting shifts later items into
	// the current page, so after a page with deletions we refetch the same page
	// (skipping packs we've already handled) and only advance once it yields
	// nothing new. The endpoint caps per_page at 50.
	const processed = new Set<string>()
	let page = 1
	while (true) {
		const result = await cfApi<CertPack[]>(
			`/zones/${zoneId}/ssl/certificate_packs?status=all&per_page=50&page=${page}`
		)
		let deletedThisPage = 0
		for (const pack of result.filter(isPreviewPack)) {
			if (processed.has(pack.id)) continue
			processed.add(pack.id)
			const pr = pack.hosts.find((h) => /^pr-\d+-/.test(h))!.match(/^pr-(\d+)-/)![1]
			const hosts = pack.hosts.join(',')
			if (prState(pr) !== 'closed') {
				nicelog(`keeping (PR #${pr} open)  ${hosts}`)
				kept++
				continue
			}
			if (doDelete) {
				try {
					await cfApi(`/zones/${zoneId}/ssl/certificate_packs/${pack.id}`, { method: 'DELETE' })
					nicelog(`deleted (PR #${pr} closed)  ${pack.id}  ${hosts}`)
					deleted++
					deletedThisPage++
				} catch (err) {
					nicelog(`FAILED to delete ${pack.id}  ${hosts}: ${err}`)
					failed++
				}
			} else {
				nicelog(`would delete (PR #${pr} closed)  ${pack.id}  ${hosts}`)
				deleted++
			}
		}
		if (result.length < 50) break
		if (deletedThisPage === 0) page++
	}

	nicelog('---')
	nicelog(
		`${deleted} closed-PR packs ${doDelete ? 'deleted' : 'to delete'}, ${kept} open-PR packs kept, ${failed} failed`
	)
	if (!doDelete) nicelog('(dry run — rerun with --delete to remove)')
	if (failed > 0) process.exit(1)
}

main()
