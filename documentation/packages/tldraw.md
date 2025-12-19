---
title: '@tldraw/tldraw'
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - tldraw
  - sdk
  - complete
  - ui
---

The `@tldraw/tldraw` package is the complete "batteries included" SDK. It builds on `@tldraw/editor` to provide a fully-featured drawing application with default shapes, tools, UI components, and external content handling.

## Overview

This package provides everything needed to add a complete infinite canvas to your application:

- **12 default shapes**: geo, draw, text, arrow, note, frame, image, video, embed, bookmark, highlight, line
- **Full toolset**: select, hand, draw, eraser, arrow, text, note, laser, zoom, frame, and shape-specific tools
- **Complete UI**: toolbar, menus, style panel, pages panel, zoom controls, context menus
- **External content**: paste, drag-and-drop, embeds, bookmarks, image/video handling
- **Responsive design**: adapts to mobile and desktop

Most applications should use this package rather than `@tldraw/editor` directly.

## Installation

```bash
npm install tldraw
```

Import both the component and CSS:

```typescript
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
```

## Basic usage

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw />
		</div>
	)
}
```

This renders a complete, working editor with all default functionality.

## Accessing the Editor

Use the `onMount` callback or `useEditor` hook:

```tsx
// Via onMount
;<Tldraw
	onMount={(editor) => {
		// Editor is ready
		editor.createShape({ type: 'geo', x: 100, y: 100 })
	}}
/>

// Via hook (inside Tldraw children)
function MyComponent() {
	const editor = useEditor()
	return <button onClick={() => editor.zoomIn()}>Zoom In</button>
}

;<Tldraw>
	<MyComponent />
</Tldraw>
```

## Default shapes

The SDK includes these shape types:

| Shape       | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| `geo`       | Rectangles, ellipses, triangles, and other geometric shapes |
| `draw`      | Freehand drawing strokes                                    |
| `text`      | Text labels                                                 |
| `arrow`     | Arrows with bindings to other shapes                        |
| `note`      | Sticky notes with text                                      |
| `frame`     | Container frames for grouping                               |
| `line`      | Multi-point lines                                           |
| `highlight` | Highlighter strokes                                         |
| `image`     | Uploaded or pasted images                                   |
| `video`     | Video files                                                 |
| `embed`     | YouTube, Figma, and other embeds                            |
| `bookmark`  | URL bookmarks with previews                                 |

### Creating shapes programmatically

```typescript
// Create a rectangle
editor.createShape({
	type: 'geo',
	x: 100,
	y: 100,
	props: {
		w: 200,
		h: 100,
		geo: 'rectangle',
		color: 'blue',
		fill: 'solid',
	},
})

// Create a text label
editor.createShape({
	type: 'text',
	x: 100,
	y: 300,
	props: {
		text: 'Hello world',
		size: 'l',
		font: 'sans',
	},
})

// Create an arrow
editor.createShape({
	type: 'arrow',
	x: 100,
	y: 400,
	props: {
		start: { x: 0, y: 0 },
		end: { x: 200, y: 100 },
	},
})
```

## Default tools

| Tool     | Description                         | Shortcut                   |
| -------- | ----------------------------------- | -------------------------- |
| `select` | Select and manipulate shapes        | V                          |
| `hand`   | Pan the canvas                      | H                          |
| `draw`   | Freehand drawing                    | D                          |
| `eraser` | Erase shapes                        | E                          |
| `arrow`  | Draw arrows                         | A                          |
| `text`   | Add text labels                     | T                          |
| `note`   | Add sticky notes                    | N                          |
| `laser`  | Temporary pointer for presentations | K                          |
| `frame`  | Create frames                       | F                          |
| `geo`    | Draw geometric shapes               | R (rectangle), O (ellipse) |

### Switching tools

```typescript
editor.setCurrentTool('draw')
editor.setCurrentTool('select')

// With tool-specific options
editor.setCurrentTool('geo')
editor.setStyleForNextShapes('geo', 'ellipse')
```

## UI components

The Tldraw component includes a complete UI:

```
┌─────────────────────────────────────────────────────────┐
│ [Menu]  [Undo] [Redo]           [Share] [Style Panel] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                      Canvas                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [Select] [Hand] [Draw] ... [Geo ▼]    [Pages] [Zoom]  │
└─────────────────────────────────────────────────────────┘
```

### Hiding UI elements

```tsx
<Tldraw
	hideUi={false} // Hide all UI
	components={{
		Toolbar: null, // Hide specific components
		StylePanel: null,
	}}
/>
```

### Customizing UI components

Override any UI component:

```tsx
<Tldraw
	components={{
		Toolbar: MyCustomToolbar,
		StylePanel: MyCustomStylePanel,
		MainMenu: MyCustomMenu,
	}}
/>
```

See the component override system below for details.

## Customization

### Adding custom shapes

Extend the default shapes with your own:

```tsx
import { Tldraw, TLBaseShape, ShapeUtil } from 'tldraw'

// Define shape type
type CardShape = TLBaseShape<'card', { title: string }>

// Create ShapeUtil
class CardShapeUtil extends ShapeUtil<CardShape> {
	static override type = 'card' as const

	getDefaultProps() {
		return { title: 'New Card' }
	}

	getGeometry(shape: CardShape) {
		return new Rectangle2d({ width: 200, height: 100, isFilled: true })
	}

	component(shape: CardShape) {
		return <div className="card">{shape.props.title}</div>
	}

	indicator(shape: CardShape) {
		return <rect width={200} height={100} />
	}
}

// Register with Tldraw
;<Tldraw shapeUtils={[CardShapeUtil]} />
```

### Adding custom tools

```tsx
import { Tldraw, StateNode } from 'tldraw'

class StampTool extends StateNode {
	static override id = 'stamp'

	onPointerDown() {
		const point = this.editor.inputs.currentPagePoint
		this.editor.createShape({
			type: 'card',
			x: point.x - 100,
			y: point.y - 50,
		})
	}
}

;<Tldraw
	tools={[StampTool]}
	overrides={{
		tools(editor, tools) {
			tools.stamp = {
				id: 'stamp',
				icon: 'star',
				label: 'Stamp',
				kbd: 's',
				onSelect() {
					editor.setCurrentTool('stamp')
				},
			}
			return tools
		},
	}}
/>
```

### Overriding actions

Customize built-in actions:

```tsx
<Tldraw
	overrides={{
		actions(editor, actions) {
			// Modify existing action
			const originalDelete = actions['delete']
			actions['delete'] = {
				...originalDelete,
				onSelect() {
					if (confirm('Delete shapes?')) {
						originalDelete.onSelect()
					}
				},
			}
			return actions
		},
	}}
/>
```

## Component override system

Every UI component can be replaced:

```tsx
<Tldraw
	components={{
		// Canvas components
		Background: MyBackground,
		Grid: MyGrid,
		Cursor: MyCursor,

		// UI components
		Toolbar: MyToolbar,
		StylePanel: MyStylePanel,
		MainMenu: MyMainMenu,
		PageMenu: MyPageMenu,
		NavigationPanel: MyNavPanel,
		ZoomMenu: MyZoomMenu,

		// Set to null to hide
		Minimap: null,
		HelpMenu: null,
	}}
/>
```

### Available component overrides

**Canvas overlays:**

- `Background` - Canvas background
- `Grid` - Dot/line grid
- `Cursor` - Mouse cursor
- `Brush` - Selection brush
- `SelectionBackground` / `SelectionForeground` - Selection box
- `Handles` - Resize/rotate handles
- `ShapeIndicators` - Shape hover/selection indicators

**UI panels:**

- `Toolbar` - Bottom toolbar
- `StylePanel` - Right-side style controls
- `MainMenu` - Top-left menu
- `ActionsMenu` - Actions dropdown
- `QuickActions` - Quick action buttons
- `PageMenu` - Page selector
- `NavigationPanel` - Zoom and minimap
- `ZoomMenu` - Zoom controls
- `Minimap` - Canvas minimap
- `HelpMenu` - Help dropdown
- `DebugMenu` - Debug panel

## External content handling

The SDK handles external content automatically:

### Images and videos

Paste or drag images/videos onto the canvas. They're converted to shapes with associated assets.

```typescript
// Configure asset handling
<Tldraw
  onMount={(editor) => {
    editor.registerExternalAssetHandler('file', async ({ file }) => {
      // Upload to your server
      const url = await uploadFile(file)
      return {
        id: AssetRecordType.createId(),
        type: 'image',
        props: { src: url, w: 100, h: 100, name: file.name },
      }
    })
  }}
/>
```

### URLs and bookmarks

Paste URLs to create bookmark shapes with previews:

```typescript
editor.registerExternalAssetHandler('url', async ({ url }) => {
	const metadata = await fetchMetadata(url)
	return {
		id: AssetRecordType.createId(),
		type: 'bookmark',
		props: {
			src: url,
			title: metadata.title,
			description: metadata.description,
			image: metadata.image,
		},
	}
})
```

### Embeds

YouTube, Figma, Google Maps, and other services create embed shapes automatically when pasting URLs.

## Persistence

### Local storage

Enable automatic persistence:

```tsx
<Tldraw persistenceKey="my-document" />
```

The document saves to IndexedDB automatically.

### Custom persistence

Handle persistence yourself:

```tsx
<Tldraw
	onMount={(editor) => {
		// Load initial data
		const saved = loadFromServer()
		if (saved) {
			editor.store.loadSnapshot(saved)
		}

		// Save on changes
		editor.store.listen(
			() => {
				const snapshot = editor.store.getSnapshot()
				saveToServer(snapshot)
			},
			{ scope: 'document' }
		)
	}}
/>
```

## Collaboration

For multiplayer, use the `@tldraw/sync` package:

```tsx
import { Tldraw } from 'tldraw'
import { useSyncDemo } from '@tldraw/sync'

function App() {
	const store = useSyncDemo({ roomId: 'my-room' })

	return <Tldraw store={store} />
}
```

See the [@tldraw/sync](./sync.md) documentation for details.

## Configuration options

| Prop                     | Type       | Description               |
| ------------------------ | ---------- | ------------------------- |
| `store`                  | `TLStore`  | External store (for sync) |
| `persistenceKey`         | `string`   | Key for local persistence |
| `initialState`           | `string`   | Initial tool to select    |
| `autoFocus`              | `boolean`  | Focus editor on mount     |
| `hideUi`                 | `boolean`  | Hide all UI               |
| `inferDarkMode`          | `boolean`  | Match system dark mode    |
| `acceptedImageMimeTypes` | `string[]` | Allowed image types       |
| `acceptedVideoMimeTypes` | `string[]` | Allowed video types       |
| `maxImageDimension`      | `number`   | Max image size            |
| `maxAssetSize`           | `number`   | Max file size             |

## Styling and theming

### Dark mode

```tsx
;<Tldraw inferDarkMode /> // Follow system preference

// Or set explicitly
editor.user.updateUserPreferences({ colorScheme: 'dark' })
```

### CSS customization

Override CSS custom properties:

```css
.tl-theme__light {
	--color-background: #f5f5f5;
	--color-text: #1a1a1a;
}

.tl-theme__dark {
	--color-background: #1a1a1a;
	--color-text: #f5f5f5;
}
```

## Key files

- packages/tldraw/src/lib/Tldraw.tsx - Main component
- packages/tldraw/src/lib/TldrawUi.tsx - UI system
- packages/tldraw/src/lib/defaultShapeUtils.ts - Default shape implementations
- packages/tldraw/src/lib/defaultTools.ts - Default tool implementations
- packages/tldraw/src/lib/defaultExternalContentHandlers.ts - Paste/drop handlers
- packages/tldraw/src/lib/ui/ - UI component implementations

## Related

- [Architecture overview](../overview/architecture-overview.md) - SDK architecture
- [@tldraw/editor](./editor.md) - Core editor package
- [@tldraw/sync](./sync.md) - Multiplayer integration
- [Creating custom shapes](../guides/custom-shapes.md) - Shape tutorial
- [Creating custom tools](../guides/custom-tools.md) - Tool tutorial
- [UI customization](../guides/ui-customization.md) - Customization guide
