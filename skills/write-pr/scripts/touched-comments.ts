#!/usr/bin/env npx tsx
/**
 * Lists existing comments and docs that may have gone stale because of this branch.
 * The added-comment sweep in ../SKILL.md misses these: they sit next to changed code,
 * or name a changed declaration, but are not part of the diff themselves.
 *
 * Usage (from the repo root):
 *   npx tsx skills/write-pr/scripts/touched-comments.ts [base]
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
// Column 0 only, so locals inside functions and tests don't count as declarations.
const DECLARATION =
	/^[-+](?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\*?|const|let|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/
// One-tab class or interface member with a one-line signature. Needs a body, a return type or a
// modifier, so a call statement like `\tdoThing(x)` inside a function doesn't match.
const MEMBER =
	/^[-+]\t(?:@\w+(?:\([^)]*\))?\s+)?((?:(?:public|private|protected|static|readonly|abstract|override|declare|async|get|set)\s+)*)\*?([A-Za-z_$][\w$]*)\??(?:<[^()]*>)?\([^()]*\)\s*(:[^=]+?)?\s*(\{)?\s*$/
const CONTROL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function'])
// Ignore the user's git config: an external diff tool, noprefix or forced colour all break parsing.
const DIFF_FLAGS = ['--no-ext-diff', '--no-color', '--src-prefix=a/', '--dst-prefix=b/']

function git(...args: string[]): string {
	return execFileSync('git', ['-c', 'core.quotePath=false', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/**
 * Unchanged comment lines that git shows as context around a change, one per comment block.
 * Only modified files: in a new file every comment is part of the diff already.
 */
function nearbyComments(): string[] {
	const diff = git(
		'diff',
		...DIFF_FLAGS,
		`${base}...HEAD`,
		`-U${CONTEXT_LINES}`,
		'--diff-filter=MR',
		'--',
		...CODE_FILES
	)
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
 * Names of declarations the diff added, removed or renamed. Skips lowercase single words like
 * `data` or `id` and short all-caps names like `ID`, which match everyday prose in docs.
 */
function changedDeclarations(): string[] {
	const diff = git('diff', ...DIFF_FLAGS, `${base}...HEAD`, '-U0', '--', '*.ts', '*.tsx')
	const names = new Set<string>()
	for (const line of diff.split('\n')) {
		const name = declarationName(line)
		if (name && /[a-z][A-Z]|^[A-Z]\w*[a-z]|^[A-Z][A-Z0-9_]{3,}$/.test(name)) names.add(name)
	}
	return [...names].sort()
}

function declarationName(line: string): string | undefined {
	const declaration = line.match(DECLARATION)
	if (declaration) return declaration[1]
	const member = line.match(MEMBER)
	if (!member) return undefined
	const [, modifiers, name, returnType, body] = member
	if (CONTROL_KEYWORDS.has(name)) return undefined
	return modifiers || returnType || body ? name : undefined
}

/** Docs lines that mention any of the names, skipping generated and historical files. */
function docsNaming(names: string[]): string[] {
	if (names.length === 0) return []
	const patterns = names.flatMap((name) => ['-e', name])
	const excluded = [
		':!**/CHANGELOG.md',
		':!**/*.api.md',
		':!apps/docs/content/releases/**',
	]
	try {
		const out = git('grep', '--no-color', '-n', '-w', ...patterns, '--', '*.md', '*.mdx', ...excluded)
		return out.trim().split('\n')
	} catch (error) {
		// git grep exits 1 when nothing matches; anything else is a real failure
		if ((error as { status?: number }).status === 1) return []
		throw error
	}
}

const comments = nearbyComments()
console.log('Unchanged comments next to changed code:')
console.log(comments.length ? comments.join('\n') : '(none)')

const docs = docsNaming(changedDeclarations())
console.log('\nDocs naming a changed declaration:')
console.log(docs.length ? docs.join('\n') : '(none)')
