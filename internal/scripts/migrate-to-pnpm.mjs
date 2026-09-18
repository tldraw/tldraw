// One-shot codemod for the Yarn → pnpm cutover. Rerunnable: apply it to a fresh checkout of
// main (or to a branch after rebasing) and it rewrites every yarn invocation into its pnpm
// equivalent. It deliberately doesn't touch user-facing text: `templates/`, `apps/docs/content`,
// and `packages/create-tldraw/src` tell SDK users how to run their own projects. Template
// `package.json` scripts are exported to users too, so only the monorepo-only `yarn run -T`
// scripts (stripped on export) are rewritten there.
//
//   node internal/scripts/migrate-to-pnpm.mjs
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const SKIP = [
	/^yarn\.lock$/,
	/^templates\/(?![^/]+\/package\.json$)/,
	/^apps\/docs\/content\//,
	/^packages\/create-tldraw\/(src|README)/,
	/^skills\/tldraw-migrate\//,
	/^internal\/scripts\/migrate-to-pnpm\.mjs$/,
	/\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|pdf|zip|tldr|tldraw|snap|patch)$/,
]

// A bare `yarn <word>` runs a script if one exists and falls back to a binary. pnpm has the
// same fallback, but `pnpm exec` makes the binary case explicit, so decide up front.
const scriptNames = new Set()
for (const file of execSync("git ls-files '*package.json'", { encoding: 'utf8' })
	.trim()
	.split('\n')) {
	if (file.includes('node_modules')) continue
	const json = JSON.parse(readFileSync(file, 'utf8'))
	for (const name of Object.keys(json.scripts ?? {})) scriptNames.add(name)
}
const PNPM_COMMANDS = new Set([
	'install',
	'add',
	'remove',
	'pack',
	'publish',
	'dedupe',
	'dlx',
	'exec',
	'run',
	'why',
	'outdated',
	'patch',
	'patch-commit',
	'ls',
	'list',
	'store',
])

// Workspace scripts that share a name with a pnpm built-in (`deploy`, `publish`) need `run`.
const SHADOWED_SCRIPTS = new Set(['deploy', 'publish'])

function runOrExec(word) {
	if (scriptNames.has(word) && SHADOWED_SCRIPTS.has(word)) return `pnpm run ${word}`
	return scriptNames.has(word) || PNPM_COMMANDS.has(word) ? `pnpm ${word}` : `pnpm exec ${word}`
}

const RULES = [
	// files
	[/\byarn\.lock\b/g, 'pnpm-lock.yaml'],
	[/\.yarnrc\.yml/g, 'pnpm-workspace.yaml'],
	[/\.yarn\/patches/g, 'patches'],
	// yarn-only forms
	[/\byarn run -T /g, 'pnpm exec '],
	// `yarn run <bin>` falls back to binaries; `pnpm run` doesn't.
	[/\byarn run ([a-z][\w-]*(?::[\w-]+)*)/g, (_, word) => runOrExec(word)],
	[/\byarn npm publish\b/g, 'pnpm publish'],
	[/\byarn install --immutable\b/g, 'pnpm install --frozen-lockfile'],
	// `focus` includes the focused workspaces' workspace dependencies; `name...` does the same.
	[
		/\byarn workspaces focus ((?:[^\s"'&|]+ ?)+)/g,
		(_, names) =>
			`pnpm install ${names
				.trim()
				.split(/\s+/)
				.map((n) => `--filter ${n}...`)
				.join(' ')}`,
	],
	[/\byarn workspace (\S+) /g, 'pnpm --filter $1 '],
	// exec('yarn', [...]) call sites in internal/scripts
	[/exec\('yarn', \['run', '-T', /g, "exec('pnpm', ['exec', "],
	[/exec\('yarn', \['install'\]\)/g, "exec('pnpm', ['install'])"],
	[
		/exec\('yarn', \['([^']+)'/g,
		(_, word) => `exec('pnpm', ['${runOrExec(word).slice(5).replace(' ', "', '")}'`,
	],
	[/execSync\('yarn'\)/g, "execSync('pnpm install')"],
	// generic `yarn <word>`, and bare `yarn` meaning install
	[/\byarn ([a-z][\w-]*(?::[\w-]+)*)/g, (_, word) => runOrExec(word)],
	// bare `yarn` as a whole command installs; elsewhere it names the tool
	[/(^\s*|&& )yarn\s*$/gm, '$1pnpm install'],
	[/run 'yarn' to get/g, "run 'pnpm install' to get"],
	[/\byarn\b(?![-.])/g, 'pnpm'],
]

const files = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n')
let changed = 0
for (const file of files) {
	if (SKIP.some((re) => re.test(file))) continue
	let text
	try {
		text = readFileSync(file, 'utf8')
	} catch {
		continue
	}
	if (!/yarn/i.test(text)) continue
	let out = text
	const rules = file.startsWith('templates/')
		? RULES.filter(([re]) => re.source.includes('run -T'))
		: RULES
	for (const [re, replacement] of rules) out = out.replace(re, replacement)
	if (out !== text) {
		writeFileSync(file, out)
		changed++
	}
}
console.log(`rewrote ${changed} files`)
