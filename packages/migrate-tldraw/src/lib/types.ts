/**
 * Core types shared by the migration engine and individual transforms.
 *
 * A `Transform` is a versioned bundle of `AutoFix` rewrites and `Flag`
 * report-only patterns. The engine in `processFile.ts` drives both lists
 * across each file in the project.
 */

/** Where a `Flag` should look for its symbol before reporting a hit. */
export type FlagScope =
	/** Only fire when the symbol is imported from a tldraw package in this file. */
	| 'import'
	/** Only fire when the match is inside a `components={…}` JSX prop on `<Tldraw>`. */
	| 'jsx-components-slot'
	/** Only fire on member access expressions: `.themeId`, `.colorMode`. */
	| 'member-access'
	/** Always fire wherever the regex matches (use sparingly — high false-positive risk). */
	| 'identifier'
	/** Always fire — for CSS/SCSS/LESS files. */
	| 'css'

export interface AutoFix {
	kind: 'auto'
	id: string
	name: string
	pattern: RegExp
	replacement: string
	note: string
}

export interface Flag {
	kind: 'flag'
	id: string
	name: string
	pattern: RegExp
	scope: FlagScope
	/**
	 * For `scope: 'import'`. The symbol is only flagged in files that import it
	 * from one of these packages.
	 */
	importedFrom?: string[]
	note: string
	/** Optional long-form prose block reproduced in the SKILL.md. */
	doc?: string
	example?: { before: string; after: string; lang?: string }
	/**
	 * Optional pointer at a `sections/*.md` slug. The skill generator concatenates
	 * the named section into the SKILL.md verbatim.
	 */
	sectionRef?: string
}

export interface FlagHit {
	line: number
	col: number
	flag: Flag
}

export interface FixApplication {
	id: string
	name: string
}

export interface FileResult {
	path: string
	changed: boolean
	fixes: FixApplication[]
	flags: FlagHit[]
}

export interface Transform {
	/** Stable id, e.g. `'v4-to-v5'`. */
	id: string
	/** Short human title, e.g. `'tldraw 4.x → 5.0'`. */
	title: string
	/** Brief one-line summary used in `--help`. */
	summary: string
	/** Semver range that this transform expects to find installed before running. */
	expectedFromRange: string
	/** Semver range that this transform produces (target version line). */
	producesRange: string
	/**
	 * Slug of the sections directory next to the transform. The skill generator
	 * reads `src/transforms/<id>/<sectionsDir>/*.md` at build time. The bundled
	 * CLI never needs the section content; it just points consumers at the
	 * generated SKILL.md.
	 */
	sectionsDir: string
	autoFixes: AutoFix[]
	tsFlags: Flag[]
	cssFlags: Flag[]
}

/** Loaded section, used only by the skill generator at build time. */
export interface TransformSection {
	slug: string
	title: string
	body: string
}
