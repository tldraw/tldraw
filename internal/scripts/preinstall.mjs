import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

function isOnPath(bin) {
	const exts = process.platform === 'win32' ? ['.cmd', '.exe', ''] : ['']
	return (process.env.PATH ?? '')
		.split(delimiter)
		.some((dir) => exts.some((ext) => existsSync(join(dir, bin + ext))))
}

if (!process.env.npm_config_user_agent?.startsWith('pnpm/')) {
	const steps = []
	if (!isOnPath('pnpm')) steps.push(isOnPath('corepack') ? 'corepack enable' : 'npm i -g corepack')
	console.error(
		['This repo uses pnpm. Run:', ...steps.map((s) => '  ' + s), '  pnpm install'].join('\n')
	)
	process.exit(1)
}
