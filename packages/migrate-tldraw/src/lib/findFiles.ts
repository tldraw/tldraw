import * as fs from 'node:fs'
import * as path from 'node:path'

export const TS_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cjs'])
export const CSS_EXTS = new Set(['.css', '.scss', '.less'])

export const IGNORED_DIRS = new Set([
	'node_modules',
	'.git',
	'.yarn',
	'.parcel-cache',
	'.vercel',
	'.svelte-kit',
	'.expo',
	'.cache',
	'.next',
	'.turbo',
	'.tsbuild',
	'tmp',
	'target',
	'vendor',
	'__pycache__',
	'.venv',
	'dist',
	'dist-cjs',
	'build',
	'out',
	'coverage',
])

const SCRIPT_BASENAMES = new Set([
	'migrate-to-v5.ts',
	'migrate-to-v5.js',
	'migrate-to-v5.cjs',
	'migrate-to-v5.mjs',
])

export interface FindFilesOptions {
	/** Set of file extensions to include, e.g. `TS_EXTS` or `CSS_EXTS`. */
	extensions: Set<string>
	/**
	 * Absolute path of the migrate-tldraw bundle file. If a target file resolves
	 * to this path, we skip it so the script never processes itself.
	 */
	selfPath?: string
}

/**
 * Recursively walk `dir` collecting files whose extension is in
 * `options.extensions`, skipping anything in {@link IGNORED_DIRS} and any file
 * that matches the migrate-tldraw bundle.
 *
 * Symlinks are not followed; this avoids infinite loops in unusual setups.
 */
export function findFiles(dir: string, options: FindFilesOptions): string[] {
	const results: string[] = []
	const selfReal = options.selfPath ? safeRealpath(options.selfPath) : null

	function walk(current: string) {
		let entries: fs.Dirent[]
		try {
			entries = fs.readdirSync(current, { withFileTypes: true })
		} catch {
			return
		}
		for (const entry of entries) {
			if (entry.isSymbolicLink()) continue
			if (IGNORED_DIRS.has(entry.name)) continue
			const full = path.join(current, entry.name)
			if (entry.isDirectory()) {
				walk(full)
			} else if (options.extensions.has(path.extname(entry.name))) {
				if (SCRIPT_BASENAMES.has(entry.name)) continue
				if (selfReal && safeRealpath(full) === selfReal) continue
				results.push(full)
			}
		}
	}

	walk(dir)
	return results
}

function safeRealpath(p: string): string | null {
	try {
		return fs.realpathSync(p)
	} catch {
		return null
	}
}
