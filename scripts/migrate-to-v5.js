#!/usr/bin/env node
/**
 * tldraw v4.x → v5.0 migration script
 *
 * Applies deterministic prop renames and prints a report of every line that
 * needs manual attention (non-deterministic changes, removed APIs, signature
 * changes, CSS variables, and overlay component slots).
 *
 * Usage:
 *   node scripts/migrate-to-v5.js [directory]
 *
 * Options:
 *   --dry-run   Report changes without writing files
 *   --no-css    Skip CSS/SCSS/LESS files
 *
 * Default directory: current working directory
 */

'use strict'

const fs = require('fs')
const path = require('path')

// ─── Colors ───────────────────────────────────────────────────────────────────

const isTTY = process.stdout.isTTY
const c = {
	reset: isTTY ? '\x1b[0m' : '',
	bold: isTTY ? '\x1b[1m' : '',
	dim: isTTY ? '\x1b[2m' : '',
	red: isTTY ? '\x1b[31m' : '',
	green: isTTY ? '\x1b[32m' : '',
	yellow: isTTY ? '\x1b[33m' : '',
	cyan: isTTY ? '\x1b[36m' : '',
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipCss = args.includes('--no-css')
const targetDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? '.')

// ─── File discovery ───────────────────────────────────────────────────────────

const TS_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cjs'])
const CSS_EXTS = new Set(['.css', '.scss', '.less'])
const IGNORED_DIRS = new Set([
	'node_modules',
	'.git',
	'dist',
	'build',
	'.next',
	'out',
	'.turbo',
	'.cache',
	'coverage',
])

function findFiles(dir, extensions) {
	const results = []
	function walk(current) {
		let entries
		try {
			entries = fs.readdirSync(current, { withFileTypes: true })
		} catch {
			return
		}
		for (const entry of entries) {
			if (IGNORED_DIRS.has(entry.name)) continue
			const full = path.join(current, entry.name)
			if (entry.isDirectory()) {
				walk(full)
			} else if (extensions.has(path.extname(entry.name))) {
				results.push(full)
			}
		}
	}
	walk(dir)
	return results
}

// ─── Transforms ───────────────────────────────────────────────────────────────
//
// Each entry is one of:
//   AutoFix  – applied directly to file content (safe, mechanical renames)
//   Flag     – reported in the summary but not auto-applied

/**
 * @typedef {{ kind: 'auto'; name: string; pattern: RegExp; replacement: string | ((m: string, ...args: any[]) => string); note: string }} AutoFix
 * @typedef {{ kind: 'flag'; name: string; pattern: RegExp; note: string }} Flag
 */

/** @type {Array<AutoFix>} */
const AUTO_FIXES = [
	// inferDarkMode (bare JSX prop) → colorScheme="system"
	// Matches:  inferDarkMode  followed by whitespace, / or > (not = which indicates a value follows)
	{
		kind: 'auto',
		name: 'inferDarkMode bare → colorScheme="system"',
		pattern: /\binferDarkMode(?=\s|\/|>)/g,
		replacement: 'colorScheme="system"',
		note: 'inferDarkMode prop renamed to colorScheme; bare prop becomes colorScheme="system"',
	},
	// inferDarkMode={true} → colorScheme="system"
	{
		kind: 'auto',
		name: 'inferDarkMode={true} → colorScheme="system"',
		pattern: /inferDarkMode=\{true\}/g,
		replacement: 'colorScheme="system"',
		note: 'inferDarkMode={true} becomes colorScheme="system"',
	},
	// inferDarkMode={false} → (remove)
	{
		kind: 'auto',
		name: 'inferDarkMode={false} → removed',
		pattern: /\s*inferDarkMode=\{false\}/g,
		replacement: '',
		note: 'inferDarkMode={false} removed (light mode is the default)',
	},
	// inferDarkMode="…" → colorScheme="…"  (catches inferDarkMode="dark" etc.)
	{
		kind: 'auto',
		name: 'inferDarkMode="…" → colorScheme="…"',
		pattern: /\binferDarkMode=/g,
		replacement: 'colorScheme=',
		note: 'inferDarkMode= renamed to colorScheme= (verify the value is still correct)',
	},
]

/** @type {Array<Flag>} */
const TS_FLAGS = [
	// ── Theme system ────────────────────────────────────────────────────────────
	{
		kind: 'flag',
		name: 'useIsDarkMode → useColorMode',
		pattern: /\buseIsDarkMode\b/g,
		note: "Rename to useColorMode(). Return type changed: boolean → 'dark'|'light'. Audit every usage — truthy checks like `if (isDark)` will break because 'light' is also truthy.",
	},
	{
		kind: 'flag',
		name: 'getDefaultColorTheme removed',
		pattern: /\bgetDefaultColorTheme\b/g,
		note: 'Removed. Use editor.getCurrentTheme().colors[editor.getColorMode()] instead.',
	},
	{
		kind: 'flag',
		name: 'useDefaultColorTheme removed',
		pattern: /\buseDefaultColorTheme\b/g,
		note: 'Removed. Use editor.getCurrentTheme() and useColorMode() instead.',
	},
	{
		kind: 'flag',
		name: 'DefaultColorThemePalette removed',
		pattern: /\bDefaultColorThemePalette\b/g,
		note: 'Removed. Access palette via editor.getCurrentTheme().colors instead.',
	},
	{
		kind: 'flag',
		name: 'defaultColorNames removed',
		pattern: /\bdefaultColorNames\b/g,
		note: 'Removed. Use the theme API instead.',
	},
	{
		kind: 'flag',
		name: 'TLDefaultColorTheme type removed',
		pattern: /\bTLDefaultColorTheme\b/g,
		note: 'Type removed. Use TLThemeColors instead.',
	},
	{
		kind: 'flag',
		name: 'DefaultLabelColorStyle removed',
		pattern: /\bDefaultLabelColorStyle\b/g,
		note: 'Removed. Use theme colors via editor.getCurrentTheme() instead.',
	},
	{
		kind: 'flag',
		name: 'getColorValue first-arg type changed',
		pattern: /\bgetColorValue\s*\(/g,
		note: 'First argument changed from TLDefaultColorTheme to TLThemeColors. Update call sites.',
	},
	{
		kind: 'flag',
		name: 'SvgExportContext.themeId → .colorMode',
		pattern: /\bthemeId\b/g,
		note: "SvgExportContext.themeId renamed to .colorMode (type changed: string → 'light'|'dark'). Verify this is an SvgExportContext usage before renaming.",
	},
	// ── Removed constants ────────────────────────────────────────────────────────
	{
		kind: 'flag',
		name: 'FONT_FAMILIES removed',
		pattern: /\bFONT_FAMILIES\b/g,
		note: 'Removed. Font families are now resolved via display values (getDefaultDisplayValues / getCustomDisplayValues on ShapeUtil).',
	},
	{
		kind: 'flag',
		name: 'FONT_SIZES removed',
		pattern: /\bFONT_SIZES\b/g,
		note: 'Removed. Font sizes are now resolved via display values.',
	},
	{
		kind: 'flag',
		name: 'LABEL_FONT_SIZES removed',
		pattern: /\bLABEL_FONT_SIZES\b/g,
		note: 'Removed. Label font sizes are now resolved via display values.',
	},
	{
		kind: 'flag',
		name: 'STROKE_SIZES removed',
		pattern: /\bSTROKE_SIZES\b/g,
		note: 'Removed. Stroke sizes are now resolved via display values.',
	},
	{
		kind: 'flag',
		name: 'TEXT_PROPS removed',
		pattern: /\bTEXT_PROPS\b/g,
		note: 'Removed. Text properties are now resolved via display values.',
	},
	{
		kind: 'flag',
		name: 'ARROW_LABEL_FONT_SIZES removed',
		pattern: /\bARROW_LABEL_FONT_SIZES\b/g,
		note: 'Removed. Arrow label font sizes are now resolved via display values.',
	},
	// ── Asset system ─────────────────────────────────────────────────────────────
	{
		kind: 'flag',
		name: 'assetValidator removed',
		pattern: /\bassetValidator\b/g,
		note: 'Removed. Use imageAssetValidator, videoAssetValidator, or bookmarkAssetValidator for the specific asset type.',
	},
	{
		kind: 'flag',
		name: 'getMediaAssetInfoPartial removed',
		pattern: /\bgetMediaAssetInfoPartial\b/g,
		note: 'Removed. Use AssetUtil.getAssetFromFile() instead.',
	},
	{
		kind: 'flag',
		name: 'notifyIfFileNotAllowed signature changed',
		pattern: /\bnotifyIfFileNotAllowed\s*\(/g,
		note: 'Signature changed: (file, options) → (editor, file, options). Add editor as first argument.',
	},
	{
		kind: 'flag',
		name: 'getAssetInfo signature changed',
		pattern: /\bgetAssetInfo\s*\(/g,
		note: 'Signature changed: (file, options, assetId?) → (editor, file, assetId?). Add editor as first argument; remove options. Return type changed to TLAsset|null (no longer throws).',
	},
	// ── Label props ───────────────────────────────────────────────────────────────
	{
		kind: 'flag',
		name: 'PlainTextLabelProps/RichTextLabelProps: font → fontFamily',
		pattern: /\bPlainTextLabelProps\b|\bRichTextLabelProps\b/g,
		note: 'PlainTextLabelProps and RichTextLabelProps changed: font → fontFamily, align → textAlign, fill removed.',
	},
	// ── Overlay slots in TLEditorComponents ───────────────────────────────────────
	{
		kind: 'flag',
		name: 'TLEditorComponents: Brush slot removed',
		pattern: /\bBrush\s*:/g,
		note: 'Brush slot removed from TLEditorComponents. Migrate to BrushOverlayUtil (extend and pass via overlayUtils prop).',
	},
	{
		kind: 'flag',
		name: 'TLEditorComponents: ZoomBrush slot removed',
		pattern: /\bZoomBrush\s*:/g,
		note: 'ZoomBrush slot removed. Migrate to ZoomBrushOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'TLEditorComponents: Scribble slot removed',
		pattern: /\bScribble\s*:/g,
		note: 'Scribble slot removed. Migrate to ScribbleOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'TLEditorComponents: SnapIndicator slot removed',
		pattern: /\bSnapIndicator\s*:/g,
		note: 'SnapIndicator slot removed. Migrate to SnapIndicatorOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'TLEditorComponents: Handle/Handles slot removed',
		pattern: /\bHandles?\s*:/g,
		note: 'Handle/Handles slots removed. Migrate to ShapeHandleOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'TLEditorComponents: SelectionForeground/Background removed',
		pattern: /\bSelection(?:Foreground|Background)\s*:/g,
		note: 'SelectionForeground/SelectionBackground slots removed. Migrate to SelectionForegroundOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'TLEditorComponents: CollaboratorHint slot removed',
		pattern: /\bCollaboratorHint\s*:/g,
		note: 'CollaboratorHint slot removed. Migrate to CollaboratorHintOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'TLEditorComponents: ShapeIndicator(s) removed',
		pattern: /\bShapeIndicators?\s*:/g,
		note: 'ShapeIndicator/ShapeIndicators slots removed. Customize via ShapeUtil.getIndicatorPath() instead.',
	},
	{
		kind: 'flag',
		name: 'TLEditorComponents: ShapeIndicatorErrorFallback removed',
		pattern: /\bShapeIndicatorErrorFallback\s*:/g,
		note: 'ShapeIndicatorErrorFallback slot removed from TLEditorComponents.',
	},
	{
		kind: 'flag',
		name: 'Default* overlay component exports removed',
		pattern:
			/\bDefault(?:Brush|Scribble|SnapIndicator|Handle|SelectionForeground|SelectionBackground|CollaboratorHint|ShapeIndicator|LiveCollaborators)\b/g,
		note: 'Default* overlay component exports removed. Subclass the matching OverlayUtil instead.',
	},
	{
		kind: 'flag',
		name: 'LiveCollaborators removed',
		pattern: /\bLiveCollaborators\b/g,
		note: 'LiveCollaborators removed. Collaborator overlays now handled by CollaboratorCursorOverlayUtil, CollaboratorBrushOverlayUtil, etc.',
	},
]

/** @type {Array<Flag>} */
const CSS_FLAGS = [
	{
		kind: 'flag',
		name: 'CSS var --tl-color-snap removed',
		pattern: /--tl-color-snap\b/g,
		note: 'CSS variable removed. Snap colors now come from TLTheme. Use SnapIndicatorOverlayUtil to customize.',
	},
	{
		kind: 'flag',
		name: 'CSS var --tl-color-brush-fill removed',
		pattern: /--tl-color-brush-fill\b/g,
		note: 'CSS variable removed. Brush fill color now comes from TLTheme.',
	},
	{
		kind: 'flag',
		name: 'CSS var --tl-color-brush-stroke removed',
		pattern: /--tl-color-brush-stroke\b/g,
		note: 'CSS variable removed. Brush stroke color now comes from TLTheme.',
	},
	{
		kind: 'flag',
		name: 'CSS var --tl-color-laser removed',
		pattern: /--tl-color-laser\b/g,
		note: 'CSS variable removed. Laser color now comes from TLTheme.',
	},
	{
		kind: 'flag',
		name: 'CSS var --tl-layer-overlays-custom removed',
		pattern: /--tl-layer-overlays-custom\b/g,
		note: 'CSS variable removed. Use TLTheme entries or OverlayUtil.render() for overlay colors.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-brush removed',
		pattern: /\.tl-brush\b/g,
		note: 'CSS class selector removed. Brush is now rendered by BrushOverlayUtil on a canvas context.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-scribble removed',
		pattern: /\.tl-scribble\b/g,
		note: 'CSS class selector removed. Scribble is now rendered by ScribbleOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-snap-indicator removed',
		pattern: /\.tl-snap-indicator\b/g,
		note: 'CSS class selector removed. Snap indicator is now rendered by SnapIndicatorOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-handle removed',
		pattern: /\.tl-handle\b/g,
		note: 'CSS class selector removed. Handles are now rendered by ShapeHandleOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-selection__fg__outline removed',
		pattern: /\.tl-selection__fg__outline\b/g,
		note: 'CSS class selector removed. Selection foreground is now rendered by SelectionForegroundOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-corner-handle removed',
		pattern: /\.tl-corner-handle\b/g,
		note: 'CSS class selector removed. Corner handles rendered by ShapeHandleOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-text-handle removed',
		pattern: /\.tl-text-handle\b/g,
		note: 'CSS class selector removed. Text handles rendered by ShapeHandleOverlayUtil.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-corner-crop-handle removed',
		pattern: /\.tl-corner-crop-handle\b/g,
		note: 'CSS class selector removed.',
	},
	{
		kind: 'flag',
		name: 'CSS selector .tl-mobile-rotate__ removed',
		pattern: /\.tl-mobile-rotate__/g,
		note: 'CSS class selectors removed. Mobile rotate handle rendered by ShapeHandleOverlayUtil.',
	},
]

// ─── Apply transforms to a single file ───────────────────────────────────────

/**
 * @param {string} filePath
 * @param {boolean} isCss
 * @returns {{ changed: boolean; fixes: string[]; flags: Array<{line: number; col: number; flag: Flag}> }}
 */
function processFile(filePath, isCss) {
	let source
	try {
		source = fs.readFileSync(filePath, 'utf8')
	} catch {
		return { changed: false, fixes: [], flags: [] }
	}

	let updated = source
	const fixes = []

	if (!isCss) {
		for (const fix of AUTO_FIXES) {
			const before = updated
			updated = updated.replace(fix.pattern, fix.replacement)
			if (updated !== before) {
				fixes.push(fix.name)
				// Reset lastIndex for global regexes
				fix.pattern.lastIndex = 0
			}
		}
	}

	const flags = []
	const flagList = isCss ? CSS_FLAGS : TS_FLAGS
	for (const flag of flagList) {
		flag.pattern.lastIndex = 0
		let m
		while ((m = flag.pattern.exec(source)) !== null) {
			const before = source.slice(0, m.index)
			const line = (before.match(/\n/g) ?? []).length + 1
			const lastNl = before.lastIndexOf('\n')
			const col = lastNl === -1 ? m.index + 1 : m.index - lastNl
			flags.push({ line, col, flag })
		}
		flag.pattern.lastIndex = 0
	}

	const changed = updated !== source
	if (changed && !dryRun) {
		fs.writeFileSync(filePath, updated, 'utf8')
	}

	return { changed, fixes, flags }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const tsFiles = findFiles(targetDir, TS_EXTS)
const cssFiles = skipCss ? [] : findFiles(targetDir, CSS_EXTS)

let totalFixed = 0
let totalFlagged = 0
const fixSummary = new Map() // fixName → count
const flagsByFile = new Map() // filePath → flags

console.log(
	`\n${c.bold}tldraw v4 → v5 migration${c.reset}${dryRun ? ` ${c.yellow}[dry run]${c.reset}` : ''}`
)
console.log(`${c.dim}Scanning ${targetDir}${c.reset}\n`)

for (const file of [...tsFiles, ...cssFiles]) {
	const isCss = CSS_EXTS.has(path.extname(file))
	const { changed, fixes, flags } = processFile(file, isCss)
	const rel = path.relative(targetDir, file)

	if (changed) {
		totalFixed++
		for (const name of fixes) {
			fixSummary.set(name, (fixSummary.get(name) ?? 0) + 1)
		}
		if (dryRun) {
			console.log(`  ${c.yellow}[would fix]${c.reset} ${rel}`)
			for (const name of fixes) console.log(`    ${c.yellow}•${c.reset} ${name}`)
		} else {
			console.log(`  ${c.green}[fixed]${c.reset}     ${rel}`)
			for (const name of fixes) console.log(`    ${c.green}•${c.reset} ${name}`)
		}
	}

	if (flags.length > 0) {
		totalFlagged += flags.length
		flagsByFile.set(rel, flags)
	}
}

// ─── Report ───────────────────────────────────────────────────────────────────

if (fixSummary.size > 0) {
	console.log(
		`\n${c.bold}── Auto-fixes applied ──────────────────────────────────────────────────────${c.reset}`
	)
	for (const [name, count] of fixSummary) {
		console.log(`  ${c.green}${count}x${c.reset}  ${name}`)
	}
}

if (flagsByFile.size > 0) {
	console.log(
		`\n${c.bold}${c.red}── Manual review required ──────────────────────────────────────────────────${c.reset}`
	)
	console.log(`${c.dim}  These lines reference APIs that changed or were removed in v5.`)
	console.log(`  Run the migrate-to-v5 Claude skill for guided remediation.${c.reset}\n`)
	for (const [file, flags] of flagsByFile) {
		console.log(`  ${c.bold}${file}${c.reset}`)
		for (const { line, col, flag } of flags) {
			console.log(
				`    ${c.cyan}${String(line).padStart(4)}:${String(col).padEnd(3)}${c.reset}  ${c.yellow}[${flag.name}]${c.reset}`
			)
			console.log(`           ${c.dim}${flag.note}${c.reset}`)
		}
		console.log()
	}
}

console.log(
	`${c.bold}── Summary ─────────────────────────────────────────────────────────────────${c.reset}`
)
console.log(`  Files auto-fixed:    ${c.bold}${totalFixed}${c.reset}`)
console.log(
	`  Lines to review:     ${totalFlagged > 0 ? c.yellow : c.bold}${totalFlagged}${c.reset}`
)
console.log()

if (totalFlagged > 0) {
	console.log(`${c.bold}Next steps:${c.reset}`)
	console.log(
		`  1. Run ${c.cyan}yarn typecheck${c.reset} to surface type errors from renamed APIs.`
	)
	console.log(
		`  2. Use the migrate-to-v5 skill in Claude Code for guided non-deterministic migration:`
	)
	console.log(`     ${c.cyan}/migrate-to-v5${c.reset}`)
	console.log(
		`  3. See ${c.dim}apps/docs/content/releases/v5.0.0.mdx${c.reset} for full migration guides.`
	)
	console.log()
}

process.exit(totalFlagged > 0 ? 1 : 0)
