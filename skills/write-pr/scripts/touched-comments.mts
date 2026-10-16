/**
 * Lists existing comments and docs that may have gone stale because of this branch.
 * The added-comment sweep in ../SKILL.md misses these: they sit next to changed code,
 * or name a changed declaration, but are not part of the diff themselves.
 *
 * Usage (from the repo root):
 *   node --experimental-strip-types skills/write-pr/scripts/touched-comments.mts [base]
 *
 * base defaults to origin/main. Example output:
 *
 *   Unchanged comments next to changed code:
 *   apps/dotcom/sync-worker/src/TLFileDurableObject.ts:709: // The runtime discards whatever these handlers reject with...
 *
 *   Docs naming a changed declaration:
 *   packages/sync-core/SPEC.md:272: - **SR6** `handleSocketError` and `handleSocketClose` cancel the session...
 */
import { execFileSync } from 'node:child_process'

const base = process.argv[2] ?? 'origin/main'
const CONTEXT_LINES = 8
const CODE_FILES = ['*.ts', '*.tsx', '*.js', '*.mjs', '*.cjs', '*.sql', '*.sh', '*.yml', '*.yaml']
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|#|--)/
const DECLARATION =
	/^[-+]\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z_]\w*)/

function git(...args: string[]): string {
	return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/**
 * Unchanged comment lines that git shows as context around a change, one per comment block.
 * Only modified files: in a new file every comment is part of the diff already.
 */
function nearbyComments(): string[] {
	const diff = git('diff', `${base}...HEAD`, `-U${CONTEXT_LINES}`, '--diff-filter=M', '--', ...CODE_FILES)
	const found: string[] = []
	let file = ''
	let lineNumber = 0
	let inReportedBlock = false

	for (const line of diff.split('\n')) {
		if (line.startsWith('+++ b/')) {
			file = line.slice('+++ b/'.length)
			continue
		}
		const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
		if (hunk) {
			lineNumber = Number(hunk[1])
			inReportedBlock = false
			continue
		}
		if (line.startsWith('-')) continue

		const isContext = line.startsWith(' ')
		const text = line.slice(1)
		if (isContext && COMMENT_LINE.test(text)) {
			if (!inReportedBlock) found.push(`${file}:${lineNumber}: ${text.trim()}`)
			inReportedBlock = true
		} else if (!COMMENT_LINE.test(text)) {
			inReportedBlock = false
		}
		lineNumber++
	}
	return found
}

/**
 * Names of declarations the diff added, removed or renamed. Only camelCase and PascalCase
 * names, so the docs search doesn't match everyday words like `data` or `id`.
 */
function changedDeclarations(): string[] {
	const diff = git('diff', `${base}...HEAD`, '-U0', '--', '*.ts', '*.tsx')
	const names = new Set<string>()
	for (const line of diff.split('\n')) {
		const name = line.match(DECLARATION)?.[1]
		if (name && /[a-z][A-Z]|^[A-Z][a-z]+[A-Z]/.test(name)) names.add(name)
	}
	return [...names].sort()
}

/** Docs lines that mention any of the names, skipping generated and historical files. */
function docsNaming(names: string[]): string[] {
	if (names.length === 0) return []
	const patterns = names.flatMap((name) => ['-e', name])
	const excluded = [
		':!**/CHANGELOG.md',
		':!**/*.api.md',
		':!**/DOCS.md',
		':!apps/docs/content/releases/**',
	]
	try {
		const out = git('grep', '-n', '-w', ...patterns, '--', '*.md', '*.mdx', ...excluded)
		return out.trim().split('\n')
	} catch {
		// git grep exits 1 when nothing matches
		return []
	}
}

const comments = nearbyComments()
console.log('Unchanged comments next to changed code:')
console.log(comments.length ? comments.join('\n') : '(none)')

const docs = docsNaming(changedDeclarations())
console.log('\nDocs naming a changed declaration:')
console.log(docs.length ? docs.join('\n') : '(none)')
