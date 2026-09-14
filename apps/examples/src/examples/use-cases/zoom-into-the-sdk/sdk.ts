import { type ZoomNode } from '../../../semantic-zoom/layout'

/**
 * The tldraw SDK described at four scales, to show that semantic zoom is a
 * technique rather than a literary trick — the same component renders this and
 * a whole novel, and has never heard of either.
 */

const leaf = (id: string, title: string, text: string): ZoomNode => ({ id, title, text })

export const sdk: ZoomNode = {
	id: 'sdk',
	text: 'tldraw is an infinite canvas for React: a headless editor that owns a reactive document and a camera, wrapped in a batteries-included SDK of shapes, tools and UI.',
	children: [
		{
			id: 'area-editor',
			text: 'The editor package is the canvas engine — a document, a camera, and the machinery for turning pointers into changes. It ships no shapes, no tools and no interface, so everything above it is replaceable.',
			children: [
				{
					id: 'editor-core',
					text: 'One Editor object owns everything. It holds the store, the camera and the current tool, and exposes the whole public surface as methods; subsystems that need their own state or teardown live beside it as managers.',
					children: [
						leaf(
							'editor-class',
							'Editor',
							'The single object an application talks to. Creating, updating and deleting shapes, selection, the camera, page management, and a long tail of query methods all hang off it, which is why it is far and away the largest file in the package.'
						),
						leaf(
							'editor-managers',
							'Managers',
							'Subsystems the editor owns and disposes: ticking, focus, themes, fonts, scribbles, edge scrolling, collaborators, performance. Anything holding a resource extends EditorManager so its cleanup runs when the editor is torn down.'
						),
						leaf(
							'editor-history',
							'HistoryManager',
							'Undo and redo, built on diffs of the store rather than snapshots. Marks group a burst of changes into one undoable step, which is what makes dragging a shape a single entry instead of sixty.'
						),
						leaf(
							'editor-inputs',
							'InputsManager',
							'The current state of pointers, keys and modifiers, kept as signals so tools can read them reactively instead of threading events through every state transition.'
						),
						leaf(
							'editor-snap',
							'SnapManager',
							'Snapping while dragging and resizing: edges, centres, equal spacing and the indicator lines that explain what just snapped. Disproportionately large because the rules are mostly special cases.'
						),
						leaf(
							'editor-spatial',
							'SpatialIndexManager',
							'An index from regions of the page to the shapes inside them, so hit-testing and culling stay fast on documents with thousands of shapes.'
						),
						leaf(
							'editor-text',
							'TextManager and FontManager',
							'Measuring text off-screen so wrapping can be computed without laying it out, and loading the fonts a document needs before anything is drawn with them.'
						),
					],
				},
				{
					id: 'editor-maths',
					text: 'Geometry is the layer everything else leans on: a shape is only a rectangle, a polygon or a spline as far as the editor is concerned, and hit-testing, snapping and export all bottom out here.',
					children: [
						leaf(
							'editor-geometry',
							'Geometry2d',
							'Rectangles, ellipses, polygons, polylines and cubic splines behind one interface: nearest point, distance, intersection and bounds. A ShapeUtil returns one of these and gets hit-testing for free.'
						),
						leaf(
							'editor-primitives',
							'Vec, Mat and Box',
							'Vectors, affine matrices and axis-aligned boxes, plus intersection helpers. Small, boring, and used by nearly every other file in the repository.'
						),
					],
				},
				{
					id: 'editor-render',
					text: 'Rendering is deliberately plain DOM. Shapes are React components positioned by one camera transform, which is what lets an application drop its own markup onto the canvas.',
					children: [
						leaf(
							'editor-components',
							'Canvas and default components',
							'The canvas itself and the slots around it — background, brush, handles, overlays, and the OnTheCanvas and InFrontOfTheCanvas layers an application can fill with anything it likes.'
						),
						leaf(
							'editor-overlays',
							'Overlays',
							'Canvas decoration that is not a shape: brushes, snap lines, selection indicators. Drawn by OverlayUtil classes so an application can replace them without touching shapes.'
						),
						leaf(
							'editor-exports',
							'Export',
							'Turning a selection into SVG, PNG or a copied image. Has to re-render shapes outside the live canvas, inline their fonts and assets, and still produce the same picture.'
						),
						leaf(
							'editor-hooks',
							'React hooks',
							'The bridge between signals and React: useEditor, useValue, and the hooks that keep a component subscribed to exactly the part of the document it reads.'
						),
					],
				},
				{
					id: 'editor-extend',
					text: 'Three extension points carry almost all customisation: a util for how a shape behaves, a util for how two shapes stay attached, and a state node for how a tool responds to input.',
					children: [
						leaf(
							'editor-shapeutil',
							'ShapeUtil',
							'One class per shape type, defining geometry, rendering, handles, resizing and export. Adding a shape means adding a util rather than patching the editor.'
						),
						leaf(
							'editor-bindingutil',
							'BindingUtil',
							'Relationships between shapes as records of their own, with hooks for what happens when either end moves, changes or is deleted. Arrows use it; so does anything that should follow something else.'
						),
						leaf(
							'editor-tools',
							'StateNode',
							'Tools as hierarchical state machines. A tool is a node with child states for idle, pointing and dragging, and input events are handed down the tree.'
						),
					],
				},
			],
		},
		{
			id: 'area-tldraw',
			text: 'The tldraw package is everything the editor deliberately leaves out: the default shapes, the tools that create them, the bindings that connect them, and a complete interface.',
			children: [
				{
					id: 'default-shapes',
					text: 'Nine shape types, each a ShapeUtil. They are worth reading as the reference implementation of the extension point — anything a custom shape might need is done somewhere here.',
					children: [
						leaf(
							'shapes-arrow',
							'Arrow',
							'By far the most complicated shape. It binds to other shapes at both ends, re-routes as they move, avoids overlapping them, supports elbowed and curved routing, and carries a label that has to stay on the line.'
						),
						leaf(
							'shapes-geo',
							'Geo',
							'Rectangles, ellipses, stars, clouds and the rest behind one shape type with a geo style, each drawn with the same hand-drawn stroke treatment.'
						),
						leaf(
							'shapes-draw',
							'Draw and highlight',
							'Freehand strokes, turning raw pointer samples into a filled outline with pressure and taper rather than stroking a polyline.'
						),
						leaf(
							'shapes-note',
							'Note',
							'Sticky notes, which auto-size their text, snap into grids of other notes, and grow a neighbour when you tab out of one.'
						),
						leaf(
							'shapes-text',
							'Text',
							'Standalone rich text, with the editing surface, measurement and auto-width behaviour that labels on other shapes reuse.'
						),
						leaf(
							'shapes-media',
							'Image and video',
							'Media shapes plus the asset indirection behind them, so a document references an asset record rather than embedding the bytes.'
						),
						leaf(
							'shapes-frame',
							'Frame',
							'Frames, which clip their children, move them together, and act as artboards when exporting.'
						),
						leaf(
							'shapes-line',
							'Line',
							'Multi-point lines with draggable handles, straight or splined.'
						),
					],
				},
				{
					id: 'default-tools',
					text: 'Tools are state machines over pointer input. Select is the one that matters — most of the interaction model people think of as "the canvas" lives in its child states.',
					children: [
						leaf(
							'tools-select',
							'Select tool',
							'Idle, pointing, brushing, translating, resizing, rotating, cropping, editing, dragging handles. Each is a child state, which is the only way a surface this stateful stays legible.'
						),
						leaf(
							'tools-other',
							'Hand, zoom, eraser, laser',
							'The simpler tools, each a few states. Useful as the smallest complete examples of the StateNode pattern.'
						),
						leaf(
							'tools-eraser',
							'Eraser',
							'Scribble-to-erase, which has to hit-test a moving path against every shape it crosses.'
						),
						leaf(
							'tools-selection-logic',
							'Selection logic',
							'Shared helpers for what a click selects: the outermost group, the shape under the pointer, or the one inside a frame.'
						),
						leaf(
							'bindings-arrow',
							'Arrow bindings',
							'The BindingUtil that keeps an arrow attached to the shapes at its ends as they move, resize, or are deleted underneath it.'
						),
					],
				},
				{
					id: 'default-ui',
					text: 'The interface is a tree of replaceable components over a flat registry of actions, so an application can override one button without forking the toolbar.',
					children: [
						leaf(
							'ui-toolbar',
							'Components',
							'Toolbar, style panel, menus, dialogs, context menu, keyboard shortcuts dialog. The largest part of the package, and nearly all of it swappable through the components prop.'
						),
						leaf(
							'ui-hooks',
							'UI hooks',
							'The glue between interface and editor: what is selected, which styles are active, what a button should do and whether it should be disabled.'
						),
						leaf(
							'ui-actions',
							'Actions and overrides',
							'Every menu item and shortcut as an entry in one registry, so overrides add, remove or replace entries rather than reimplementing the menu.'
						),
						leaf(
							'assets-translations',
							'Translations',
							'Around forty languages. Not code in any real sense, but genuinely the largest thing in the repository — which the map makes obvious and a directory listing does not.'
						),
					],
				},
			],
		},
		{
			id: 'area-data',
			text: 'A document is a set of records in a reactive client-side database, described by a versioned schema and brought forward by migrations whenever the shape of the data changes.',
			children: [
				{
					id: 'store-internals',
					text: 'The store is a reactive map of records with diffs, queries and history. Every read is tracked, so a component re-renders exactly when the records it touched change.',
					children: [
						leaf(
							'store-core',
							'Store',
							'Put, remove, listen, and the diff stream that undo, persistence and multiplayer all consume. The single source of truth for a document.'
						),
						leaf(
							'store-queries',
							'Queries and indexes',
							'Incrementally maintained indexes over records, so "all shapes on this page" is a cached signal rather than a scan on every frame.'
						),
						leaf(
							'store-migrate',
							'Migrations',
							'Ordered, versioned migrations run when a document is loaded. The reason a file saved two years ago still opens.'
						),
						leaf(
							'store-atommap',
							'AtomMap',
							'A map whose individual entries are signals, so touching one record does not invalidate readers of every other.'
						),
						leaf(
							'store-records',
							'RecordType',
							'Record definitions and typed ids — the scaffolding every record type is declared through.'
						),
					],
				},
				{
					id: 'schema',
					text: 'tlschema is the vocabulary: what a shape record looks like, what styles exist, and what counts as valid. Changing it is what forces a migration.',
					children: [
						leaf(
							'schema-records',
							'Records',
							'Documents, pages, shapes, bindings, assets, instance state and presence, each with its validator and migration sequence.'
						),
						leaf(
							'schema-shapes',
							'Shape types',
							'The props of every default shape, defined once so the editor, the UI and the sync protocol all agree on them.'
						),
						leaf(
							'validate-core',
							'Validators',
							'A small validation library used at the store boundary, so malformed records are rejected where they enter rather than deep inside a renderer.'
						),
						leaf(
							'schema-styles',
							'Styles',
							'Colour, size, fill, dash and font as shared style properties, which is why setting a style applies across different shape types at once.'
						),
					],
				},
			],
		},
		{
			id: 'area-state',
			text: 'Underneath all of it is a signals library. The editor exposes almost everything as a computed value, and React subscribes to the exact values it reads.',
			children: [
				{
					id: 'signals',
					text: 'Atoms hold values, computed values derive from them, and effects run when their dependencies change — with transactions so a burst of writes produces one notification.',
					children: [
						leaf(
							'state-atom',
							'Atoms, computed and effects',
							'The core: dependency tracking, lazy recomputation, transactions and rollback. Small enough to read in an afternoon, and load-bearing for everything above it.'
						),
						leaf(
							'state-react',
							'React bindings',
							'useValue, useAtom and track, which turn a signal into a re-render without a store subscription boilerplate layer.'
						),
					],
				},
			],
		},
		{
			id: 'area-sync',
			text: 'Multiplayer is a diff protocol over the same store. Clients send changes, a room merges them, and presence rides alongside the document.',
			children: [
				{
					id: 'sync-internals',
					text: 'Sync is deliberately not a general CRDT. It is a server-authoritative room with last-writer-wins per record, which is enough for a canvas and far simpler to reason about.',
					children: [
						leaf(
							'sync-room',
							'TLSyncRoom',
							'The server side of a document: holds the authoritative records, merges incoming diffs, and broadcasts the result to everyone connected.'
						),
						leaf(
							'sync-client',
							'TLSyncClient',
							'The client side: buffers local changes, reconciles them with what the server sends back, and handles reconnection without losing work.'
						),
						leaf(
							'sync-presence',
							'useSync',
							'The hook an application actually calls, turning a room URI into a store that happens to be shared.'
						),
						leaf(
							'sync-protocol',
							'Protocol',
							'The message types on the wire. Short, and the thing to read first when a sync bug does not make sense.'
						),
					],
				},
			],
		},
	],
}
