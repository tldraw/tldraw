/**
 * Detect the consumer's package manager based on lockfiles in the project root.
 * Falls back to `npm` if no lockfile is found.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export type PackageManager = 'yarn' | 'pnpm' | 'npm' | 'bun'

export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
	if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
	if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
	if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun'
	if (fs.existsSync(path.join(cwd, 'package-lock.json'))) return 'npm'

	const userAgent = process.env.npm_config_user_agent
	if (userAgent?.startsWith('yarn')) return 'yarn'
	if (userAgent?.startsWith('pnpm')) return 'pnpm'
	if (userAgent?.startsWith('bun')) return 'bun'
	return 'npm'
}

export function getInstallCommand(manager: PackageManager): string {
	switch (manager) {
		case 'yarn':
			return 'yarn'
		case 'pnpm':
			return 'pnpm install'
		case 'bun':
			return 'bun install'
		case 'npm':
			return 'npm install'
	}
}

export function getRunCommand(manager: PackageManager, script: string): string {
	switch (manager) {
		case 'yarn':
			return `yarn ${script}`
		case 'pnpm':
			return `pnpm ${script}`
		case 'bun':
			return `bun run ${script}`
		case 'npm':
			return `npm run ${script}`
	}
}
