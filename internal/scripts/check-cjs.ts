import { execFile } from 'child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs'
import { builtinModules } from 'module'
import { tmpdir } from 'os'
import path from 'path'
import { glob } from 'glob'
import { REPO_ROOT } from './lib/file'
import { nicelog } from './lib/nicelog'

/**
 * Smoke test for the published CommonJS builds. tldraw dual-publishes CJS + ESM,
 * and the package build keeps dependencies external as `require("x")` in the CJS
 * output (see `build-package.ts`). When `x` is ESM-only, that `require(<esm>)`
 * throws `ERR_REQUIRE_ESM` for CJS consumers on Node 20.0-20.18 (the repo floor
 * is `^20.0.0`; `require(esm)` only landed in 20.19 / 22.12) and breaks Jest and
 * ts-node.
 *
 * This script scans each package's `dist-cjs` build for the external deps it
 * `require()`s and checks each one under strict CommonJS resolution
 * (`node --no-experimental-require-module`, which reinstates the
 * `ERR_REQUIRE_ESM` throw even on newer Node). It fails on any ESM-only dep that
 * leaks into a CJS build. Fix a leak by inlining the dep (add it to `ESM_ONLY`
 * in `build-package.ts`) or by loading it via a dynamic `import()`.
 */

// Error codes Node throws when CommonJS `require()`s an ES module.
const ESM_REQUIRE_ERROR_CODES = new Set(['ERR_REQUIRE_ESM', 'ERR_REQUIRE_ASYNC_MODULE'])

interface RequireCandidate {
	packageName: string
	packageDir: string
	specifier: string
	files: Set<string>
}

/** Package name for a bare specifier, handling scoped names and subpaths. */
function getPackageName(specifier: string): string {
	if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
	return specifier.split('/')[0]
}

/** Names of every workspace package, so we skip our own dual-built deps. */
function getWorkspacePackageNames(): Set<string> {
	const names = new Set<string>()
	for (const dir of readdirSync(path.join(REPO_ROOT, 'packages'))) {
		const manifest = path.join(REPO_ROOT, 'packages', dir, 'package.json')
		if (!existsSync(manifest)) continue
		const name = JSON.parse(readFileSync(manifest, 'utf8')).name
		if (typeof name === 'string') names.add(name)
	}
	return names
}

/** Bare `require("x")` specifiers in a built CJS file (ignores `require.resolve`). */
function extractRequireSpecifiers(code: string): Set<string> {
	const specifiers = new Set<string>()
	const re = /\brequire\(\s*["']([^"']+)["']\s*\)/g
	let match
	while ((match = re.exec(code))) specifiers.add(match[1])
	return specifiers
}

/** Collect every external dep `require()`d from any package's `dist-cjs`. */
function collectRequireCandidates(): Map<string, RequireCandidate> {
	const workspaceNames = getWorkspacePackageNames()
	const builtins = new Set(builtinModules)
	const candidates = new Map<string, RequireCandidate>()

	for (const distCjsDir of glob.sync('packages/*/dist-cjs', { cwd: REPO_ROOT, absolute: true })) {
		const packageDir = path.dirname(distCjsDir)
		const packageName = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8')).name

		for (const file of glob.sync('**/*.js', { cwd: distCjsDir, absolute: true })) {
			const code = readFileSync(file, 'utf8')
			for (const specifier of extractRequireSpecifiers(code)) {
				if (specifier.startsWith('.') || specifier.startsWith('node:')) continue
				const name = getPackageName(specifier)
				if (builtins.has(specifier) || builtins.has(name)) continue
				if (workspaceNames.has(name)) continue

				const key = `${packageName} ${specifier}`
				let candidate = candidates.get(key)
				if (!candidate) {
					candidate = { packageName, packageDir, specifier, files: new Set() }
					candidates.set(key, candidate)
				}
				candidate.files.add(path.relative(REPO_ROOT, file))
			}
		}
	}

	return candidates
}

/**
 * Strict-`require()` each candidate in a child `node` process with
 * `require(esm)` support disabled, returning the error code (if any) per id.
 */
async function strictRequire(
	items: { id: number; base: string; specifier: string }[]
): Promise<Map<number, string | null>> {
	const codes = new Map<number, string | null>()
	if (items.length === 0) return codes

	const outDir = mkdtempSync(path.join(tmpdir(), 'check-cjs-'))
	const outFile = path.join(outDir, 'result.json')

	// runs as plain CommonJS (node -e defaults to CJS), so require(esm) throws.
	const harness = `
		const { createRequire } = require('module')
		const { writeFileSync } = require('fs')
		const items = JSON.parse(process.argv[1])
		const outFile = process.argv[2]
		const results = []
		for (const item of items) {
			let code = null
			try {
				createRequire(item.base)(item.specifier)
			} catch (error) {
				code = error && error.code ? error.code : 'ERROR'
			}
			results.push({ id: item.id, code })
		}
		writeFileSync(outFile, JSON.stringify(results))
	`

	// Node 20.19+ / 22.12+ allow require(esm) by default, so we disable it to get
	// the faithful ERR_REQUIRE_ESM throw. Older Node throws anyway and doesn't
	// recognize the flag, so only pass it when it's supported.
	const strictFlags = process.allowedNodeEnvironmentFlags.has('--no-experimental-require-module')
		? ['--no-experimental-require-module']
		: []

	try {
		await new Promise<void>((resolve, reject) => {
			execFile(
				'node',
				[...strictFlags, '-e', harness, JSON.stringify(items), outFile],
				{ cwd: REPO_ROOT, maxBuffer: 32 * 1024 * 1024 },
				(error) => {
					if (existsSync(outFile)) resolve()
					else reject(error ?? new Error('check-cjs harness produced no output'))
				}
			)
		})
		for (const result of JSON.parse(readFileSync(outFile, 'utf8'))) {
			codes.set(result.id, result.code)
		}
	} finally {
		rmSync(outDir, { recursive: true, force: true })
	}

	return codes
}

async function main() {
	const candidates = collectRequireCandidates()
	const candidateList = [...candidates.values()]
	nicelog(
		`Checking ${candidateList.length} external require() targets across packages/*/dist-cjs for ESM-only leaks...`
	)

	const items = candidateList.map((candidate, id) => ({
		id,
		base: path.join(candidate.packageDir, 'dist-cjs', 'index.js'),
		specifier: candidate.specifier,
	}))
	const codes = await strictRequire(items)

	const leaks = candidateList.filter((_, id) => {
		const code = codes.get(id)
		return code != null && ESM_REQUIRE_ERROR_CODES.has(code)
	})

	if (leaks.length > 0) {
		console.error(`\nFound ${leaks.length} ESM-only dependency leak(s) in the CJS build:\n`)
		for (const leak of leaks) {
			console.error(`  ${leak.packageName} require()s ESM-only "${leak.specifier}"`)
			for (const file of [...leak.files].sort()) console.error(`    - ${file}`)
		}
		console.error(
			`\nThese throw ERR_REQUIRE_ESM for CJS consumers (Node <20.19, Jest, ts-node).` +
				`\nFix each one by either:` +
				`\n  - inlining it: add its package name to ESM_ONLY in internal/scripts/build-package.ts` +
				`\n    (route multi-site deps through a vendor shim first, like the no-tiptap-default-import rule), or` +
				`\n  - loading it lazily with a dynamic import() from an async call site.\n`
		)
		process.exit(1)
	}

	nicelog('No ESM-only dependency leaks in the CJS build.')
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
