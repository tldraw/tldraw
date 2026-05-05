#!/usr/bin/env node
/**
 * Detects the previous tldraw version and writes it to stdout.
 *
 * Resolution order:
 *   1. An explicit version passed as argv[2] (e.g., "/tldraw-migrate 4.0.0").
 *   2. The version of any tldraw package on the main/master branch — but only
 *      if it differs from the working tree (otherwise the user is migrating
 *      directly on main and main already reflects the new version).
 *   3. The version in HEAD~1.
 *   4. The version in the current working tree (last resort: assumes the user
 *      hasn't bumped yet, so the working tree IS the previous version).
 *
 * Outputs just the version string (no trailing newline) so the SKILL.md can
 * interpolate it into other commands.
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

const TLDRAW_PACKAGES = [
	'tldraw',
	'@tldraw/editor',
	'@tldraw/tldraw',
	'@tldraw/store',
	'@tldraw/tlschema',
	'@tldraw/state',
	'@tldraw/state-react',
	'@tldraw/sync',
	'@tldraw/sync-core',
	'@tldraw/utils',
	'@tldraw/validate',
]

function extractTldrawVersion(packageJsonStr) {
	try {
		const pkg = JSON.parse(packageJsonStr)
		const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
		for (const name of TLDRAW_PACKAGES) {
			const raw = deps[name]
			if (!raw) continue
			const cleaned = String(raw).replace(/[\^~>=<\s]/g, '')
			const match = cleaned.match(/(\d+\.\d+\.\d+)/)
			if (match) return match[1]
		}
		return null
	} catch {
		return null
	}
}

function readWorkingTreeVersion() {
	try {
		return extractTldrawVersion(readFileSync('package.json', 'utf8'))
	} catch {
		return null
	}
}

function emit(version) {
	process.stdout.write(version)
	process.exit(0)
}

const explicit = process.argv[2]?.trim()
if (explicit) {
	const cleaned = explicit.replace(/^v/, '')
	const match = cleaned.match(/^(\d+\.\d+\.\d+)/)
	if (match) emit(match[1])
}

const workingTreeVersion = readWorkingTreeVersion()

for (const branch of ['main', 'master']) {
	const content = exec(`git show ${branch}:package.json`)
	if (!content) continue
	const ver = extractTldrawVersion(content)
	if (!ver) continue
	// If the branch version matches the working tree, the user likely bumped
	// directly on this branch — main isn't a useful "before" reference.
	if (workingTreeVersion && ver === workingTreeVersion) continue
	emit(ver)
}

const parent = exec('git show HEAD~1:package.json')
if (parent) {
	const ver = extractTldrawVersion(parent)
	if (ver && ver !== workingTreeVersion) emit(ver)
}

if (workingTreeVersion) emit(workingTreeVersion)

console.error(
	'Could not detect previous tldraw version. Pass it as an argument: /tldraw-migrate 4.0.0'
)
process.exit(1)
