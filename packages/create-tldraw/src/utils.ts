import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { parse as parseArgs } from '@bomb.sh/args'
import { isCancel, outro } from '@clack/prompts'

export interface CliArgs {
	help: boolean
	template?: string
	telemetry: boolean
	targetDir?: string
}

export function parseCliArgs(argv: string[]): CliArgs {
	const args = parseArgs(argv, {
		alias: {
			h: 'help',
			t: 'template',
		},
		// The parser reports `--no-telemetry` as `telemetry: false`, never as a `no-telemetry` key.
		// It still has to be listed as a boolean: otherwise `--no-telemetry my-app` treats the
		// directory as the flag's value and swallows it.
		boolean: ['help', 'telemetry', 'no-telemetry'],
		string: ['template'],
		default: { telemetry: true },
	})

	return {
		help: !!args.help,
		template: args.template ? String(args.template) : undefined,
		telemetry: args.telemetry !== false,
		// Bare arguments are coerced, so a directory like `2026` arrives as a number.
		targetDir: args._[0] === undefined ? undefined : String(args._[0]),
	}
}

export function nicelog(...args: unknown[]) {
	// eslint-disable-next-line no-console
	console.log(...args)
}

export function isDirEmpty(path: string) {
	if (!existsSync(path)) {
		return true
	}

	// Existing files block the target path, so only directories should be inspected with readdirSync.
	if (!statSync(path).isDirectory()) {
		return false
	}

	const files = readdirSync(path)
	return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

// Keeps .git so scaffolding into a freshly initialised repo doesn't destroy its history.
export function emptyDir(path: string) {
	for (const file of readdirSync(path)) {
		if (file === '.git') continue
		rmSync(join(path, file), { recursive: true, force: true })
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

function toValidPackageName(projectName: string) {
	return projectName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/^[._]/, '')
		.replace(/[^a-z\d\-~]+/g, '-')
}

export function cancel(): never {
	outro('Setup cancelled.\n   Try again or visit https://tldraw.dev/docs to learn more.')
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

	const manager = userAgent.split(' ')[0].split('/')[0]
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
