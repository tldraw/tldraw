#!/usr/bin/env node
/**
 * Resolves the migration *target* (what version/tag to upgrade TO) from
 * the skill's $ARGUMENTS, and writes it to stdout.
 *
 * Argument forms supported:
 *   /tldraw-migrate                       → "latest"
 *   /tldraw-migrate 4.4.0                 → "latest" (single semver = from-version)
 *   /tldraw-migrate canary                → "canary" (single tag/pre-release = target)
 *   /tldraw-migrate 4.4.0 canary          → "canary" (two args: <from> <target>)
 *   /tldraw-migrate 4.4.0 4.6.0-canary.x  → "4.6.0-canary.x"
 *
 * Outputs just the resolved target with no trailing newline so it can be
 * interpolated directly in shell.
 */

const args = process.argv
	.slice(2)
	.map((a) => a.trim())
	.filter(Boolean)

const STABLE_SEMVER = /^v?\d+\.\d+\.\d+$/

function emit(target) {
	process.stdout.write(target)
	process.exit(0)
}

if (args.length === 0) emit('latest')
if (args.length >= 2) emit(args[args.length - 1])

// Single arg: stable semver = from-version (target defaults), anything else = target.
const only = args[0]
emit(STABLE_SEMVER.test(only) ? 'latest' : only)
