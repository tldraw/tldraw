/**
 * Reads the consumer's `package.json` to determine which tldraw version is
 * currently installed (or pinned). Returns `null` if no tldraw package is
 * found, so callers can prompt for the version explicitly.
 *
 * This is the local-fs evolution of #8373's `detect-versions.mjs`. The PR
 * version walks git history; here we just look at the working-tree
 * `package.json` since the migrate CLI is meant to run before the upgrade.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export const TLDRAW_PACKAGES = [
	'tldraw',
	'@tldraw/editor',
	'@tldraw/store',
	'@tldraw/tlschema',
	'@tldraw/state',
	'@tldraw/state-react',
	'@tldraw/sync',
	'@tldraw/sync-core',
	'@tldraw/utils',
	'@tldraw/validate',
	'@tldraw/assets',
] as const

export interface DetectedVersion {
	/** Semver version like `'4.5.10'`. */
	version: string
	/** Major-only string like `'4'`. */
	major: string
	/** The package the version was read from, e.g. `'tldraw'`. */
	source: string
	/** Raw range from package.json (e.g. `'^4.5.0'` or `'next'`). */
	rawRange: string
}

export interface DetectOptions {
	/** Directory containing the `package.json` to read. Defaults to cwd. */
	cwd?: string
}

export function detectInstalledVersion(options: DetectOptions = {}): DetectedVersion | null {
	const cwd = options.cwd ?? process.cwd()
	const pkgJsonPath = path.resolve(cwd, 'package.json')

	let pkg: Record<string, unknown>
	try {
		pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as Record<string, unknown>
	} catch {
		return null
	}

	const dependencyMaps = [
		(pkg.dependencies as Record<string, string> | undefined) ?? {},
		(pkg.devDependencies as Record<string, string> | undefined) ?? {},
		(pkg.peerDependencies as Record<string, string> | undefined) ?? {},
	]

	let best: DetectedVersion | null = null
	for (const name of TLDRAW_PACKAGES) {
		for (const deps of dependencyMaps) {
			const range = deps[name]
			if (!range) continue
			const parsed = parseRange(range)
			if (!parsed) continue
			const candidate: DetectedVersion = {
				version: parsed.version,
				major: parsed.major,
				source: name,
				rawRange: range,
			}
			if (!best || isHigher(candidate.version, best.version)) {
				best = candidate
			}
		}
	}
	return best
}

function parseRange(range: string): { version: string; major: string } | null {
	const stripped = range.replace(/[\^~>=<\s]/g, '')
	const match = stripped.match(/^(\d+)\.(\d+)\.(\d+)/)
	if (!match) return null
	return { version: `${match[1]}.${match[2]}.${match[3]}`, major: match[1] }
}

function isHigher(a: string, b: string): boolean {
	const aParts = a.split('.').map((n) => parseInt(n, 10))
	const bParts = b.split('.').map((n) => parseInt(n, 10))
	for (let i = 0; i < 3; i++) {
		if (aParts[i] !== bParts[i]) return aParts[i] > bParts[i]
	}
	return false
}
