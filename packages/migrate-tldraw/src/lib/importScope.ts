/**
 * Lightweight import scanner. Without bringing in a full TS parser, we extract
 * the set of imported symbols and the set of imported package specifiers from
 * a source file. This lets `Flag.scope: 'import'` rules avoid firing on files
 * that don't actually use tldraw at all.
 *
 * The scanner intentionally accepts more shapes than strictly valid TS — false
 * positives here just mean we report a flag that we'd otherwise skip, which is
 * safer than missing a real flag.
 */

export interface FileImports {
	/** Set of every package specifier seen in `import … from '<spec>'`. */
	specifiers: Set<string>
	/** Set of every imported binding (named, default, or namespace). */
	symbols: Set<string>
	/** Map from imported binding name to the specifier it came from. */
	symbolToSpecifier: Map<string, string>
	/**
	 * Half-open ranges `[start, end)` covering each import/require statement.
	 * Used to suppress flag matches that happen on the import declaration
	 * itself; the user knows they import the symbol, what matters is the
	 * call site.
	 */
	importRanges: Array<{ start: number; end: number }>
}

const EMPTY: FileImports = {
	specifiers: new Set(),
	symbols: new Set(),
	symbolToSpecifier: new Map(),
	importRanges: [],
}

const IMPORT_RE = /import\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
const REQUIRE_RE = /(?:const|let|var)\s+([\s\S]*?)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g

/**
 * Returns the set of imports/requires found in `source`. Cheap regex-based scan
 * that handles named, default, namespace, and renamed imports as well as basic
 * `require(...)` destructuring.
 */
export function scanImports(source: string): FileImports {
	if (!source) return EMPTY

	const specifiers = new Set<string>()
	const symbols = new Set<string>()
	const symbolToSpecifier = new Map<string, string>()
	const importRanges: Array<{ start: number; end: number }> = []

	for (const match of source.matchAll(IMPORT_RE)) {
		const clause = match[1]
		const spec = match[2]
		specifiers.add(spec)
		extractClauseBindings(clause).forEach((name) => {
			symbols.add(name)
			if (!symbolToSpecifier.has(name)) symbolToSpecifier.set(name, spec)
		})
		importRanges.push({ start: match.index!, end: match.index! + match[0].length })
	}

	for (const match of source.matchAll(REQUIRE_RE)) {
		const clause = match[1]
		const spec = match[2]
		specifiers.add(spec)
		extractClauseBindings(clause).forEach((name) => {
			symbols.add(name)
			if (!symbolToSpecifier.has(name)) symbolToSpecifier.set(name, spec)
		})
		importRanges.push({ start: match.index!, end: match.index! + match[0].length })
	}

	return { specifiers, symbols, symbolToSpecifier, importRanges }
}

/** Returns true when `position` falls inside any of the file's import ranges. */
export function isInsideImport(imports: FileImports, position: number): boolean {
	for (const { start, end } of imports.importRanges) {
		if (position >= start && position < end) return true
	}
	return false
}

/**
 * Pulls every locally-bound name out of an import clause. Handles:
 *
 * - default imports:        `Foo`
 * - named imports:          `{ Foo, Bar as Baz }`
 * - namespace imports:      `* as Foo`
 * - default + named/ns:     `Foo, { Bar }` / `Foo, * as Bar`
 */
function extractClauseBindings(clause: string): string[] {
	const out: string[] = []
	const trimmed = clause.trim()
	if (!trimmed) return out

	// Split into chunks before each `{` so we get default + named separately.
	const namedStart = trimmed.indexOf('{')
	const head = namedStart === -1 ? trimmed : trimmed.slice(0, namedStart)
	const named =
		namedStart === -1 ? '' : trimmed.slice(namedStart + 1, trimmed.lastIndexOf('}'))

	for (const piece of head.split(',')) {
		const p = piece.trim()
		if (!p) continue
		const nsMatch = p.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/)
		if (nsMatch) {
			out.push(nsMatch[1])
			continue
		}
		const ident = p.match(/^([A-Za-z_$][\w$]*)$/)
		if (ident) out.push(ident[1])
	}

	for (const piece of named.split(',')) {
		const p = piece.trim()
		if (!p) continue
		// `Foo`, `Foo as Bar`, `type Foo`, `type Foo as Bar`
		const m = p.match(/^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/)
		if (m) out.push(m[2] ?? m[1])
	}

	return out
}

/**
 * Returns true if `imports` includes any specifier that matches one of
 * `packages` (exact match or scope prefix like `'@tldraw/'` matching
 * `'@tldraw/editor'`).
 */
export function importsAnyOf(imports: FileImports, packages: readonly string[]): boolean {
	for (const spec of imports.specifiers) {
		if (specifierMatches(spec, packages)) return true
	}
	return false
}

/**
 * Returns true if `symbol` was imported in this file from one of `packages`.
 */
export function symbolImportedFrom(
	imports: FileImports,
	symbol: string,
	packages: readonly string[]
): boolean {
	const spec = imports.symbolToSpecifier.get(symbol)
	if (!spec) return false
	return specifierMatches(spec, packages)
}

function specifierMatches(spec: string, packages: readonly string[]): boolean {
	for (const pkg of packages) {
		if (spec === pkg) return true
		if (pkg.endsWith('/') && spec.startsWith(pkg)) return true
		// allow subpath imports like `@tldraw/editor/foo` to match `@tldraw/editor`
		if (spec === pkg || spec.startsWith(`${pkg}/`)) return true
	}
	return false
}
