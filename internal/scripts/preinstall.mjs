import { existsSync } from 'node:fs'

if (!process.env.npm_config_user_agent?.startsWith('pnpm/')) {
	console.error('This repo uses pnpm, not yarn or npm. Run: npm i -g corepack && pnpm install')
	process.exit(1)
}

// pnpm installs over a Yarn-built node_modules without removing Yarn's packages, and those
// leftovers let undeclared imports keep resolving locally. Skipped in CI, where build caches
// from the Yarn era could still restore this file.
// TODO: remove once everyone has moved off Yarn (#10903).
if (!process.env.CI && existsSync('node_modules/.yarn-state.yml')) {
	console.error(
		[
			'Found a node_modules installed by Yarn. This repo now uses pnpm. Remove it, then install:',
			'  find . -name node_modules -type d -prune -exec rm -rf {} + && rm -rf .yarn && pnpm install',
		].join('\n')
	)
	process.exit(1)
}
