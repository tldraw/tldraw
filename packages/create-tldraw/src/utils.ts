import { isCancel, outro } from '@clack/prompts'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { basename, resolve } from 'node:path'

export function nicelog(...args: unknown[]) {
	// eslint-disable-next-line no-console
	console.log(...args)
}

export function isDirEmpty(path: string) {
	if (!existsSync(path)) {
		return true
	}

	const files = readdirSync(path)
	return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

export function emptyDir(dir: string) {
	if (!existsSync(dir)) {
		return
	}
	for (const file of readdirSync(dir)) {
		if (file === '.git') {
			continue
		}
		rmSync(resolve(dir, file), { recursive: true, force: true })
	}
}

export function pathToName(path: string) {
	return toValidPackageName(basename(formatTargetDir(resolve(path))))
}
export function formatTargetDir(targetDir: string) {
	return targetDir.trim().replace(/[/\\]+$/g, '')
}

export function isValidPackageName(projectName: string) {
	return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
}

export function toValidPackageName(projectName: string) {
	return projectName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/^[._]/, '')
		.replace(/[^a-z\d\-~]+/g, '-')
}

export function cancel(): never {
	outro('Setup cancelled.\n   No worries, come back anytime!')
	process.exit(1)
}

export async function uncancel<T>(promise: Promise<T | symbol>): Promise<T> {
	const result = await promise
	if (isCancel(result)) {
		cancel()
	}

	return result as T
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn'
export function getPackageManager(): PackageManager {
	const userAgent = process.env.npm_config_user_agent
	if (!userAgent) return 'npm'

	const pkgSpec = userAgent.split(' ')[0]
	const pkgSpecArr = pkgSpec.split('/')
	const manager = pkgSpecArr[0]
	if (manager === 'pnpm') return 'pnpm'
	if (manager === 'yarn') return 'yarn'

	return 'npm'
}

export function getInstallCommand(manager: PackageManager): string {
	switch (manager) {
		case 'pnpm':
			return 'pnpm install'
		case 'yarn':
			return 'yarn'
		case 'npm':
			return 'npm install'
	}
}

export function getRunCommand(manager: PackageManager, command: string): string {
	switch (manager) {
		case 'pnpm':
			return `pnpm run ${command}`
		case 'yarn':
			return `yarn ${command}`
		case 'npm':
			return `npm run ${command}`
	}
}
