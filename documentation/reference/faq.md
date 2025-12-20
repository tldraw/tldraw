# Frequently asked questions

## Getting started

### How do I run code when the editor first mounts?

Use the `Tldraw` component's `onMount` callback. See [this example](https://tldraw.dev/examples/editor-api/api) for more about using the editor API.

```tsx
<Tldraw
	onMount={(editor) => {
		editor.selectAll()
	}}
/>
```

### Should I use `tldraw` or `@tldraw/editor`?

Use `tldraw` unless you need a minimal canvas engine. The `tldraw` package includes 12 default shapes, a complete toolbar, text editing, image/video support, responsive UI, and keyboard shortcuts—everything you need for a production editor. `@tldraw/editor` is just the core canvas with no shapes or UI, requiring you to build everything yourself. Start with `tldraw` and customize it by overriding components or adding custom shapes.

```tsx
// Most apps should use this
import { Tldraw } from 'tldraw'
;<Tldraw />

// Only use editor if you need minimal/custom UI
import { TldrawEditor } from '@tldraw/editor'
```

### How do I set up tldraw with Next.js?

Use the Next.js template via `npx create-tldraw my-app` and select the Next.js option. The template provides an App Router setup with tldraw configured as a client component. Add the `'use client'` directive at the top of your page component and import both the component and styles:

```tsx
'use client'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function Page() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw />
		</div>
	)
}
```

### Can I use the tldraw SDK with Vue, Angular, or another framework?

Yes. The SDK's main export (`<Tldraw>`) is a regular React component. To render it in a different framework, you would use your framework's regular method of rendering React components. For example, in Vue you would use a [Vue connector](https://dev.to/amirkian007/how-to-render-react-components-in-vue-1e0f). In Angular, you would use an [Angular wrapper component](https://web-world.medium.com/how-to-use-react-web-components-in-angular-b3ac7e39fd17).

### How do I persist my document data?

There are three approaches depending on your needs:

1. **`persistenceKey`** - Simplest option for auto-saving to browser storage:

```tsx
<Tldraw persistenceKey="my-app-v1" />
```

2. **Snapshots** - When you need manual control or want to save to a backend:

```tsx
<Tldraw
	snapshot={snapshot}
	onMount={(editor) => {
		// Save periodically or on specific events
		const data = editor.store.getSnapshot()
		saveToBackend(data)
	}}
/>
```

3. **Sync store** - For multiplayer, where sync handles persistence:

```tsx
const store = useSync({ uri: 'wss://...' })
<Tldraw store={store.store} />
```

Don't mix approaches—pick one based on your needs.

### Can I use `useEditor` outside of the Tldraw React tree?

Not directly. `useEditor` relies on the Tldraw React context. If you need to access the editor from other parts of your app, hoist the editor instance on mount and share it yourself.

```tsx
import { Tldraw, Editor } from 'tldraw'
import { createContext, useContext, useState } from 'react'

const EditorCtx = createContext<Editor | null>(null)

export function useMyEditor() {
	return useContext(EditorCtx)
}

export default function App() {
	const [editor, setEditor] = useState<Editor | null>(null)
	return (
		<EditorCtx.Provider value={editor}>
			<Tldraw onMount={(ed) => setEditor(ed)} />
			{/* Anywhere in your app (even outside Tldraw's subtree) */}
			{editor && <SomeComponentNeedingEditor />}
		</EditorCtx.Provider>
	)
}

function SomeComponentNeedingEditor() {
	const editor = useMyEditor()
	return <div>hello</div>
}
```

---

## Editor API

### What does `editor.complete()` do?

It ends the current tool interaction by invoking the tool state machine's `onComplete` callback. In `EditingShape`, it finalizes the edit and returns focus to the canvas or shape.

**Details:**

- Triggers the editor's `complete` event and routes to the active tool state's `onComplete` handler.
- Typical effects include: committing the current operation (e.g. finish drawing, end transform), clearing ephemeral UI, and transitioning the tool back to its idle or next state.
- For `EditingShape` (Select tool child state): calls its `onComplete`, which exits the editing state, commits text/shape changes, and restores selection/focus to the canvas or the edited shape.

```tsx
// Example: end whatever the current tool is doing
editor.complete()
```

### How do I turn on/off readonly mode?

For client-side, see [this example](https://tldraw.dev/examples/basic/readonly). For read-only in multiplayer, set the [`isReadonly` property](https://tldraw.dev/reference/sync-core/TLSocketRoom#handleSocketConnect).

### How do I change the grid size?

To change the spacing of the grid, use `editor.updateDocumentSettings` to configure the `gridSize` property. See the [API reference](https://tldraw.dev/reference/editor/Editor#updateDocumentSettings) for more info.

To change the appearance of the grid, set the `gridSteps` option. See the [Editor options example](https://tldraw.dev/examples/custom-options) and the [API reference](https://tldraw.dev/reference/editor/TldrawOptions) for more info.

### How do I convert screen coordinates to canvas coordinates?

Use `screenToPage()` to convert mouse event coordinates to canvas coordinates. This accounts for the viewport position, zoom level, and camera position:

```tsx
editor.on('pointer-down', (event) => {
	const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY })
	editor.createShape({ type: 'geo', x: pagePoint.x, y: pagePoint.y, props: { w: 100, h: 100 } })
})
```

### How do I undo/redo multiple changes as a single step?

Use marks to define stopping points for undo/redo operations. Create a mark before making changes, and all subsequent changes are grouped together:

```tsx
editor.markHistoryStoppingPoint('my-operation')
editor.updateShape({ id: shape1.id, ... })
editor.updateShape({ id: shape2.id, ... })
// editor.undo() will now revert both changes at once
```

### How do I animate shape properties?

Use `animateShape()` with easing functions to create smooth transitions:

```tsx
import { EASINGS } from 'tldraw'

editor.animateShape(
	{ id: shape.id, type: 'geo', x: 200, y: 100 },
	{ animation: { duration: 500, easing: EASINGS.easeInOutCubic } }
)
```

Animations respect user animation speed preferences and are interrupted when users directly manipulate shapes.

### How do I get the bounds of selected shapes in screen space?

Use `getSelectionScreenBounds()` for axis-aligned bounds or `getSelectionRotatedScreenBounds()` to preserve rotation. These account for camera zoom and pan:

```tsx
const screenBounds = editor.getSelectionScreenBounds()
if (screenBounds) {
	// Position a DOM overlay at the selection
	overlay.style.left = `${screenBounds.x}px`
	overlay.style.top = `${screenBounds.y}px`
}
```

### How do I listen/hook into events in tldraw?

You can listen for events as they happen and react to them using [store events](https://examples.tldraw.com/store-events).

There are also other types of events:

- [Canvas events](https://examples.tldraw.com/canvas-events)
- [UI events](https://examples.tldraw.com/ui-events)

### How do I access the editor's properties reactively?

The editor is built using our custom signals library, [signia](https://signia.tldraw.dev/). To reactively get values from the editor (or any other signal), you can either wrap an entire function in the `track()` function, or use `useValue` or `useReactor` to get specific values.

See the [react bindings page](https://signia.tldraw.dev/docs/react-bindings) of the signia docs for more info.

### What's the difference between Atoms and EditorAtoms?

An `Atom` is a global reactive state container that's shared across your entire application, while an `EditorAtom` is scoped to a specific editor instance, giving each editor its own independent copy of that state. This means if you have multiple tldraw editors on the same page or navigate between pages, EditorAtoms prevent state from leaking between editors, and they're automatically cleaned up when an editor is destroyed.

### How can I track a subset of shapes?

A simple approach is to use `editor.getCurrentPageShapes()` if you only care about shapes on the current page.

If you don't want to filter by the current page you can create a reactive query for all shapes:

```tsx
const shapes$ = editor.store.query.records('shape')
```

Or if you only care about shapes of one type there is a limited filtering system:

```tsx
const shapes$ = editor.store.query.records('shape', () => ({ type: { eq: 'image' } }))
```

Then in your computed you can call `shapes$.get()` to get the array of shapes. Be careful to make sure you only create the query object once!

---

## Shapes

### How do I make a custom shape clickable?

By default, custom shapes have `pointer-events: none`. When you click on a shape, the event passes through the shape onto the canvas, and then the editor uses the geometry system to detect what you've clicked on.

To make your custom shape interactive in a normal HTML way, you'll need to:

- Set `pointer-events` to `all` on your shape container
- Run `stopPropagation` on pointer down to stop the event from reaching the canvas

```tsx
export class MyCustomShape {
	// ...
	component() {
		return (
			<HTMLContainer style={{ pointerEvents: 'all' }} onPointerDown={stopEventPropagation}>
				<button>Click me</button>
			</HTMLContainer>
		)
	}
}
```

### How do I create an editable shape?

Use `setEditingShape` to put a shape into edit mode (like when you double-click text to edit it).

See the [editable shape example](https://tldraw.dev/examples/shapes/editable-shape) for a complete implementation.

### How do I customize built-in shapes?

We currently don't have a good solution for customizing built-in shapes. There are two things you can try:

1. Create a new custom shape and copy all the code related to it.
2. Use the [side effect handlers](https://tldraw.dev/docs/editor#Side-effects) to customize certain aspects of the functionality.

### How do I keep shapes always at the front/back?

You can manually keep the shape(s) at the front or back using the editor's z-index methods.

Alternatively, you might be able to achieve what you want by placing components in front of the canvas, as shown by the [Things on the canvas example](https://tldraw.dev/examples/ui/things-on-the-canvas).

### How do I have a parent shape clip/mask its children?

Take a look at using the Frame shape to achieve this effect.

### How do I change the default line thickness or font size?

You can customize the default values by modifying `STROKE_SIZES` or `FONT_SIZES` constants.

### How do I create a custom binding between shapes?

Define a binding type, create a `BindingUtil` class that handles lifecycle events, and register it with the editor. Bindings are useful for creating relationships between shapes (like arrows connecting to other shapes):

```tsx
class ReferenceBindingUtil extends BindingUtil<ReferenceBinding> {
	static override type = 'reference' as const

	onAfterChangeToShape({ binding, shapeAfter }) {
		// Update the "from" shape when the "to" shape changes
		const fromShape = this.editor.getShape(binding.fromId)
		if (!fromShape) return
		// Apply updates based on shapeAfter...
	}
}
```

### How do I validate custom shape properties?

Use the `@tldraw/validate` library with `T` validators to define your shape's expected props. The store automatically validates records on write:

```tsx
import { T, ShapeUtil, type RecordProps } from 'tldraw'

class MyShapeUtil extends ShapeUtil<MyShape> {
	static override props: RecordProps<MyShape> = {
		color: T.string,
		size: T.positiveNumber,
		tags: T.arrayOf(T.string).optional(),
	}
}
```

### How do I test custom shapes or tools?

Use `TestEditor` to create an editor instance in tests without needing a full React component:

```tsx
import { TestEditor } from 'tldraw/src/test/TestEditor'

it('creates my custom shape', () => {
	const editor = new TestEditor()
	const id = createShapeId()
	editor.createShape({ id, type: 'myShape', x: 0, y: 0 })
	expect(editor.getShape(id)).toBeDefined()
})
```

---

## Tools

### How do I customize the Select tool (or any tool)?

As shown in the [custom tool example](https://examples.tldraw.com/custom-tool), you can provide your own set of `tools` to the `<Tldraw />` component.

To override the Select tool:

```tsx
const allDefaultToolsWithCustomSelect = [...defaultTools, ...defaultShapeTools, YourCustomSelectTool]

<Tldraw
	tools={allDefaultToolsWithCustomSelect}
/>
```

Make sure you still call it `select`.

An alternative, hacky way of overriding certain methods in a tool:

```jsx
editor.getStateDescendant('select.pointing_shape').onLongPress = function (info) {
	if (this.hitShape.type === 'note') {
		return
	} else {
		this.startTranslating(info)
	}
}
```

### How do I change the double click behavior on the canvas?

By default, double clicking on the canvas with the **Select** tool will create a new Text shape. You can customize (or remove) this behavior by doing a runtime mutation of the Select tool:

```tsx
<Tldraw
	onMount={(editor) => {
		type IdleStateNode = StateNode & {
			handleDoubleClickOnCanvas(info: TLClickEventInfo): void
		}

		const selectIdleState = editor.getStateDescendant<IdleStateNode>('select.idle')
		if (!selectIdleState) throw Error('SelectTool Idle state not found')

		function customDoubleClickOnCanvasHandler(_info: TLClickEventInfo) {
			// Your custom behavior goes here...
			window.alert('double clicked on the canvas')
		}

		customDoubleClickOnCanvasHandler.bind(selectIdleState)
		selectIdleState.handleDoubleClickOnCanvas = customDoubleClickOnCanvasHandler
	}}
/>
```

See the original implementation [here](https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts#L616-L617) as an example.

### How do I change keyboard shortcuts?

Override the default shortcuts using the overrides prop:

```tsx
import { TLUiOverrides, Tldraw } from 'tldraw'

const overrides: TLUiOverrides = {
	actions(_editor, actions) {
		return {
			...actions,
			'toggle-grid': { ...actions['toggle-grid'], kbd: 'x,' },
			'copy-as-png': { ...actions['copy-as-png'], kbd: '$1' }, // cmd+1
		}
	},
	tools(_editor, tools) {
		return {
			...tools,
			draw: { ...tools.draw, kbd: 'p' }, // Change draw tool to 'p'
		}
	},
}

function MyApp() {
	return <Tldraw overrides={overrides} />
}
```

**Keyboard shortcut syntax:**

- `a` - Just the key
- `!a` - Shift + A
- `$a` - Cmd/Ctrl + A
- `?a` - Alt/Option + A
- `a,b` - For multiple shortcuts, use a comma

See the [keyboard shortcuts example](https://tldraw.dev/examples/ui/keyboard-shortcuts) for more details.

---

## Theming and appearance

### How do I turn on/off dark mode?

Color theme preferences are stored in the user object. To change the theme at runtime, update the user preferences:

```tsx
editor.user.updateUserPreferences({ colorScheme: 'dark' })
editor.user.updateUserPreferences({ colorScheme: 'light' })
editor.user.updateUserPreferences({ colorScheme: 'system' })
```

### Can I create other themes besides dark/light?

Not out-of-the-box at this time. But you could work around the system and create some custom CSS to achieve this.

### Can I add my own custom colors to the style panel?

You can't add new colors to the style panel yet, but you can modify the default color palette:

```tsx
import { DefaultColorThemePalette } from 'tldraw'

// Modify existing colors before mounting
DefaultColorThemePalette.lightMode.black.solid = 'aqua'
DefaultColorThemePalette.darkMode.black.solid = 'lime'

function MyApp() {
	return <Tldraw />
}
```

### How do I turn on Frame colors?

The Frame shape can be configured to use colors. To enable this option, create a configured FrameShapeUtil with the `showColors` option set to `true`. Pass the configured FrameShapeUtil into the `Tldraw` component's `shapeUtils` prop:

```tsx
const ConfiguredFrameShapeUtil = FrameShapeUtil.configure({
	showColors: true,
})

export default function FrameColorsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" shapeUtils={[ConfiguredFrameShapeUtil]} />
		</div>
	)
}
```

### How do I change the outline color of the selected shape?

You can override the `--color-selection-stroke` CSS variable. This would change all the elements related to selected items—things like the selection outline and resize handles.

If you only want to change the outline, you could add additional CSS targeting the `tl-selection__fg__outline` class with the `stroke` property.

### How do I change the background of the tldraw component?

Using the `Tldraw` component's `components` prop, set the `Background` component to some other component:

```tsx
function MyBackgroundComponent() {
	return <div className="my-background-component" />
}

const components = { Background: MyBackgroundComponent }

function MyApp() {
	return <Tldraw components={components} />
}
```

### How do I remove the background of the tldraw component?

Using the `Tldraw` component's `components` prop, set the `Background` component to null:

```tsx
const components = { Background: null }

function MyApp() {
	return <Tldraw components={components} />
}
```

---

## UI customization

### How can I hide the style panel?

The style panel is usually in the top right of the screen, and is used to change colours, fills, opacity, etc.

You can hide it by [forcing the mobile UI](https://tldraw.dev/examples/basic/force-mobile) to show on desktop, which keeps the style panel accessible via a button next to the toolbar.

You can also disable the style panel entirely by setting the `StylePanel` component to `null`:

```tsx
const components = { StylePanel: null }

function MyApp() {
	return <Tldraw components={components} />
}
```

### How do I remove the right click/context menu entirely?

In the `Tldraw` component's `components` prop, set the `ContextMenu` component to `null`:

```tsx
const components = { ContextMenu: null }

function MyApp() {
	return <Tldraw components={components} />
}
```

### How do I display custom UI on top of the canvas?

If you want to display custom UI on top of the canvas, you can either override the `InFrontOfTheCanvas` component (for things that should be rendered static relative to your window), or the `Overlays` component (if you want your custom UI to be anchored to the canvas):

```tsx
const components = {
	InFrontOfTheCanvas: () => {
		return (
			<p style={{ top: 200, left: 200, position: 'absolute' }}>
				I stay the same size when zooming and panning
			</p>
		)
	},
	Overlays: () => (
		<>
			<TldrawOverlays /> {/* default overlays */}
			<p style={{ top: 250, left: 250, position: 'absolute' }}>I move and zoom with the canvas</p>
		</>
	),
}

function MyApp() {
	return <Tldraw components={components} />
}
```

### Can I implement a tooltip or contextual toolbar for a shape?

Yes! Here's how you would implement a contextual toolbar (a tooltip would follow a similar pattern):

- [Context toolbar example](https://examples.tldraw.com/context-toolbar)
- [Source code](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/context-toolbar)

---

## Sync and multiplayer

### What's the difference between `@tldraw/sync` and `@tldraw/sync-core`?

Use `@tldraw/sync` for React applications—it provides production-ready hooks (`useSync`, `useSyncDemo`) that handle WebSocket connections, state synchronization, and automatic reconnection. Use `@tldraw/sync-core` only if you're building custom sync servers, integrating with non-React frameworks, or need direct protocol control.

```tsx
// Standard React approach
import { useSync } from '@tldraw/sync'
const store = useSync({ uri: 'wss://myserver.com/sync/room-123', assets })

// Only go lower-level if implementing a custom server
import { TLSyncClient, TLSyncRoom } from '@tldraw/sync-core'
```

### How can I use tldraw sync with my existing servers and load balancer?

As the architecture requirements for tldraw sync are different from a typical web app, we recommend hosting tldraw sync separately from the rest of your app. Use a session backends/actors service like [Cloudflare Durable Objects](https://www.cloudflare.com/en-gb/developer-platform/products/durable-objects/).

tldraw sync is designed to work with an architecture called session backends. Jamsocket has a good description of them here: https://jamsocket.com/blog/session-backends

Traditional stateless web server architectures are not well suited to the low-latency requirements of realtime canvas sync. Instead, you need to spin up a single process/stateful microserver for each document, and have all the users for that document connect to that one server. Each of these processes is called a session backend.

In a traditional architecture, you balance **requests** across **stateless** backends. In session backends (which tldraw sync uses), you balance **documents** across **stateful** backends.

You can do this with traditional servers and load balancers, but you need to have your load balancer send all connections for a particular document to the same server, and be able to automatically balance documents across servers as they come up/go down. It's pretty complicated and hard to get right.

We recommend [Cloudflare's Durable Objects](https://www.cloudflare.com/en-gb/developer-platform/products/durable-objects/) because it implements this exact architecture. It's cheap, easy to set up, and it works perfectly with tldraw sync out of the box. You could also use:

- [Jamsocket](https://jamsocket.com/) - cloud offering or [open source self-hostable version](https://plane.dev/plane-vs-jamsocket)
- [Rivet](https://rivet.gg/) - cloud offering or [open source self-hostable version](https://github.com/rivet-gg/rivet)

### How do I convert between a `RoomSnapshot` and a `StoreSnapshot`?

A `RoomSnapshot` is the data format used by tldraw sync. A `StoreSnapshot` is the format used by the client. Here are helpers to convert between the two formats:

```tsx
function convertRoomSnapshotToStoreSnapshot(snapshot: RoomSnapshot): TLStoreSnapshot {
	return {
		schema: snapshot.schema!,
		store: Object.fromEntries(snapshot.documents.map((doc) => [doc.state.id, doc.state])) as any,
	}
}

function storeSnapshotToRoomSnapshot(snapshot: TLStoreSnapshot): RoomSnapshot {
	return {
		schema: createTLSchema().serialize(),
		clock: 0,
		documents: Object.values(snapshot).map((r) => ({
			state: r,
			lastChangedClock: 0,
		})),
		tombstones: {},
	}
}
```

### How do I make server side changes to a document when using tldraw sync?

You can use the `updateStore` method of the `TLSocketRoom` class. See the [source code](https://github.com/tldraw/tldraw/blob/main/packages/sync-core/src/lib/TLSocketRoom.ts#L319-L343) for details.

### Recovering data from a Cloudflare R2 snapshot

If you have the raw data from your Cloudflare R2 bucket, you can convert it back into a `.tldr` file using this helper function:

```tsx
export async function returnFileSnapshot(env: Environment, fileSlug: string, isApp: boolean) {
	const snapshot = await getFileSnapshot(env, fileSlug, isApp)
	if (!snapshot) {
		throw new StatusError(404, 'File not found')
	}

	const tldrFile = {
		tldrawFileFormatVersion: 1,
		schema: snapshot.schema,
		records: Object.values(snapshot.documents.map((doc: { state: { id: string } }) => doc.state)),
	}

	return new Response(JSON.stringify(tldrFile, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${fileSlug}.tldr"`,
		},
	})
}
```

---

## Assets

### How do I upload images on a tldraw canvas to my own CDN?

See the documentation on [handling assets](https://tldraw.dev/docs/assets) for different situations, and the [hosted images example](https://tldraw.dev/examples/hosted-images) for a specific implementation.

---

## AI integration

### How do I use AI in my tldraw project?

We have a dedicated AI module in the SDK, which lives at `packages/ai` and provides a helpful hook called `useTldrawAi`.

For a simple example of how to use the AI module in practice, check out the AI template at `templates/ai`.

The AI template also includes:

- Easy ways to extract canvas content and transform it into a format the model can work with
- Streaming responses
- Cloudflare Workers setup

### Where can I find the code for computer.tldraw.com?

Computer isn't available publicly, but many of its AI features can be built using our AI module (`packages/ai` for the module, or `templates/ai` for an example of AI in tldraw in practice). We're also working on a workflow builder template that will help people build similar experiences.

### Is there a tldraw MCP server?

There is not yet an official tldraw MCP server! If you're interested in this, we would love to know what you plan on building with it—hop by our [Discord](https://discord.tldraw.com/) and come chat!

---

## Troubleshooting

### Error: "could not migrate content" when copy/pasting

We regularly push new versions of our schema on [tldraw.com](http://tldraw.com/) to support new features. The SDK or other implementations of tldraw may not have these changes.

When you try to copy changes from tldraw.com to older versions of our SDK library, the new changes (which support rich text, for example) are sometimes not backwards compatible.

### I'm seeing CLIENT_TOO_OLD errors after upgrading tldraw

There are two things that can cause this:

1. **Version mismatch**: There is a mismatch between the tldraw package versions in your client and your backend.

   **Fix:** Check your package.json configurations to make sure that the version numbers for tldraw packages are all the same.

2. **Schema mismatch**: The schema that the backend is configured with does not match the schema that the frontend is configured with.

   **Fix:** If you have any custom shapes, bindings, or migrations, make sure those are configured the same way in the client and server.

### My board stopped loading or became unstable

If a board stops loading or becomes unstable, especially when stored on Cloudflare R2, it may be due to file size limits. Large documents can exceed the limits of the Cloudflare free plan or the v3 sync layer's capacity.

We've since added file size warnings in newer versions of tldraw ([PR #6492](https://github.com/tldraw/tldraw/pull/6492)) and are planning improvements to handle large documents more gracefully in future releases.

---

## Migration and versioning

### Where can I find the old templates and tutorials for tldraw v3.x.x?

You can find the templates and example projects for tldraw v3.x.x on GitHub under the versioned branches of the repository. For example, the Cloudflare sync template is available here:

https://github.com/tldraw/tldraw/tree/v3.12.0/templates/sync-cloudflare

If you're using the v3 templates (e.g., for Cloudflare Workers), note that this version is no longer maintained and may require additional configuration to deploy successfully with newer versions of Wrangler or Cloudflare Workers.

If you see errors like:

```
Could not resolve "@tldraw/sync-core"
Could not resolve "@tldraw/tlschema"
Could not resolve "itty-router"
```

These usually indicate a missing dependency or outdated build configuration. You can try marking the missing packages as `external` in your Wrangler or bundler config, or update your project to the latest version of tldraw where these dependencies are bundled differently.

### How do I handle IndexKey validation errors when upgrading from v3 to v4?

When upgrading tldraw from v3.x to v4.x, you may encounter validation errors related to `IndexKey` types in custom shapes or bindings:

```
Uncaught ValidationError: At binding(type = layout).props.index: Expected an index key, got "a2Bk0"
```

This occurs because v4 switched from the `fractional-indexing` library to `jittered-fractional-indexing`, which adds random precision bits to prevent ordering collisions ([PR #6646](https://github.com/tldraw/tldraw/pull/6646)).

**Solution:**

This is a type error, not a data migration issue. The existing index data remains valid and does not need to be migrated. To fix:

1. Cast your index values as `IndexKey` type in your custom shape or binding definitions:

```tsx
index: 'a0' as IndexKey
```

2. Optionally, validate at runtime using this helper function:

```tsx
import { generateKeyBetween } from 'jittered-fractional-indexing'

export function validateIndexKey(index: string): asserts index is IndexKey {
	try {
		generateKeyBetween(index, null)
	} catch {
		throw new Error('invalid index: ' + index)
	}
}
```

**Note about tests:** If you use snapshots in your tests, you may need to regenerate them, as tldraw will now add random precision bits to indices automatically.
