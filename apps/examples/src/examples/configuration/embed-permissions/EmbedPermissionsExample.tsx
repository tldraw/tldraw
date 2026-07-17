import {
	CustomEmbedDefinition,
	DEFAULT_EMBED_DEFINITIONS,
	Editor,
	EmbedShapeUtil,
	TLEmbedDefinition,
	TLEmbedShape,
	Tldraw,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const youtube = DEFAULT_EMBED_DEFINITIONS.find((def) => def.type === 'youtube')!

// [1]
const presentationYoutube: TLEmbedDefinition = {
	...youtube,
	isAspectRatioLocked: true,
	backgroundColor: '#000000',
	canEditWhileLocked: false,
	overridePermissions: {
		'allow-presentation': true,
	},
}

// [2]
const readOnlyWebsite: CustomEmbedDefinition = {
	type: 'website',
	title: 'Website (read-only)',
	hostnames: ['wikipedia.org', '*.wikipedia.org'],
	width: 680,
	height: 1000,
	doesResize: true,
	overrideOutlineRadius: 12,
	backgroundColor: '#f8f9fa',
	overridePermissions: {
		'allow-scripts': false,
		'allow-forms': false,
		'allow-popups': false,
		'allow-same-origin': false,
	},
	toEmbedUrl: (url) => url,
	fromEmbedUrl: (url) => url,
	icon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
}

// [3]
const shapeUtils = [
	EmbedShapeUtil.configure({ embedDefinitions: [presentationYoutube, readOnlyWebsite] }),
]

// [4]
function handleMount(editor: Editor) {
	editor.createShape({
		type: 'text',
		x: 100,
		y: 40,
		props: {
			richText: toRichText(
				'Embeds are inert until you double-click them (editing state). Try resizing each one, too.'
			),
		},
	})

	editor.createShape({
		type: 'text',
		x: 100,
		y: 100,
		props: {
			richText: toRichText('YouTube: aspect ratio locked, fullscreen allowed'),
			size: 's',
		},
	})
	editor.createShape<TLEmbedShape>({
		type: 'embed',
		x: 100,
		y: 140,
		props: {
			// "tldraw sync — multiplayer whiteboards in React" from the tldraw channel
			url: 'https://www.youtube.com/watch?v=COw7Wm9HS-g',
			w: 640,
			h: 360,
		},
	})

	editor.createShape({
		type: 'text',
		x: 820,
		y: 100,
		props: {
			richText: toRichText('Read-only website: scripts, forms, and popups disabled'),
			size: 's',
		},
	})
	editor.createShape<TLEmbedShape>({
		type: 'embed',
		x: 820,
		y: 140,
		props: {
			// what else would a whiteboard embed?
			url: 'https://en.wikipedia.org/wiki/Whiteboard',
			w: 680,
			h: 1000,
		},
	})

	editor.zoomToFit()
}

export default function EmbedPermissionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={shapeUtils} onMount={handleMount} />
		</div>
	)
}

/*
This example demonstrates advanced embed shape configuration: sandbox
permission overrides, aspect ratio locking, and the visual options on embed
definitions. It extends the custom embed example, which covers adding a
provider in the first place.

Embedded iframes are sandboxed. The defaults (embedShapePermissionDefaults
in the tldraw package) are deliberately conservative — scripts, same-origin
and forms allowed; modals, popups-to-escape-sandbox, top navigation, and
presentation disabled. Each definition can override individual permissions.

[1]
A customized YouTube definition:

- overridePermissions grants 'allow-presentation' so the player's fullscreen
  button works (a permission that's off by default because a malicious
  embed could "present" itself pretending to be the host app).
- isAspectRatioLocked keeps the player 16:9 when resized — try a corner
  handle.
- backgroundColor fills the shape behind the iframe while it loads.
- canEditWhileLocked: false means a locked shape can't enter its interactive
  editing state.

[2]
A definition pointing the other way: an intentionally locked-down website
embed, here showing Wikipedia's article on whiteboards. Everything risky is
off — no scripts, no forms, no popups, no same-origin access — the pattern
to use for embedding untrusted pages as inert, read-only previews. Note
that the page still renders because Wikipedia is server-rendered: with
allow-scripts off, a site that needs JavaScript to paint would show an
empty frame, so pick embeds for this mode accordingly.
overrideOutlineRadius rounds the shape's outline to match providers whose
embeds have their own border radius (Spotify is the in-tree example).

[3]
Definitions are passed to EmbedShapeUtil with configure(), replacing the
default list. Adding a definition with an icon (CustomEmbedDefinition) also
puts it in the insert-embed dialog.

[4]
Embed shapes are created like any shape: the util matches the url against
each definition's hostnames to pick the right definition. Note the
interactivity rule: an embed's iframe ignores pointer events until you
double-click the shape to start editing it (editor.getEditingShapeId()
controls this) — that's why you can drag embeds around without the iframe
swallowing your clicks.
*/
