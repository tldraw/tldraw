/**
 * The transform engine. Applies a transform's `AutoFix` rewrites to a file's
 * source, then scans the post-fix string for `Flag` matches.
 *
 * Flag scoping logic:
 *   - 'import' flags require the target symbol to be imported from one of the
 *     listed packages. If the file doesn't import the symbol from a tldraw
 *     package, we don't fire the flag — that kills the bulk of false positives
 *     identified in PR #8760's review (issues C1–C6).
 *   - 'jsx-components-slot' flags only fire inside `components={…}` literals on
 *     `<Tldraw …>` JSX elements, which is where the removed slot keys actually
 *     matter.
 *   - 'member-access' flags only fire on `<value>.<symbol>` member access.
 *   - 'identifier' fires anywhere — used sparingly for symbols whose name is
 *     so distinctive a collision is unlikely.
 *   - 'css' fires anywhere — only used for the CSS flag list.
 */

import * as fs from 'node:fs'
import type { AutoFix, FileResult, Flag, FlagHit, Transform } from './types'
import { isInsideImport, scanImports, symbolImportedFrom } from './importScope'

export interface ProcessOptions {
	dryRun: boolean
}

export function processSource(
	filePath: string,
	source: string,
	autoFixes: AutoFix[],
	flags: Flag[]
): { updated: string; result: FileResult } {
	let updated = source
	const fixes: FileResult['fixes'] = []

	for (const fix of autoFixes) {
		const before = updated
		updated = updated.replace(fix.pattern, fix.replacement)
		if (updated !== before) {
			fixes.push({ id: fix.id, name: fix.name })
			fix.pattern.lastIndex = 0
		}
	}

	const imports = scanImports(updated)
	const flagHits: FlagHit[] = []

	for (const flag of flags) {
		flag.pattern.lastIndex = 0
		let m: RegExpExecArray | null
		while ((m = flag.pattern.exec(updated)) !== null) {
			if (!flagApplies(flag, updated, m, imports)) continue
			const before = updated.slice(0, m.index)
			const newlines = before.match(/\n/g)
			const line = (newlines ? newlines.length : 0) + 1
			const lastNl = before.lastIndexOf('\n')
			const col = lastNl === -1 ? m.index + 1 : m.index - lastNl
			flagHits.push({ line, col, flag })
			if (m.index === flag.pattern.lastIndex) flag.pattern.lastIndex++
		}
		flag.pattern.lastIndex = 0
	}

	return {
		updated,
		result: {
			path: filePath,
			changed: updated !== source,
			fixes,
			flags: flagHits,
		},
	}
}

/**
 * Read a file from disk, run the transform engine, write back if changed,
 * and return the per-file result. Pure I/O wrapper around `processSource`.
 */
export function processFileOnDisk(
	filePath: string,
	transform: Pick<Transform, 'autoFixes' | 'tsFlags' | 'cssFlags'>,
	isCss: boolean,
	options: ProcessOptions
): FileResult {
	let source: string
	try {
		source = fs.readFileSync(filePath, 'utf8')
	} catch {
		return { path: filePath, changed: false, fixes: [], flags: [] }
	}

	const autoFixes = isCss ? [] : transform.autoFixes
	const flagList = isCss ? transform.cssFlags : transform.tsFlags

	const { updated, result } = processSource(filePath, source, autoFixes, flagList)

	if (result.changed && !options.dryRun) {
		fs.writeFileSync(filePath, updated, 'utf8')
	}

	return result
}

/** Imports type alias to avoid circular signature in `flagApplies`. */
type Imports = ReturnType<typeof scanImports>

function flagApplies(
	flag: Flag,
	source: string,
	match: RegExpExecArray,
	imports: Imports
): boolean {
	switch (flag.scope) {
		case 'import': {
			// Suppress matches on the import declaration line itself.
			if (isInsideImport(imports, match.index)) return false
			const symbol = extractLeadingIdentifier(match[0])
			if (!symbol) return false
			const packages = flag.importedFrom ?? []
			if (packages.length === 0) return true
			return symbolImportedFrom(imports, symbol, packages)
		}
		case 'jsx-components-slot': {
			return isInsideTldrawComponentsProp(source, match.index)
		}
		case 'member-access': {
			return source[match.index - 1] === '.'
		}
		case 'identifier':
		case 'css':
			return true
	}
}

/** Returns the leading identifier of `s`, e.g. 'foo(' → 'foo', 'Brush:' → 'Brush'. */
function extractLeadingIdentifier(s: string): string | null {
	const m = s.match(/^[A-Za-z_$][\w$]*/)
	return m ? m[0] : null
}

/**
 * Returns true if `index` is inside the value of a `components={…}` JSX prop on
 * a `<Tldraw …>` element.
 *
 * We do a short backward scan: walk left until we either find the opening
 * `components={` and confirm the enclosing JSX tag name is `Tldraw`, or hit a
 * tag boundary that disqualifies us. This is intentionally cheap rather than
 * exact — it errs on the side of firing rather than missing.
 */
function isInsideTldrawComponentsProp(source: string, index: number): boolean {
	const head = source.slice(0, index)
	const componentsStart = head.lastIndexOf('components={')
	if (componentsStart === -1) return false

	// Make sure the `{` that opens the prop is balanced past the match.
	const region = source.slice(componentsStart, index)
	let depth = 0
	for (let i = 0; i < region.length; i++) {
		const ch = region[i]
		if (ch === '{') depth++
		else if (ch === '}') depth--
	}
	if (depth <= 0) return false

	// Walk back from `componentsStart` to the opening `<` of the JSX tag.
	const beforeProp = head.slice(0, componentsStart)
	const tagStart = beforeProp.lastIndexOf('<')
	if (tagStart === -1) return false
	const tagSlice = beforeProp.slice(tagStart + 1)
	const tagNameMatch = tagSlice.match(/^([A-Z][\w.]*)/)
	if (!tagNameMatch) return false
	const tagName = tagNameMatch[1]
	// Accept Tldraw and TldrawEditor (the two main entry components).
	return tagName === 'Tldraw' || tagName === 'TldrawEditor'
}
