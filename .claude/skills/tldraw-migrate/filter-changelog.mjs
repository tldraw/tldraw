#!/usr/bin/env node
/**
 * Filters tldraw changelog to only versions between `from` and `to` (inclusive of `to`).
 * Usage: node filter-changelog.mjs <from-version> [to-version]
 *
 * If to-version is omitted, includes everything newer than from-version.
 * Versions should be semver like "4.0.0" or "v4.0.0" (the "v" prefix is optional).
 *
 * Reads changelog from stdin, writes filtered output to stdout.
 */

const [, , fromArg, toArg] = process.argv

if (!fromArg) {
	console.error('Usage: node filter-changelog.mjs <from-version> [to-version]')
	console.error(
		'  e.g.: curl -s https://tldraw.dev/llms-releases.txt | node filter-changelog.mjs 4.0.0 4.6.0'
	)
	process.exit(1)
}

function parseVersion(str) {
	const m = str.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/)
	if (!m) return null
	return [+m[1], +m[2], +m[3]]
}

function compareVersions(a, b) {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) return a[i] - b[i]
	}
	return 0
}

const fromVer = parseVersion(fromArg)
const toVer = toArg ? parseVersion(toArg) : null

if (!fromVer) {
	console.error(`Invalid from-version: ${fromArg}`)
	process.exit(1)
}
if (toArg && !toVer) {
	console.error(`Invalid to-version: ${toArg}`)
	process.exit(1)
}

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
	// Split into sections by top-level headings (# vX.Y.Z)
	const sections = []
	let current = null

	for (const line of input.split('\n')) {
		const headingMatch = line.match(/^# (v?\d+\.\d+\.\d+)/)
		if (headingMatch) {
			if (current) sections.push(current)
			current = { version: parseVersion(headingMatch[1]), lines: [line] }
		} else if (current) {
			current.lines.push(line)
		}
	}
	if (current) sections.push(current)

	// Filter: include versions where from < version <= to
	const filtered = sections.filter((s) => {
		const afterFrom = compareVersions(s.version, fromVer) > 0
		const beforeTo = toVer ? compareVersions(s.version, toVer) <= 0 : true
		return afterFrom && beforeTo
	})

	if (filtered.length === 0) {
		console.error(`No versions found between ${fromArg} and ${toArg || 'latest'}`)
		process.exit(0)
	}

	process.stdout.write(filtered.map((s) => s.lines.join('\n')).join('\n\n'))
})
