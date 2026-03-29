#!/usr/bin/env node
/**
 * Detects the previous tldraw version from git history and outputs it.
 * Looks at the last committed package.json on the main/master branch
 * or the previous commit to find what version tldraw was before the upgrade.
 *
 * Falls back to checking git log for the most recent package.json change.
 * Outputs just the version string to stdout (e.g., "4.0.0").
 */

import { execSync } from 'child_process'
import { readFileSync } from 'fs'

function exec(cmd) {
	try {
		return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
	} catch {
		return null
	}
}

function extractTldrawVersion(packageJsonStr) {
	try {
		const pkg = JSON.parse(packageJsonStr)
		const raw =
			pkg.dependencies?.tldraw ||
			pkg.devDependencies?.tldraw ||
			pkg.dependencies?.['@tldraw/editor'] ||
			pkg.devDependencies?.['@tldraw/editor']
		if (!raw) return null
		// Strip semver range characters
		const ver = raw.replace(/[\^~>=<\s]/g, '')
		// Extract just the semver part (handle prerelease tags like 4.6.0-next.abc)
		const match = ver.match(/(\d+\.\d+\.\d+)/)
		return match ? match[1] : null
	} catch {
		return null
	}
}

// Strategy 1: Check main/master branch
for (const branch of ['main', 'master']) {
	const content = exec(`git show ${branch}:package.json`)
	if (content) {
		const ver = extractTldrawVersion(content)
		if (ver) {
			process.stdout.write(ver)
			process.exit(0)
		}
	}
}

// Strategy 2: Check the parent commit
const content = exec('git show HEAD~1:package.json')
if (content) {
	const ver = extractTldrawVersion(content)
	if (ver) {
		process.stdout.write(ver)
		process.exit(0)
	}
}

// Strategy 3: Check current package.json (user hasn't committed yet, so this IS the old version)
try {
	const current = readFileSync('package.json', 'utf8')
	const ver = extractTldrawVersion(current)
	if (ver) {
		process.stdout.write(ver)
		process.exit(0)
	}
} catch {
	// ignore
}

console.error(
	'Could not detect previous tldraw version. Pass it as an argument: /tldraw-migrate 4.0.0'
)
process.exit(1)
