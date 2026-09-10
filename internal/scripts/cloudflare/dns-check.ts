import { execFileSync } from 'child_process'
import { makeEnv } from '../lib/makeEnv'
import { nicelog } from '../lib/nicelog'

// Check DNS records in a zone: what's there already, and which pr-NNNN-* records are orphaned.
// Read-only. Usage: CLOUDFLARE_API_TOKEN=xxx yarn tsx internal/scripts/cloudflare/dns-check.ts <zone_name>
// Token needs "Zone: Read" + "DNS: Read"; gh CLI must be authed for tldraw/tldraw.

const env = makeEnv(['CLOUDFLARE_API_TOKEN'])

const [zoneName] = process.argv.slice(2)
if (!zoneName) {
	nicelog('usage: dns-check.ts <zone_name>')
	process.exit(1)
}

const API = 'https://api.cloudflare.com/client/v4'

async function cfApi<T>(endpoint: string): Promise<T> {
	const res = await fetch(`${API}${endpoint}`, {
		headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
	})
	if (!res.ok) throw new Error(`GET ${endpoint}: ${res.status} ${res.statusText}`)
	const data = (await res.json()) as { success: boolean; errors: unknown; result: T }
	if (!data.success) throw new Error(`GET ${endpoint}: ${JSON.stringify(data.errors)}`)
	return data.result
}

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

interface DnsRecord {
	type: string
	name: string
	content: string
	proxied: boolean
}

async function main() {
	const zones = await cfApi<{ id: string }[]>(`/zones?name=${zoneName}`)
	if (!zones[0]) throw new Error(`zone not found: ${zoneName}`)
	const zoneId = zones[0].id

	const records: DnsRecord[] = []
	for (let page = 1; ; page++) {
		const result = await cfApi<DnsRecord[]>(
			`/zones/${zoneId}/dns_records?per_page=100&page=${page}`
		)
		records.push(...result)
		if (result.length < 100) break
	}

	const fmt = (r: DnsRecord) =>
		`${r.type.padEnd(6)} ${r.name.padEnd(36)} ${String(r.content).slice(0, 50).padEnd(52)} proxied=${r.proxied}`

	const isPreview = (r: DnsRecord) => /^pr-\d+-/.test(r.name)

	nicelog('=== non-PR records (existing infra) ===')
	for (const r of records
		.filter((r) => !isPreview(r))
		.sort((a, b) => a.name.localeCompare(b.name))) {
		nicelog(fmt(r))
	}

	nicelog('\n=== PR preview records ===')
	let ok = 0
	let orphaned = 0
	for (const r of records.filter(isPreview)) {
		const pr = r.name.match(/^pr-(\d+)-/)![1]
		if (prState(pr) === 'closed') {
			nicelog(`ORPHAN (PR #${pr} closed)  ${fmt(r)}`)
			orphaned++
		} else {
			nicelog(`ok (PR #${pr} open)  ${fmt(r)}`)
			ok++
		}
	}

	nicelog('\n=== summary ===')
	nicelog(`total records: ${records.length}`)
	nicelog(`pr records: ok=${ok} orphaned=${orphaned}`)
	const hasWildcard = records.some((r) => r.name === `*.${zoneName}`)
	nicelog(`wildcard *.${zoneName}: ${hasWildcard ? 'EXISTS' : 'not present'}`)
}

main()
