// Cutover check: every name@version resolved in yarn.lock is resolved in pnpm-lock.yaml and vice
// versa, so the package manager swap changes no installed dependency versions.
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

// Yarn injects its own node-gyp into every package with a native build script; pnpm doesn't.
const YARN_IMPLICIT = new Set([
	'node-gyp@10.0.1',
	'@npmcli/agent@2.2.0',
	'@npmcli/fs@3.1.0',
	'abbrev@2.0.0',
	'cacache@18.0.2',
	'exponential-backoff@3.1.1',
	'fs-minipass@3.0.3',
	'make-fetch-happen@13.0.0',
	'minipass-collect@2.0.1',
	'minipass-fetch@3.0.4',
	'nopt@7.2.0',
	'proc-log@3.0.0',
	'ssri@10.0.5',
	'unique-filename@3.0.0',
	'unique-slug@4.0.0',
])

// After cutover yarn.lock is gone from the tree, so fall back to the last one on main.
const yarn = existsSync('yarn.lock')
	? readFileSync('yarn.lock', 'utf8')
	: execSync('git show origin/main:yarn.lock', { encoding: 'utf8', maxBuffer: 1 << 28 })
const pnpm = readFileSync('pnpm-lock.yaml', 'utf8')
const fromYarn = new Set()
// `alias@npm:real@range` entries are recorded under the real package name, as pnpm does.
for (const m of yarn.matchAll(
	/^"?((?:@[^@\/"]+\/)?[^@"\/\s]+)@(?:npm|patch):(?:((?:@[^@\/"]+\/)?[^@"\/\s]+)@)?[^\n]*\n\s+version: (\S+)/gm
)) {
	const key = `${m[2] ?? m[1]}@${m[3]}`
	if (!YARN_IMPLICIT.has(key)) fromYarn.add(key)
}
const fromPnpm = new Set()
// pnpm 12 prepends a small document pinning pnpm itself; the real graph is the last one.
const section = pnpm.slice(pnpm.lastIndexOf('\npackages:'), pnpm.lastIndexOf('\nsnapshots:'))
for (const m of section.matchAll(/^  '?((?:@[^@\/]+\/)?[^@\s']+)@([^\s:(']+)/gm)) {
	const key = `${m[1]}@${m[2]}`
	fromPnpm.add(key)
}
const onlyYarn = [...fromYarn].filter((x) => !fromPnpm.has(x)).sort()
const onlyPnpm = [...fromPnpm].filter((x) => !fromYarn.has(x)).sort()
console.log(`yarn.lock: ${fromYarn.size}  pnpm-lock.yaml: ${fromPnpm.size}`)
if (onlyYarn.length) console.log('only in yarn.lock:\n  ' + onlyYarn.join('\n  '))
if (onlyPnpm.length) console.log('only in pnpm-lock.yaml:\n  ' + onlyPnpm.join('\n  '))
process.exit(onlyYarn.length || onlyPnpm.length ? 1 : 0)
