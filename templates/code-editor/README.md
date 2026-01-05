<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png">
  <img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png">
</picture>

# tldraw code editor

A starter kit that features a code editor where you can write JavaScript to programmatically control the tldraw canvas. Perfect for learning the tldraw API, experimenting with code, and creating generative art.

## What is this?

This template provides a split-view interface with a code editor on the left and a tldraw canvas on the right. Write code to create shapes, and see the results instantly on the canvas.

Features:
- **Curated API** - Helper functions for common operations (createRect, createCircle, createText, etc.)
- **Syntax highlighting** - Code editor with JavaScript syntax highlighting
- **Example snippets** - Load pre-built examples to learn and experiment
- **Shape tracking** - Clear generated shapes without affecting hand-drawn content
- **Keyboard shortcuts** - Run code with Cmd/Ctrl+Enter
- **Persistent code** - Your code is saved between sessions

## Local development

To run this template locally:

```bash
yarn
yarn dev
```

Then open `http://localhost:5173/` in your browser.

## Quick start

1. Write JavaScript code in the left panel
2. Press **Run** or **Cmd/Ctrl+Enter** to execute
3. See shapes appear on the canvas
4. Use **Clear** to remove generated shapes
5. Load examples from the dropdown to learn more

## API reference

The following API is available in the code editor:

### Shape creation

| Function | Description | Example |
|----------|-------------|---------|
| `api.createRect(x, y, w, h, options?)` | Create a rectangle | `api.createRect(100, 100, 200, 150, { color: 'blue' })` |
| `api.createCircle(x, y, radius, options?)` | Create a circle | `api.createCircle(300, 200, 50, { color: 'red' })` |
| `api.createText(x, y, text, options?)` | Create text | `api.createText(100, 100, 'Hello!', { color: 'violet' })` |
| `api.createArrow(x1, y1, x2, y2, options?)` | Create an arrow | `api.createArrow(100, 100, 300, 200)` |

### Shape management

| Function | Description |
|----------|-------------|
| `api.clear()` | Clear all generated shapes (preserves hand-drawn) |
| `api.getAllShapes()` | Get all shapes on the canvas |
| `api.getGeneratedShapes()` | Get only generated shapes |

### Shape options

All creation functions accept an optional `options` object:

```javascript
{
  color: 'blue' | 'red' | 'green' | 'orange' | 'violet' | 'yellow' | ...,
  fill: 'none' | 'semi' | 'solid' | 'pattern',
  size: 's' | 'm' | 'l' | 'xl',
  font: 'draw' | 'sans' | 'serif' | 'mono',
  // ... and more
}
```

### Raw editor API

You also have access to the full tldraw `editor` instance:

```javascript
// Access all editor methods
editor.createShapes([...])
editor.getCurrentPageShapes()
editor.zoomToFit()
editor.select([shapeId])

// Important: Mark generated shapes with meta.generated = true
editor.createShapes([{
  type: 'geo',
  x: 100,
  y: 100,
  props: { w: 200, h: 150, geo: 'rectangle' },
  meta: { generated: true }  // Required for Clear to work!
}])
```

See the [tldraw editor API docs](https://tldraw.dev/reference/editor/Editor) for full details.

## Examples

The template includes several examples accessible via the dropdown:

- **Basic shapes** - Simple rectangle, circle, and text
- **Grid pattern** - Create a grid using loops
- **Random circles** - Generate random shapes with Math.random()
- **Connected nodes** - Rectangles with arrows between them
- **Spiral pattern** - Generative art with trigonometry
- **Using raw editor API** - Direct editor usage for advanced control

## How it works

### Shape tracking

Shapes created via the API are automatically marked with `meta.generated = true`. This allows the **Clear** button to remove only code-generated shapes while preserving anything you draw by hand.

If you use the raw `editor` API, remember to set this flag:

```javascript
editor.createShapes([{
  // ... shape properties
  meta: { generated: true }  // Important!
}])
```

### Code execution

Code is executed using `new Function()` in a controlled scope with only `editor` and `api` available. All operations are wrapped in `editor.run()` for atomic transactions.

### Persistence

Your code is automatically saved to localStorage and restored when you return. Hand-drawn shapes are also persisted using tldraw's built-in persistence.

## Security note

⚠️ This template executes arbitrary JavaScript code using `new Function()`. While safer than `eval()`, it still runs code in your browser context.

**Only use this template with code you trust.** Do not use with untrusted user input or in production environments where users can submit code.

This is intended for local development, learning, and experimentation only.

## Customization

### Upgrading to Monaco Editor

Want a full-featured VSCode-like editor? You can swap the textarea for Monaco:

```bash
yarn add @monaco-editor/react
```

Then update `CodeEditor.tsx` to use Monaco instead of the textarea.

### Adding resizable panels

Install react-resizable-panels:

```bash
yarn add react-resizable-panels
```

Then wrap the panels in `<PanelGroup>` and `<Panel>` components.

### Changing the layout

Edit `src/index.css` to adjust the split (currently 50/50). You can also change from horizontal to vertical:

```css
.editor-container {
  flex-direction: column; /* vertical split */
}
```

## Learn more

- [tldraw docs](https://tldraw.dev) - Official documentation
- [tldraw editor API](https://tldraw.dev/reference/editor/Editor) - Full editor reference
- [tldraw examples](https://tldraw.dev/examples) - More examples and tutorials
- [tldraw Discord](https://discord.gg/tldraw) - Community and support

## License

This template code is licensed under MIT. See [LICENSE.md](./LICENSE.md) for details.

The tldraw SDK is licensed under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md). Commercial licenses are available at [tldraw.dev](https://tldraw.dev).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distribution

You can find tldraw on npm [here](https://www.npmjs.com/package/tldraw?activeTab=versions).

## Community

Have questions or feedback? Join our [Discord](https://discord.gg/tldraw) or start a discussion on [GitHub](https://github.com/tldraw/tldraw/discussions).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).
