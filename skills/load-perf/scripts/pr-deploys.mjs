#!/usr/bin/env node
// When each PR reached staging (main) and production.
// usage: pr-deploys.mjs <pr> [pr ...]
//
// staging: when the PR reached main; staging serves it ~15 min later.
// production: the first deploy merge on origin/production descending from the PR's main commit or
// its hotfix commit (same title, or a hotfix PR whose "Original PRs" list names it).
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const run = (cmd, args) =>
	execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] })
const gh = (args) => JSON.parse(run('gh', args))

function fetchPrs(numbers) {
	const fields = 'number title mergedAt baseRefName mergeCommit { oid }'
	const out = new Map()
	for (let i = 0; i < numbers.length; i += 50) {
		const chunk = numbers.slice(i, i + 50)
		const query = `{ repository(owner: "tldraw", name: "tldraw") { ${chunk
			.map((n) => `p${n}: pullRequest(number: ${n}) { ${fields} }`)
			.join(' ')} } }`
		let data
		try {
			data = gh(['api', 'graphql', '-f', `query=${query}`]).data.repository
		} catch (e) {
			// A missing PR fails the whole query; fall back to one at a time.
			data = {}
			for (const n of chunk) {
				try {
					data[`p${n}`] = gh(['api', 'graphql', '-f', `query={ repository(owner: "tldraw", name: "tldraw") { pullRequest(number: ${n}) { ${fields} } } }`]).data.repository.pullRequest
				} catch {
					data[`p${n}`] = null
				}
			}
		}
		for (const n of chunk) out.set(n, data[`p${n}`])
	}
	return out
}

// Hotfix PRs list what they carry as "- [#123](" or "**Original PR:** [#123](".
function fetchHotfixes() {
	const byPr = new Map()
	for (const h of gh(['pr', 'list', '--base', 'hotfixes', '--state', 'merged', '--limit', '400', '--json', 'number,body'])) {
		const carried = [...h.body.matchAll(/(?:^|\n)- \[#(\d+)\]\(|Original PRs?:\*\* \[#(\d+)\]\(/g)].map((m) => m[1] ?? m[2])
		for (const pr of carried) if (!byPr.has(pr)) byPr.set(pr, { hotfix: String(h.number), carried })
	}
	return byPr
}

export function prDeploys(prNumbers) {
	const root = run('git', ['rev-parse', '--show-toplevel']).trim()
	const git = (args) => run('git', ['-C', root, ...args])
	git(['fetch', '-q', 'origin', 'production', 'main'])
	const prodCommits = git(['log', 'origin/production', '--since=120.days', '--format=%H|%s'])
		.trim()
		.split('\n')
		.map((l) => {
			const i = l.indexOf('|')
			return { sha: l.slice(0, i), subject: l.slice(i + 1) }
		})
	const firstDeployContaining = (sha) => {
		// Not --first-parent: deploys reach main commits through their second parent.
		const lines = git(['log', '--ancestry-path', '--reverse', '--format=%cI|%s', `${sha}..origin/production`])
		const deploy = lines.split('\n').find((l) => l.includes('|Deploy from'))
		return deploy ? Date.parse(deploy.slice(0, deploy.indexOf('|'))) : null
	}

	const numbers = prNumbers.map((p) => String(p).replace(/^#/, ''))
	const prs = fetchPrs(numbers)
	const hotfixes = fetchHotfixes()
	return numbers.map((n) => {
		let pr = prs.get(n)
		if (!pr) return { pr: `#${n}`, missing: true }
		const title = pr.title
		// Stacked PR: it reaches main with the PR that merges its base branch.
		while (pr?.mergedAt && pr.baseRefName !== 'main' && pr.baseRefName !== 'hotfixes') {
			pr = gh(['pr', 'list', '--head', pr.baseRefName, '--state', 'merged', '--json', 'mergedAt,mergeCommit,baseRefName'])[0]
		}
		const hf = hotfixes.get(n)
		const candidates = [pr?.mergeCommit?.oid].concat(
			prodCommits
				.filter(({ subject }) => subject.includes(title) || subject.includes(`(#${n})`) || (hf && subject.includes(`(#${hf.hotfix})`)))
				.map((c) => c.sha)
		)
		const prodTimes = candidates.filter(Boolean).map((sha) => {
			try {
				return firstDeployContaining(sha)
			} catch {
				return null
			}
		})
		const prod = prodTimes.filter((t) => t !== null).sort((a, b) => a - b)[0] ?? null
		const bundledWith = prod !== null && hf ? hf.carried.filter((c) => c !== n).map((c) => `#${c}`) : []
		return {
			pr: `#${n}`,
			title,
			staging: pr?.mergedAt ? Date.parse(pr.mergedAt) : null,
			prod,
			hotfix: prod !== null && hf ? `#${hf.hotfix}` : null,
			bundledWith,
		}
	})
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const fmt = (ms) => (ms === null ? 'not deployed' : new Date(ms).toISOString().slice(0, 16))
	for (const d of prDeploys(process.argv.slice(2))) {
		if (d.missing) {
			console.log(`${d.pr}\tnot found`)
			continue
		}
		const via = d.hotfix ? `\tvia hotfix ${d.hotfix}${d.bundledWith.length ? ` with ${d.bundledWith.join(', ')}` : ''}` : ''
		console.log(`${d.pr}\tstaging ${fmt(d.staging)}\tprod ${fmt(d.prod)}\t${d.title}${via}`)
	}
}
