import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

function isOnPath(bin) {
	const exts = process.platform === 'win32' ? ['.cmd', '.exe', ''] : ['']
	return (process.env.PATH ?? '')
		.split(delimiter)
		.some((dir) => exts.some((ext) => existsSync(join(dir, bin + ext))))
}

const steps = []

// pnpm installs over a Yarn-built node_modules without removing Yarn's packages, and those
// leftovers let undeclared imports keep resolving locally. Skipped in CI, where build caches
// from the Yarn era could still restore these files.
// TODO: remove the Yarn checks once everyone has moved off Yarn (#10903).
const hasYarnInstall =
	existsSync('node_modules/.yarn-state.yml') ||
	existsSync('.yarn/install-state.gz') ||
	existsSync('yarn.lock')
if (!process.env.CI && hasYarnInstall) {
	steps.push('find . -name node_modules -type d -prune -exec rm -rf {} + && rm -rf .yarn yarn.lock')
}

const isPnpm = process.env.npm_config_user_agent?.startsWith('pnpm/')
if (!isPnpm && !isOnPath('pnpm')) {
	steps.push(isOnPath('corepack') ? 'corepack enable' : 'npm i -g corepack')
}

if (!isPnpm || steps.length > 0) {
	console.error(
		['This repo uses pnpm. Run:', ...steps.map((s) => '  ' + s), '  pnpm install'].join('\n')
	)
	process.exit(1)
}
