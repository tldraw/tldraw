# @tldraw/headless

Run the tldraw editor in Node.js — no DOM, no browser. The headless editor is backed by the same `Editor` class the browser runs; there is no separate implementation to drift out of sync. The full document API works: creating and updating shapes, geometry and bounds, alignment and stacking, bindings, undo/redo, and snapshots. Rendering, image/SVG export, focus, and clipboard remain browser-only.

Note: `react` and `react-dom` are required peer dependencies, inherited from the `tldraw` package that provides the default shapes. They are installed but never rendered.

```ts
import { createShapeId, getSnapshot } from '@tldraw/editor'
import { createHeadlessEditor } from '@tldraw/headless'

const editor = createHeadlessEditor()

const id = createShapeId()
editor.createShape({ id, type: 'geo', x: 100, y: 100, props: { w: 200, h: 100 } })
editor.select(id)
console.log(editor.getSelectionPageBounds())

const snapshot = getSnapshot(editor.store)
editor.dispose()
```

To connect two shapes with an arrow, create the arrow and bind each terminal. The bindings keep the arrow attached when either shape moves:

```ts
const arrowId = createShapeId()
editor.createShape({ id: arrowId, type: 'arrow', x: 0, y: 0 })
editor.createBindings([
	{ type: 'arrow', fromId: arrowId, toId: boxA, props: { terminal: 'start' } },
	{ type: 'arrow', fromId: arrowId, toId: boxB, props: { terminal: 'end' } },
])
```

## Multiplayer

A headless editor can join a tldraw sync room as a live collaborator:

```ts
import { connectHeadlessEditor, createHeadlessEditor } from '@tldraw/headless'
import { toRichText } from '@tldraw/tlschema'

const editor = createHeadlessEditor()
const connection = await connectHeadlessEditor(editor, {
	uri: 'ws://localhost:5858/connect/my-room',
	userInfo: { name: 'Agent' },
})

editor.createShape({ type: 'text', x: 0, y: 0, props: { richText: toRichText('hello!') } })
await connection.flush() // resolves when the server has acknowledged every local change

connection.close()
editor.dispose()
```

## Importing content

The default external content handlers are registered, so `editor.putExternalContent` works headlessly: plain and HTML text (`{ type: 'text', text, html }`), tldraw and excalidraw clipboard content, embeds, and urls. A url import fetches the page from your Node process and unfurls its metadata (title, description, image) into a bookmark shape; an unreachable or unparseable page still yields a plain bookmark, with one console error. File and image content depends on browser APIs and reports an error instead of importing, and `svg-text` content throws with a clear message.

## Text measurement

Without a DOM there is no browser to lay text out, so the editor defaults to `approximateTextMeasurer`, a deterministic character-count estimate. Auto-sized text bounds will differ from what a browser computes — and in a shared room those bounds are written into the document for everyone. When accuracy matters, inject a real measurer via the `textMeasurer` option (any `TLTextMeasurer` implementation, e.g. one backed by a server-side canvas).

## Process lifecycle

All of the editor's timers are unref'd in Node: neither importing this package nor leaving an editor undisposed will keep your process alive. Call `editor.dispose()` anyway to stop the tick loop's work, and `connection.close()` to release sockets — an open sync connection intentionally keeps the process alive until closed, like any other network resource.

The default `frameLoop: 'auto'` ticks ~60 times a second per editor, which costs about 1% of a core even when idle. For long-lived processes holding many mostly-idle editors, prefer `frameLoop: 'manual'` and drive `editor.emit('tick', elapsedMs)` only when needed.

## Sharp edges worth knowing

- **Shape cap drops the whole batch.** A `createShapes` call that would push a page past `maxShapesPerPage` is dropped in full, without throwing. The editor emits a `'max-shapes'` event; with no listener it also logs a console warning, once per editor. Register a listener to handle the event and silence the warning.
- **Draw and highlight shapes take encoded paths.** Their `segments` require base64 delta-encoded point data (`b64Vecs.encodePoints` from `@tldraw/editor`), not raw `{ x, y }` arrays — raw points fail validation.
- **Label overflow lives in `growY`.** A shape whose label outgrows it keeps its base height (geo: the authored `props.h`; note: the size-derived height) and stores the overflow in `props.growY`; page bounds are the sum. It is computed at create/update time from text measurement.
- **`textOptions: null` is asymmetric.** Creating text-bearing shapes still works (validation needs no text stack); measuring them throws with an actionable error. Plaintext rendering works either way.
- **Presence removal has a grace period.** A cleanly closed connection stays in other clients' `getCollaborators()` for the room's ~5s session-removal window before disappearing.
- **A disposed editor warns rather than throws on writes.** The store stays mutable after `dispose()` (stores can outlive editors); the first write through a disposed editor logs a single console warning.

## License

This project is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md). A license key is required for production use: when `NODE_ENV` is `production`, `createHeadlessEditor` throws unless a `licenseKey` is provided (set `NODE_ENV` in your deployment — nothing sets it for you in Node). A provided key that fails validation is reported as a console error in any environment. There is no watermark headlessly, and headless deployments are never watermark-tracked.
