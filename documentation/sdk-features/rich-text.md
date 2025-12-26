---
title: Rich text
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - rich-text
  - text
  - TipTap
  - ProseMirror
  - formatting
  - editor
  - markdown
  - shapes
status: published
date: 12/20/2025
order: 19
---

Rich text enables formatted text content within tldraw shapes. The system provides inline formatting like bold, italic, code, and highlighting, plus structural features like lists and links. Text, note, geo, and arrow label shapes all support rich text editing through an integrated text editor.

The implementation uses TipTap, a React wrapper around ProseMirror, as the rich text engine. TipTap provides a document-based content model where text exists as structured JSON rather than plain strings. This approach enables reliable formatting operations, custom extensions, and consistent serialization across different contexts.

## How it works

Rich text in tldraw follows a document structure where content is represented as a JSON tree. The root document contains paragraphs, and paragraphs contain text nodes with optional formatting marks. This structure aligns with TipTap's document model and provides a foundation for extensibility.

### Document structure

A rich text document has three main components: the document root, content blocks, and text nodes with marks.

```typescript
const richText: TLRichText = {
	type: 'doc',
	content: [
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'Hello ' },
				{
					type: 'text',
					text: 'world',
					marks: [{ type: 'bold' }],
				},
			],
		},
	],
}
```

The `type` field identifies the node kind. The `content` array holds child nodes. Text nodes include a `marks` array that contains formatting information. This nested structure allows arbitrary combinations of formatting and content organization.

### Converting between formats

The `toRichText` helper converts plain text strings to rich text documents. Each line becomes a separate paragraph, preserving the original text structure.

```typescript
import { toRichText } from '@tldraw/editor'

const richText = toRichText('First line\nSecond line')
// Creates two paragraphs
```

To extract plain text from a rich text document, use `renderPlaintextFromRichText`. This strips all formatting and returns the text content with line breaks preserved.

```typescript
import { renderPlaintextFromRichText } from 'tldraw'

const text = renderPlaintextFromRichText(editor, shape.props.richText)
// Returns: "First line\nSecond line"
```

For HTML output, `renderHtmlFromRichText` generates formatted HTML that preserves all styling and structure. This is useful for rendering rich text in non-editor contexts or exporting content.

```typescript
import { renderHtmlFromRichText } from 'tldraw'

const html = renderHtmlFromRichText(editor, shape.props.richText)
// Returns: '<p dir="auto">First line</p><p dir="auto">Second line</p>'
```

## TipTap integration

TipTap provides the rich text editing experience. The editor appears when users double-click text shapes or press Enter while a text shape is selected. The integration handles focus management, keyboard shortcuts, and formatting commands automatically.

### Default extensions

The `tipTapDefaultExtensions` array includes TipTap's StarterKit plus additional customizations for tldraw's needs. The StarterKit provides basic formatting like bold, italic, and lists. Additional extensions add code highlighting and custom keyboard behavior.

```typescript
export const tipTapDefaultExtensions: Extensions = [
	StarterKit.configure({
		blockquote: false,
		codeBlock: false,
		horizontalRule: false,
		link: {
			openOnClick: false,
			autolink: true,
		},
	}),
	Highlight,
	KeyboardShiftEnterTweakExtension,
	extensions.TextDirection.configure({ direction: 'auto' }),
]
```

The configuration disables blockquotes, code blocks, and horizontal rules to keep the interface focused on inline formatting. Links are configured to not open on click during editing, preventing accidental navigation. Text direction is set to automatic, allowing proper rendering of right-to-left languages.

### Custom extensions

Add custom TipTap extensions through the `textOptions` prop on the Tldraw component. This allows extending the rich text editor with new formatting options, custom keyboard shortcuts, or specialized behavior.

```typescript
import { Mark, mergeAttributes } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

const CustomMark = Mark.create({
  name: 'custom',
  parseHTML() {
    return [{ tag: 'span.custom' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ class: 'custom' }, HTMLAttributes), 0]
  },
  addCommands() {
    return {
      toggleCustom: () => ({ commands }) => commands.toggleMark(this.name),
    }
  },
})

const textOptions = {
  tipTapConfig: {
    extensions: [StarterKit, CustomMark],
  },
}

<Tldraw textOptions={textOptions} />
```

Extensions must be provided as a complete list. If you include custom extensions, also include the default extensions you want to preserve. The example above shows replacing the entire extension list, which means you control exactly what features are available.

### Rich text toolbar

The rich text toolbar appears when editing text shapes. It provides quick access to formatting commands like bold, italic, and lists. The toolbar updates dynamically to show which formats are active at the current cursor position.

Customize the toolbar by overriding the `RichTextToolbar` component. Access the TipTap editor instance through `editor.getRichTextEditor()` to execute formatting commands.

```typescript
import { DefaultRichTextToolbar, TLComponents, useEditor, useValue } from 'tldraw'

const components: TLComponents = {
  RichTextToolbar: () => {
    const editor = useEditor()
    const textEditor = useValue('textEditor', () => editor.getRichTextEditor(), [editor])

    return (
      <DefaultRichTextToolbar>
        <button onClick={() => textEditor?.chain().focus().toggleBold().run()}>
          B
        </button>
      </DefaultRichTextToolbar>
    )
  },
}

<Tldraw components={components} />
```

The `DefaultRichTextToolbar` component provides the default toolbar layout. Nest custom buttons inside it to extend the toolbar, or replace it entirely for complete control over the formatting interface.

## Shapes with rich text

Four shape types support rich text: text shapes, note shapes, geo shapes, and arrow labels. Each shape renders rich text through the `RichTextLabel` component, which handles both display and editing modes.

### Text shapes

Text shapes are standalone text blocks that can be placed anywhere on the canvas. They support auto-sizing, where the shape grows to fit content, or fixed-width mode with text wrapping.

```typescript
editor.createShape({
	type: 'text',
	x: 100,
	y: 100,
	props: {
		richText: toRichText('Sample text'),
		font: 'draw',
		size: 'm',
		textAlign: 'start',
		autoSize: true,
	},
})
```

The `autoSize` prop controls whether the shape expands automatically. When true, text never wraps and the shape width matches the content width. When false, text wraps at the shape's width boundary.

### Note shapes

Note shapes display text on colored backgrounds with a note-like appearance. They always have fixed dimensions and wrap text to fit within those bounds.

```typescript
editor.createShape({
	type: 'note',
	x: 100,
	y: 100,
	props: {
		richText: toRichText('Note content'),
		font: 'draw',
		size: 'm',
		color: 'yellow',
	},
})
```

Notes are useful for annotations, comments, or highlighting specific information on the canvas. The colored background provides visual distinction from regular text shapes.

### Geo shapes

Geo shapes include rectangles, ellipses, and other geometric forms that can contain text labels. The text appears centered within the shape bounds with configurable alignment.

```typescript
editor.createShape({
	type: 'geo',
	x: 100,
	y: 100,
	props: {
		geo: 'rectangle',
		w: 200,
		h: 100,
		richText: toRichText('Label'),
		font: 'draw',
		size: 'm',
		align: 'middle',
		verticalAlign: 'middle',
	},
})
```

The `align` and `verticalAlign` props control text positioning within the shape. Text wraps when it exceeds the available width minus padding.

### Arrow labels

Arrows can have a text label that appears along the arrow path. The label is editable like other rich text and moves with the arrow when the arrow is repositioned.

```typescript
editor.createShape({
	type: 'arrow',
	x: 100,
	y: 100,
	props: {
		start: { x: 0, y: 0 },
		end: { x: 200, y: 0 },
		richText: toRichText('Arrow label'),
		font: 'draw',
		size: 'm',
	},
})
```

Arrow labels automatically position themselves based on the arrow's path and curvature. The label remains readable regardless of arrow orientation.

## Font management

Rich text can include multiple fonts and font styles within a single text block. The `FontManager` tracks which fonts are needed and ensures they load before rendering. This prevents layout shifts that occur when fonts load after initial render.

The `getFontsFromRichText` function traverses a rich text document and collects all required font faces based on the text content and formatting marks.

```typescript
import { getFontsFromRichText } from '@tldraw/editor'

const fonts = getFontsFromRichText(editor, richText, {
	family: 'tldraw_draw',
	weight: 'normal',
	style: 'normal',
})
```

The function accepts an initial font state representing the base font. It walks the document tree, examining marks on text nodes to determine when bold or italic variants are needed. When code marks are present, it switches to the monospace font family.

### Custom font resolution

Override the font resolution logic by providing a custom `addFontsFromNode` function through `textOptions`. This allows using custom fonts or alternative font mapping strategies.

```typescript
const textOptions = {
	tipTapConfig: {
		extensions: [StarterKit],
	},
	addFontsFromNode: (node, state, addFont) => {
		// Custom font resolution logic
		if (node.marks.some((m) => m.type.name === 'bold')) {
			state = { ...state, weight: 'bold' }
		}
		// Call addFont() with required font faces
		return state
	},
}
```

The function receives the current node, font state, and a callback to register required fonts. It returns the updated state for child node processing. This pattern allows walking the document tree while maintaining font context.

## Programmatic formatting

Apply formatting to rich text programmatically by accessing the TipTap editor instance. This enables bulk operations like applying formatting to multiple shapes or implementing custom formatting commands.

```typescript
const textEditor = editor.getRichTextEditor()
if (textEditor) {
	// Make all selected text bold
	textEditor.chain().focus().selectAll().toggleBold().run()
}
```

The chain API allows composing multiple operations. Each command returns a chainable object, and `run()` executes the composed command sequence.

For operations outside the editing context, manipulate the rich text JSON directly. This is useful when programmatically generating or transforming content.

```typescript
function makeAllTextBold(richText: TLRichText): TLRichText {
	const content = richText.content.map((paragraph) => {
		if (!paragraph.content) return paragraph

		return {
			...paragraph,
			content: paragraph.content.map((node) => {
				if (node.type !== 'text') return node

				const marks = node.marks || []
				if (marks.some((m) => m.type === 'bold')) return node

				return {
					...node,
					marks: [...marks, { type: 'bold' }],
				}
			}),
		}
	})

	return { ...richText, content }
}
```

This approach requires understanding the TipTap document structure but provides precise control over content transformation.

## Measurement and rendering

Rich text measurement uses the same system as plain text, with HTML rendering replacing plain text content. The `TextManager` measures rich text by generating HTML, applying it to the measurement element, and reading the computed dimensions.

```typescript
import { renderHtmlFromRichTextForMeasurement } from 'tldraw'

const html = renderHtmlFromRichTextForMeasurement(editor, richText)
// Returns HTML wrapped in measurement container
```

The measurement system accounts for formatting that affects layout, like bold text or lists. Font loading completes before measurement to ensure accurate dimensions.

For SVG export, the `RichTextSVG` component renders rich text as a foreignObject element. This preserves formatting and layout in exported images.

## Extension points

The rich text system provides several extension points for customization.

### Custom extensions

Add TipTap extensions to introduce new formatting options or behavior. Extensions can define new marks, nodes, keyboard shortcuts, or commands.

### Custom toolbar

Replace or extend the rich text toolbar to provide different formatting controls or a different user interface.

### Font resolution

Override font resolution to use custom fonts or implement alternative font loading strategies.

### Text options

The `textOptions` prop accepts a `tipTapConfig` object that passes through to TipTap's editor configuration. This provides access to all TipTap configuration options.

```typescript
const textOptions = {
  tipTapConfig: {
    extensions: [...],
    editorProps: {
      attributes: {
        class: 'custom-editor',
      },
    },
  },
  addFontsFromNode: customFontResolver,
}
```

## Examples

- **[Rich text with custom extension](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/rich-text-custom-extension)** - Adding a custom TipTap extension and toolbar button.

- **[Rich text with font extensions](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/rich-text-font-extensions)** - Extending the editor with font-family and font-size controls.

- **[Format rich text on multiple shapes](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/rich-text-on-multiple-shapes)** - Applying formatting to multiple selected shapes programmatically.
