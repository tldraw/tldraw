# component-studio

A studio for developing tldraw UI components in isolation — a Storybook-like tool, as a
separate **private** package that consumes the SDK across a real package boundary.

Stories ("sketches") are authored as `*.sketchbook.tsx` files and discovered with zero
registration. They can be viewed two ways: each isolated in an iframe with live controls
(the **studio**), or laid out as instances on a real tldraw canvas (the **board**).

## Running it

From this folder:

```sh
yarn dev
```

- **Studio** — http://localhost:5430
- **Canvas board** — http://localhost:5430/canvas.html

## Vocabulary

- **studio** — the whole app.
- **sketchbook** — a `*.sketchbook.tsx` file; every sketch in it stages one component.
- **sketch** — a single named export: the component in one state.

## Authoring a sketch

Create `src/sketchbooks/<area>/<name>.sketchbook.tsx`. The **default export** is the
sketchbook (which component, where it sits in the nav); each **named export** is a sketch.

```tsx
import { Sketch, Sketchbook } from '../../sketch'
import { SendButton, SendButtonProps } from './send-button'

const sketchbook: Sketchbook<SendButtonProps> = {
	// slash-delimited: the first segment becomes a page on the canvas board
	title: 'Comments/Send button',
	component: SendButton,
}
export default sketchbook

export const Default: Sketch<SendButtonProps> = { args: { label: 'Send', disabled: false } }
export const Disabled: Sketch<SendButtonProps> = { args: { label: 'Send', disabled: true } }
```

`args` feed the sketchbook's `component`. For anything `args` can't express, give a
`render` instead:

```tsx
export const Pair: Sketch<SendButtonProps> = {
	render: () => (
		<>
			<SendButton label="Send" /> <SendButton label="Send" disabled />
		</>
	),
}
```

Sketchbooks are discovered by `import.meta.glob('./sketchbooks/**/*.sketchbook.tsx')` —
there's no registration step.

## Views

- **Studio** (`/`) — each sketch isolated in a preview iframe, with theme and locale
  globals in the toolbar and a live controls panel over its `args`.
- **Canvas board** (`/canvas.html`) — every instance rendered on a real tldraw canvas (a
  custom shape), one page per title namespace, with a properties panel for editing a
  selected instance's `args`.

## Controls

The controls panel edits a sketch's `args` live. Each control is inferred from its value
(a number → number input, a boolean → checkbox, an object → a field-wise editor). Two
kinds need declaring, because they can't be recovered from a runtime value:

- **`select`** — the option list.
- **`union`** — a discriminated union (a discriminant select that swaps the whole value).

Declare them per sketchbook via `argTypes`, keyed by prop name (so a typo is a type
error):

```tsx
const sketchbook: Sketchbook<CommentAnchorProps> = {
	title: 'Anchoring/Comment anchor',
	component: CommentAnchor,
	argTypes: {
		anchor: {
			control: 'union',
			discriminant: 'type',
			variants: {
				shape: { type: 'shape', shapeId: 'shape:box' },
				point: { type: 'point', x: 0, y: 0 },
			},
		},
	},
}
```

Controls can also be **auto-derived from the component's prop types**:

```sh
yarn gen-controls
```

This runs a native typescript-go extractor over each component's props and writes
`src/auto-argtypes.generated.ts` (committed). Hand-authored `argTypes` override the
generated baseline. The extractor binary lives outside this repo (default
`~/src/tsgolint/extract-props`, override with `EXTRACT_PROPS_BIN`); the generated file is
committed, so the studio runs without it.

## Harnesses and parameters

A sketchbook's `harness` picks the runtime its component needs:

- **`isolated`** (default) — tldraw's UI context on mock providers.
- **`editor`** — a live `<Tldraw>`, for components that need a real editor.

A sketch's `parameters` stage special cases:

- **`pseudo`** — pin a `'hover' | 'active' | 'focus-visible'` state without input.
- **`viewport`** — render a scene at a device size (`'mobile' | 'tablet' | 'desktop'`),
  for end-to-end flows shown in situ.

## Notes

- Private, dev-only package (`"private": true`) — not part of any published build.
- The comment data model is mirrored locally in `src/comment-model.ts`; the UI consumes it
  through an adapter, so swapping to the real `@tldraw/tlschema` records is a no-op for the
  components.
