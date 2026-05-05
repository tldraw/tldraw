/**
 * v4 → v5 TypeScript/JavaScript flag patterns.
 *
 * These are report-only — the engine won't rewrite them. Each flag is
 * `scope`-tagged so that bare-name patterns only fire when the symbol was
 * actually imported from a tldraw package, killing the bulk of the false
 * positives in PR #8760's review (issues C1–C6).
 *
 * Flag categories:
 *   - Theme system: API renames in the color/theme stack
 *   - Removed constants: FONT_FAMILIES etc. moved to display values
 *   - Asset system: signature changes and removed helpers
 *   - Label props: PlainTextLabelProps / RichTextLabelProps key renames
 *   - Overlay slots: TLEditorComponents slots that became OverlayUtil classes
 *   - Inferred dark mode (the cases we don't auto-fix)
 */

import type { Flag } from '../../lib/types'

export const TLDRAW_PACKAGES = ['tldraw', '@tldraw/editor', '@tldraw/tlschema'] as const
export const TLDRAW_PKG_PREFIX = ['tldraw', '@tldraw/'] as const

export const v4ToV5TsFlags: Flag[] = [
	// ── Inferred dark mode (the cases we deliberately don't auto-fix) ─────────
	{
		kind: 'flag',
		id: 'infer-dark-mode-expr',
		name: 'inferDarkMode={…} (non-literal value)',
		// Match anything that isn't `{true}` or a known string literal
		// (those are auto-fixed). We catch `{false}`, `{someVar}`, `{a && b}`,
		// `{undefined}` etc. The auto-fix runs first so by the time we scan,
		// `{true}` and `="light"|"dark"|"system"` forms are already rewritten.
		pattern: /\binferDarkMode=(?:\{[^}]*\}|"[^"]*"|'[^']*')/g,
		scope: 'identifier',
		note:
			"`inferDarkMode` prop renamed to `colorScheme` in v5 — but the value type changed from boolean to `'light' | 'dark' | 'system'`. Verify the value before renaming.",
		sectionRef: '01-color-mode',
	},

	// ── Theme system ───────────────────────────────────────────────────────────
	{
		kind: 'flag',
		id: 'use-is-dark-mode',
		name: 'useIsDarkMode → useColorMode',
		pattern: /\buseIsDarkMode\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			"Rename to `useColorMode()`. Return type changed from boolean to `'dark' | 'light'`. Audit every usage — truthy checks like `if (isDark)` will now always be true because `'light'` is also truthy.",
		sectionRef: '01-color-mode',
	},
	{
		kind: 'flag',
		id: 'get-default-color-theme',
		name: 'getDefaultColorTheme removed',
		pattern: /\bgetDefaultColorTheme\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			'Removed. Use `editor.getCurrentTheme().colors[editor.getColorMode()]` instead.',
		sectionRef: '02-theme',
	},
	{
		kind: 'flag',
		id: 'use-default-color-theme',
		name: 'useDefaultColorTheme removed',
		pattern: /\buseDefaultColorTheme\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note: 'Removed. Use `editor.getCurrentTheme()` together with `useColorMode()`.',
		sectionRef: '02-theme',
	},
	{
		kind: 'flag',
		id: 'default-color-theme-palette',
		name: 'DefaultColorThemePalette removed',
		pattern: /\bDefaultColorThemePalette\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note: 'Removed. Access the palette via `editor.getCurrentTheme().colors`.',
		sectionRef: '02-theme',
	},
	{
		kind: 'flag',
		id: 'default-color-names',
		name: 'defaultColorNames removed',
		pattern: /\bdefaultColorNames\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note: 'Removed. Use the theme API instead.',
		sectionRef: '02-theme',
	},
	{
		kind: 'flag',
		id: 'tl-default-color-theme',
		name: 'TLDefaultColorTheme type removed',
		pattern: /\bTLDefaultColorTheme\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note: 'Type removed. Use `TLThemeColors` instead.',
		sectionRef: '02-theme',
	},
	{
		kind: 'flag',
		id: 'default-label-color-style',
		name: 'DefaultLabelColorStyle removed',
		pattern: /\bDefaultLabelColorStyle\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note:
			'Removed. Use theme colors directly via `editor.getCurrentTheme().colors[colorMode]`.',
		sectionRef: '02-theme',
	},
	{
		kind: 'flag',
		id: 'get-color-value',
		name: 'getColorValue first-arg type changed',
		pattern: /\bgetColorValue\s*\(/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			'First argument changed from `TLDefaultColorTheme` to `TLThemeColors`. Pass `theme.colors[colorMode]` instead of a full theme object.',
		sectionRef: '02-theme',
	},
	{
		kind: 'flag',
		id: 'svg-export-context-theme-id',
		name: 'SvgExportContext.themeId → .colorMode',
		pattern: /\bthemeId\b/g,
		scope: 'member-access',
		note:
			"`SvgExportContext.themeId` renamed to `.colorMode` (type changed from string to `'dark' | 'light'`). Verify this is an SvgExportContext usage before renaming.",
		sectionRef: '07-svg-export',
	},

	// ── Removed constants (moved to display values) ────────────────────────────
	{
		kind: 'flag',
		id: 'font-families',
		name: 'FONT_FAMILIES removed',
		pattern: /\bFONT_FAMILIES\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note:
			'Removed. Font families are now resolved via display values. Override `ShapeUtil.getDefaultDisplayValues` or the matching OverlayUtil method.',
		sectionRef: '03-display-values',
	},
	{
		kind: 'flag',
		id: 'font-sizes',
		name: 'FONT_SIZES removed',
		pattern: /\bFONT_SIZES\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note: 'Removed. Resolve via display values.',
		sectionRef: '03-display-values',
	},
	{
		kind: 'flag',
		id: 'label-font-sizes',
		name: 'LABEL_FONT_SIZES removed',
		pattern: /\bLABEL_FONT_SIZES\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note: 'Removed. Resolve via display values.',
		sectionRef: '03-display-values',
	},
	{
		kind: 'flag',
		id: 'stroke-sizes',
		name: 'STROKE_SIZES removed',
		pattern: /\bSTROKE_SIZES\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note: 'Removed. Resolve via display values.',
		sectionRef: '03-display-values',
	},
	{
		kind: 'flag',
		id: 'text-props',
		name: 'TEXT_PROPS removed',
		pattern: /\bTEXT_PROPS\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note: 'Removed. Resolve via display values.',
		sectionRef: '03-display-values',
	},
	{
		kind: 'flag',
		id: 'arrow-label-font-sizes',
		name: 'ARROW_LABEL_FONT_SIZES removed',
		pattern: /\bARROW_LABEL_FONT_SIZES\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note: 'Removed. Resolve via display values.',
		sectionRef: '03-display-values',
	},

	// ── Asset system ───────────────────────────────────────────────────────────
	{
		kind: 'flag',
		id: 'asset-validator',
		name: 'assetValidator removed',
		pattern: /\bassetValidator\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor', '@tldraw/tlschema'],
		note:
			'Removed. Use `imageAssetValidator`, `videoAssetValidator`, or `bookmarkAssetValidator` for the specific asset type.',
		sectionRef: '06-asset-system',
	},
	{
		kind: 'flag',
		id: 'get-media-asset-info-partial',
		name: 'getMediaAssetInfoPartial removed',
		pattern: /\bgetMediaAssetInfoPartial\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			'Removed. Implement `AssetUtil.getAssetFromFile(file, assetId)` on a custom asset util instead. Note: the method takes `(file, assetId)`, not `(editor, file)`.',
		sectionRef: '06-asset-system',
	},
	{
		kind: 'flag',
		id: 'notify-if-file-not-allowed',
		name: 'notifyIfFileNotAllowed signature changed',
		pattern: /\bnotifyIfFileNotAllowed\s*\(/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			'Signature changed: `(file, options)` → `(editor, file, options)`. Pass `editor` as the first argument.',
		sectionRef: '06-asset-system',
	},
	{
		kind: 'flag',
		id: 'get-asset-info',
		name: 'getAssetInfo signature changed',
		pattern: /\bgetAssetInfo\s*\(/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			'Signature changed: `(file, options, assetId?)` → `(editor, file, assetId?)`. Return type changed to `Promise<TLAsset | null>` (no longer throws).',
		sectionRef: '06-asset-system',
	},

	// ── Label props ────────────────────────────────────────────────────────────
	{
		kind: 'flag',
		id: 'plain-text-label-props',
		name: 'PlainTextLabelProps property renames',
		pattern: /\bPlainTextLabelProps\b/g,
		scope: 'import',
		importedFrom: ['tldraw'],
		note:
			'Property renames on PlainTextLabelProps: `font` → `fontFamily`, `align` → `textAlign`, `fill` removed.',
		sectionRef: '08-label-props',
	},
	{
		kind: 'flag',
		id: 'rich-text-label-props',
		name: 'RichTextLabelProps property renames',
		pattern: /\bRichTextLabelProps\b/g,
		scope: 'import',
		importedFrom: ['tldraw'],
		note:
			'Property renames on RichTextLabelProps: `font` → `fontFamily`, `align` → `textAlign`, `fill` removed.',
		sectionRef: '08-label-props',
	},

	// ── Overlay slots in TLEditorComponents ────────────────────────────────────
	//
	// We use two complementary flags here:
	//   1. An import-scoped flag for `TLEditorComponents` / `TLComponents` so
	//      that any file that talks about the type at all gets a top-level
	//      "review for removed slots" signal (covers the variable-extracted
	//      case: `const components: TLEditorComponents = { ... }`).
	//   2. Slot-name flags scoped to `components={…}` literals on `<Tldraw>` —
	//      pinpoints the specific lines when you've inlined the literal.
	//
	// `SelectionBackground` is intentionally NOT listed below — that slot is
	// still a valid v5 slot.
	{
		kind: 'flag',
		id: 'tl-editor-components-type',
		name: 'TLEditorComponents type — review for removed slots',
		pattern: /\bTLEditorComponents\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			'Several slot keys (Brush, ZoomBrush, Scribble, SnapIndicator, Handle/Handles, SelectionForeground, CollaboratorHint, ShapeIndicator/ShapeIndicators) were removed in v5. Review every key in this file and migrate to the matching `OverlayUtil`. `SelectionBackground` is still valid.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'tl-components-type',
		name: 'TLComponents type — review for removed slots',
		pattern: /\bTLComponents\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			'Several slot keys were removed in v5. Review every key in this file and migrate removed slots to the matching `OverlayUtil`.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'slot-brush',
		name: 'TLEditorComponents.Brush removed',
		pattern: /\bBrush\s*:/g,
		scope: 'jsx-components-slot',
		note: 'Removed slot. Migrate to `BrushOverlayUtil` and pass via the `overlayUtils` prop.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'slot-zoom-brush',
		name: 'TLEditorComponents.ZoomBrush removed',
		pattern: /\bZoomBrush\s*:/g,
		scope: 'jsx-components-slot',
		note: 'Removed slot. Migrate to `ZoomBrushOverlayUtil`.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'slot-scribble',
		name: 'TLEditorComponents.Scribble removed',
		pattern: /\bScribble\s*:/g,
		scope: 'jsx-components-slot',
		note: 'Removed slot. Migrate to `ScribbleOverlayUtil`.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'slot-snap-indicator',
		name: 'TLEditorComponents.SnapIndicator removed',
		pattern: /\bSnapIndicator\s*:/g,
		scope: 'jsx-components-slot',
		note: 'Removed slot. Migrate to `SnapIndicatorOverlayUtil`.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'slot-handles',
		name: 'TLEditorComponents.Handle/Handles removed',
		pattern: /\bHandles?\s*:/g,
		scope: 'jsx-components-slot',
		note: 'Removed slots. Migrate to `ShapeHandleOverlayUtil`.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'slot-selection-foreground',
		name: 'TLEditorComponents.SelectionForeground removed',
		pattern: /\bSelectionForeground\s*:/g,
		scope: 'jsx-components-slot',
		note:
			'Removed slot. Migrate to `SelectionForegroundOverlayUtil`. Note: `SelectionBackground` is still a valid slot and does NOT need to migrate.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'slot-collaborator-hint',
		name: 'TLEditorComponents.CollaboratorHint removed',
		pattern: /\bCollaboratorHint\s*:/g,
		scope: 'jsx-components-slot',
		note: 'Removed slot. Migrate to `CollaboratorHintOverlayUtil`.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'slot-shape-indicator',
		name: 'TLEditorComponents.ShapeIndicator(s) removed',
		pattern: /\bShapeIndicators?\s*:/g,
		scope: 'jsx-components-slot',
		note:
			'Removed slots. Customize via `ShapeUtil.getIndicatorPath()` (returns `TLIndicatorPath | undefined`, not a string).',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'default-overlay-exports',
		name: 'Default* overlay component exports removed',
		pattern:
			/\bDefault(?:Brush|Scribble|SnapIndicator|Handle|SelectionForeground|CollaboratorHint|ShapeIndicator)\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note: 'Default* overlay component exports removed. Subclass the matching `OverlayUtil` instead.',
		sectionRef: '04-overlays',
	},
	{
		kind: 'flag',
		id: 'live-collaborators',
		name: 'LiveCollaborators removed',
		pattern: /\bLiveCollaborators\b/g,
		scope: 'import',
		importedFrom: ['tldraw', '@tldraw/editor'],
		note:
			'Removed. Collaborator overlays are now handled by `CollaboratorCursorOverlayUtil`, `CollaboratorBrushOverlayUtil`, `CollaboratorScribbleOverlayUtil`, and `CollaboratorHintOverlayUtil`.',
		sectionRef: '04-overlays',
	},
]
