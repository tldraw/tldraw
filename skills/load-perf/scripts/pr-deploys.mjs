#!/usr/bin/env node
// When each PR reached staging (main) and production.
// usage: pr-deploys.mjs <pr> [pr ...]
//
// staging: when the PR reached main; staging serves it ~15 min later.
// production: the first deploy merge on origin/production descending from the PR's main commit or
// its hotfix commit (same title, or a hotfix PR whose "Original PRs" list names it).
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
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

// Hotfix PR bodies name what they carry as "- [#123](", "**Original PR:** [#123](", or, when
// written by hand, a "**#123 — ...**" heading. Other #123 mentions can be context ("left out").
const CARRIED = /(?:^|\n)- \[#(\d+)\]\(|Original PRs?:\*\* \[#(\d+)\]\(|(?:^|\n)\*\*#(\d+)\b/g

function fetchHotfixes() {
	const byPr = new Map()
	for (const h of gh(['pr', 'list', '--base', 'hotfixes', '--state', 'merged', '--limit', '400', '--json', 'number,body'])) {
		const carried = [...new Set([...h.body.matchAll(CARRIED)].map((m) => m[1] ?? m[2] ?? m[3]))]
		for (const pr of carried) byPr.set(pr, [...(byPr.get(pr) ?? []), { hotfix: String(h.number), carried }])
	}
	return byPr
}

const root = () => run('git', ['rev-parse', '--show-toplevel']).trim()
const git = (args) => run('git', ['-C', root(), ...args])

/** Subjects of the PRs a production deploy merge shipped. */
export function deployContents(sha) {
	return git(['log', '--format=%s', `${sha}^1..${sha}^2`])
		.split('\n')
		.filter((l) => l && !l.includes('Add VSCode extension'))
}

/** How many PRs landed on main between two times. */
export function mainMergesBetween(from, to) {
	const iso = (ms) => new Date(ms).toISOString()
	return git(['log', 'origin/main', '--first-parent', `--since=${iso(from)}`, `--until=${iso(to)}`, '--format=%H']).split('\n').filter(Boolean).length
}

/** Production deploy merges, oldest first. */
export function prodDeploys() {
	return git(['log', 'origin/production', '--first-parent', '--reverse', '--since=120.days', '--format=%H|%cI|%s'])
		.split('\n')
		.filter((l) => l.includes('|Deploy from'))
		.map((l) => {
			const [sha, at] = l.split('|')
			return { sha, at: Date.parse(at) }
		})
}

export function prDeploys(prNumbers) {
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
		const lines = git(['log', '--ancestry-path', '--reverse', '--format=%H|%cI|%s', `${sha}..origin/production`])
		const deploy = lines.split('\n').find((l) => l.includes('|Deploy from'))
		if (!deploy) return null
		const [dsha, at] = deploy.split('|')
		return { sha: dsha, at: Date.parse(at) }
	}
	// "[HOTFIX] title (#123)" and "title (#123) (#456)" both reduce to the PR title.
	const bareSubject = (s) => s.replace(/^\[HOTFIX\] /, '').replace(/( \(#\d+\))+$/, '')

	const numbers = prNumbers.map((p) => String(p).replace(/^#/, ''))
	const prs = fetchPrs(numbers)
	const hotfixes = fetchHotfixes()
	return numbers.map((n) => {
		const own = prs.get(n)
		if (!own) return { pr: `#${n}`, missing: true }
		// Stacked PR: it reaches main with the PR that merges its base branch, and a hotfix may
		// name that PR instead of this one.
		const chain = [{ number: n, title: own.title }]
		let pr = own
		let unresolvedBase = null
		while (pr?.mergedAt && pr.baseRefName !== 'main' && pr.baseRefName !== 'hotfixes') {
			const parent = gh(['pr', 'list', '--head', pr.baseRefName, '--state', 'merged', '--json', 'number,title,mergedAt,mergeCommit,baseRefName'])[0]
			if (!parent) unresolvedBase = pr.baseRefName
			else chain.push({ number: String(parent.number), title: parent.title })
			pr = parent
		}
		const hfs = chain.flatMap((c) => hotfixes.get(c.number) ?? [])
		const candidates = [{ sha: pr?.mergeCommit?.oid, hotfix: null }]
		for (const { sha, subject } of prodCommits) {
			const bare = bareSubject(subject)
			const hf = hfs.find((h) => subject.includes(`(#${h.hotfix})`))
			if (hf) candidates.push({ sha, hotfix: hf })
			else if (chain.some((c) => bare === c.title || subject.includes(`(#${c.number})`))) candidates.push({ sha, hotfix: null })
		}
		const mergedAt = own.mergedAt ? Date.parse(own.mergedAt) : null
		const deploys = candidates
			.filter((c) => c.sha)
			.map((c) => ({ ...c, deploy: firstDeployContaining(c.sha) }))
			// A deploy before the PR merged is a different commit with the same title.
			.filter((c) => c.deploy && (mergedAt === null || c.deploy.at >= mergedAt))
			.sort((a, b) => a.deploy.at - b.deploy.at)
		const first = deploys[0]
		return {
			pr: `#${n}`,
			title: own.title,
			staging: pr?.mergedAt ? Date.parse(pr.mergedAt) : null,
			prod: first?.deploy.at ?? null,
			prodSha: first?.deploy.sha ?? null,
			hotfix: first?.hotfix ? `#${first.hotfix.hotfix}` : null,
			bundledWith: first?.hotfix ? first.hotfix.carried.filter((c) => !chain.some((x) => x.number === c)).map((c) => `#${c}`) : [],
			unresolvedBase,
		}
	})
}

if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const fmt = (ms) => (ms === null ? 'not deployed' : new Date(ms).toISOString().slice(0, 16))
	for (const d of prDeploys(process.argv.slice(2))) {
		if (d.missing) {
			console.log(`${d.pr}\tnot found`)
			continue
		}
		const via = d.hotfix ? `\tvia hotfix ${d.hotfix}${d.bundledWith.length ? ` with ${d.bundledWith.join(', ')}` : ''}` : ''
		const stack = d.unresolvedBase ? `\tstacked on ${d.unresolvedBase}, which never merged` : ''
		console.log(`${d.pr}\tstaging ${fmt(d.staging)}\tprod ${fmt(d.prod)}\t${d.title}${via}${stack}`)
	}
}
