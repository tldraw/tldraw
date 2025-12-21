---
title: Extracting fonts from rich text
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - rich text
  - fonts
  - tiptap
  - visitor pattern
  - text rendering
---

# Extracting fonts from rich text

When a text shape contains bold or italic formatting, we need to load different font files. A shape with "Hello **world**" needs both the normal and bold variants. Rich text with mixed formatting requires multiple fonts, and we need to figure out which ones before we can render correctly.

The challenge is that rich text isn't stored as HTML or a flat string—it's a TipTap document tree. Each node can have marks (bold, italic, code), and those marks affect which font face we need. We traverse the tree, track the current font state, and collect all the fonts required.

## The visitor pattern

Rich text in tldraw is stored as a TipTap JSON structure. To extract fonts, we parse that JSON into a TipTap Node tree and recursively visit each node:

```typescript
export function getFontsFromRichText(
	editor: Editor,
	richText: TLRichText,
	initialState: RichTextFontVisitorState
) {
	const { tipTapConfig, addFontsFromNode } = editor.getTextOptions()
	const schema = getTipTapSchema(tipTapConfig)
	const rootNode = Node.fromJSON(schema, richText as JSONContent)

	const fonts = new Set<TLFontFace>()

	function addFont(font: TLFontFace) {
		fonts.add(font)
	}

	function visit(node: TiptapNode, state: RichTextFontVisitorState) {
		state = addFontsFromNode!(node, state, addFont)

		for (const child of node.children) {
			visit(child, state)
		}
	}

	visit(rootNode, initialState)

	return Array.from(fonts)
}
```

The `visit` function walks the tree. For each node, it calls `addFontsFromNode` to process marks and potentially add fonts to the set, then recurses into children. State flows down the tree—if a parent node is bold, that state passes to its children unless a child overrides it.

The `initialState` passed in sets the base font family (e.g., `tldraw_draw`), normal weight, and normal style. As we traverse, marks modify this state.

## State tracking

`RichTextFontVisitorState` is simple:

```typescript
export interface RichTextFontVisitorState {
	readonly family: string
	readonly weight: string
	readonly style: string
}
```

This tracks the current font context. When we encounter a bold mark, we create new state with `weight: 'bold'`. When we encounter an italic mark, we create new state with `style: 'italic'`. The code mark changes the family to `tldraw_mono`.

State is immutable. Each node processes marks, potentially creates new state, and passes that to its children:

```typescript
export function defaultAddFontsFromNode(
	node: Node,
	state: RichTextFontVisitorState,
	addFont: (font: TLFontFace) => void
) {
	// Process marks
	for (const mark of node.marks) {
		if (mark.type.name === 'bold' && state.weight !== 'bold') {
			state = { ...state, weight: 'bold' }
		}
		if (mark.type.name === 'italic' && state.style !== 'italic') {
			state = { ...state, style: 'italic' }
		}
		if (mark.type.name === 'code' && state.family !== 'tldraw_mono') {
			state = { ...state, family: 'tldraw_mono' }
		}
	}

	// Look up font in DefaultFontFaces
	const fontsForFamily = getOwnProperty(DefaultFontFaces, state.family)
	if (!fontsForFamily) return state

	const fontsForStyle = getOwnProperty(fontsForFamily, state.style)
	if (!fontsForStyle) return state

	const fontsForWeight = getOwnProperty(fontsForStyle, state.weight)
	if (!fontsForWeight) return state

	addFont(fontsForWeight)

	return state
}
```

We check each mark and update state if it changes. Then we look up the font in a hierarchical structure.

## Font lookup structure

Fonts are organized by family → style → weight:

```typescript
export interface TLDefaultFont {
	normal: {
		normal: TLFontFace
		bold: TLFontFace
	}
	italic: {
		normal: TLFontFace
		bold: TLFontFace
	}
}

export interface TLDefaultFonts {
	tldraw_draw: TLDefaultFont
	tldraw_sans: TLDefaultFont
	tldraw_serif: TLDefaultFont
	tldraw_mono: TLDefaultFont
}
```

This gives us 4 families × 2 styles × 2 weights = 16 total font faces.

For example, `tldraw_draw` has:

```typescript
tldraw_draw: {
	normal: {
		normal: {
			family: 'tldraw_draw',
			src: { url: 'tldraw_draw', format: 'woff2' },
			weight: 'normal',
		},
		bold: {
			family: 'tldraw_draw',
			src: { url: 'tldraw_draw_bold', format: 'woff2' },
			weight: 'bold',
		},
	},
	italic: {
		normal: {
			family: 'tldraw_draw',
			src: { url: 'tldraw_draw_italic', format: 'woff2' },
			weight: 'normal',
			style: 'italic',
		},
		bold: {
			family: 'tldraw_draw',
			src: { url: 'tldraw_draw_italic_bold', format: 'woff2' },
			weight: 'bold',
			style: 'italic',
		},
	},
}
```

The three-level lookup—`DefaultFontFaces[family][style][weight]`—maps directly to our state structure. If we're in a node with `family: 'tldraw_draw'`, `style: 'italic'`, `weight: 'bold'`, we navigate to `DefaultFontFaces.tldraw_draw.italic.bold` and get the font descriptor for the italic bold variant.

## Accumulating fonts

The visitor accumulates fonts in a `Set<TLFontFace>`:

```typescript
const fonts = new Set<TLFontFace>()

function addFont(font: TLFontFace) {
	fonts.add(font)
}
```

The Set provides automatic deduplication. If multiple nodes require the same font (e.g., two separate bold spans), we only add it once. At the end, we convert the Set to an array and return it.

## Shape implementations

Each shape type that supports rich text calls `getFontsFromRichText`. Here's the text shape:

```typescript
override getFontFaces(shape: TLTextShape) {
	return getFontsFromRichText(this.editor, shape.props.richText, {
		family: `tldraw_${shape.props.font}`,
		weight: 'normal',
		style: 'normal',
	})
}
```

The initial state uses the shape's base font (e.g., `tldraw_draw` if the user selected the draw font), normal weight, normal style. As we traverse the tree, marks modify this state to collect variants.

Geo shapes, arrow labels, and notes all follow the same pattern. Some shapes optimize for empty text:

```typescript
override getFontFaces(shape: TLGeoShape) {
	if (isEmptyRichText(shape.props.richText)) {
		return EMPTY_ARRAY
	}
	return getFontsFromRichText(this.editor, shape.props.richText, {
		family: `tldraw_${shape.props.font}`,
		weight: 'normal',
		style: 'normal',
	})
}
```

The empty check avoids TipTap parsing and tree traversal when there's no text. `EMPTY_ARRAY` is a shared constant—returning it means the cache can do reference equality checks.

## Why a visitor pattern

We could have flattened the rich text to plain text and extracted formatting spans, or converted to HTML and parsed that. But we already have TipTap as our rich text engine, and TipTap provides the Node structure.

The visitor pattern matches the tree structure. State flows naturally from parent to child. Marks compose—a node can be both bold and italic, and we handle that by processing marks sequentially and updating state.

The pattern is also extensible. If we add new marks (underline, strikethrough), we add cases to `addFontsFromNode`. If we support custom fonts, we pass a custom lookup structure. The core traversal doesn't change.

## Where this lives

- Font extraction: `/packages/editor/src/lib/utils/richText.ts`
- Default visitor: `/packages/tldraw/src/lib/utils/text/richText.ts`
- Font structure: `/packages/tldraw/src/lib/shapes/shared/defaultFonts.tsx`
- Shape implementations: `TextShapeUtil.tsx`, `GeoShapeUtil.tsx`, `ArrowShapeUtil.tsx`, `NoteShapeUtil.tsx`

The visitor collects fonts; the FontManager (covered in other articles) handles loading them in batches.
