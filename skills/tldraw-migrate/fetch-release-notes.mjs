#!/usr/bin/env node
/**
 * Fetches tldraw stable release notes directly from GitHub
 * (apps/docs/content/releases/vX.Y.Z.mdx on `tldraw/tldraw` main) and
 * concatenates them into a single text file filtered by version range.
 * GitHub is the source of truth, so the output reflects whatever is on
 * main — not whatever tldraw.dev has deployed.
 *
 * `next.mdx` is intentionally NOT included here. The skill fetches it
 * separately, conditionally on a pre-release target, into its own file
 * (`references/tldraw-next.mdx`).
 *
 * Usage:
 *   node fetch-release-notes.mjs <from-version> [to-version] > output.txt
 *
 * Honors a `GITHUB_TOKEN` env var to avoid the unauthenticated API rate limit.
 */

const REPO = process.env.TLDRAW_RELEASES_REPO || 'tldraw/tldraw'
const RELEASES_PATH = 'apps/docs/content/releases'
const BRANCH = process.env.TLDRAW_RELEASES_BRANCH || 'main'

const [, , fromArg, toArg] = process.argv

if (!fromArg) {
	process.stderr.write(
		'Usage: node fetch-release-notes.mjs <from-version> [to-version]\n' +
			'  e.g.: node fetch-release-notes.mjs 4.0.0 > releases.txt\n'
	)
	process.exit(1)
}

function parseVersion(str) {
	const m = String(str)
		.trim()
		.replace(/^v/, '')
		.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/)
	if (!m) return null
	return { main: [+m[1], +m[2], +m[3]], pre: m[4] || null }
}

function comparePrerelease(a, b) {
	if (!a && !b) return 0
	if (!a) return 1
	if (!b) return -1
	const aParts = a.split('.')
	const bParts = b.split('.')
	for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
		const ap = aParts[i]
		const bp = bParts[i]
		if (ap === undefined) return -1
		if (bp === undefined) return 1
		const aNum = /^\d+$/.test(ap)
		const bNum = /^\d+$/.test(bp)
		if (aNum && bNum) {
			const d = +ap - +bp
			if (d !== 0) return d
		} else if (aNum !== bNum) {
			return aNum ? -1 : 1
		} else if (ap !== bp) {
			return ap < bp ? -1 : 1
		}
	}
	return 0
}

function compareVersions(a, b) {
	for (let i = 0; i < 3; i++) {
		if (a.main[i] !== b.main[i]) return a.main[i] - b.main[i]
	}
	return comparePrerelease(a.pre, b.pre)
}

const fromVer = parseVersion(fromArg)
if (!fromVer) {
	process.stderr.write(`Invalid from-version: ${fromArg}\n`)
	process.exit(1)
}

const toVer = toArg ? parseVersion(toArg) : null
if (toArg && !toVer) {
	process.stderr.write(`Invalid to-version: ${toArg}\n`)
	process.exit(1)
}

const headers = {
	'User-Agent': 'tldraw-migrate-skill',
	Accept: 'application/vnd.github.v3+json',
}
if (process.env.GITHUB_TOKEN) {
	headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

const apiUrl = `https://api.github.com/repos/${REPO}/contents/${RELEASES_PATH}?ref=${BRANCH}`
const listing = await fetch(apiUrl, { headers })
	.then(async (r) => {
		if (!r.ok) {
			const body = await r.text().catch(() => '')
			throw new Error(`HTTP ${r.status} ${r.statusText}: ${body.slice(0, 200)}`)
		}
		return r.json()
	})
	.catch((err) => {
		process.stderr.write(`Failed to list ${REPO}/${RELEASES_PATH}: ${err.message}\n`)
		process.exit(1)
	})

if (!Array.isArray(listing)) {
	process.stderr.write(`Unexpected GitHub API response: ${JSON.stringify(listing).slice(0, 200)}\n`)
	process.exit(1)
}

const files = listing
	.filter((f) => f.type === 'file' && f.name.endsWith('.mdx') && f.name !== 'next.mdx')
	.map((f) => ({
		name: f.name,
		url: f.download_url,
		version: parseVersion(f.name.replace(/\.mdx$/, '')),
	}))
	.filter((f) => f.version !== null)

const relevant = files
	.filter((f) => {
		const afterFrom = compareVersions(f.version, fromVer) > 0
		const beforeTo = toVer ? compareVersions(f.version, toVer) <= 0 : true
		return afterFrom && beforeTo
	})
	.sort((a, b) => compareVersions(a.version, b.version))

if (relevant.length === 0) {
	process.stderr.write(`No release notes found between ${fromArg} and ${toArg || 'latest'}\n`)
	process.exit(0)
}

const sections = ['# tldraw SDK releases', '', '--------', '']
const failed = []

for (const file of relevant) {
	const text = await fetch(file.url, { headers: { 'User-Agent': 'tldraw-migrate-skill' } })
		.then(async (r) => {
			if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`)
			return r.text()
		})
		.catch((err) => {
			process.stderr.write(`Warning: failed to fetch ${file.name}: ${err.message}\n`)
			failed.push(file.name)
			return null
		})
	if (text === null) continue

	const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, '').trim()
	sections.push(`# ${file.name.replace(/\.mdx$/, '')}`, '', body, '', '--------', '')
}

process.stdout.write(sections.join('\n'))

if (failed.length > 0) {
	process.stderr.write(
		`\nERROR: ${failed.length} of ${relevant.length} release files failed to fetch (${failed.join(', ')}). ` +
			`Output is incomplete — re-run, or set GITHUB_TOKEN to avoid the unauthenticated rate limit.\n`
	)
	process.exit(2)
}
