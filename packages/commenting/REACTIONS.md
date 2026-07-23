# Reaction palettes

Comment reactions store a **token** — an opaque string the commenting layer only ever stores,
syncs, and hands back to a renderer. It never assumes the token is an emoji glyph. Out of the box
the token _is_ the glyph (drawn by the OS emoji font), but you can swap the palette to make a
reaction be anything: custom emoji images, SVGs, drawings, a fixed brand set, etc.

## The model

A reaction is one record per `(comment, user, token)` (see `TLCommentReaction` in `@tldraw/tlschema`).
The `token` is stored verbatim. Three things decide how a palette behaves, and **they must agree** —
they're facets of one palette:

| Concern                                    | Extension point              | Default                                                           |
| ------------------------------------------ | ---------------------------- | ----------------------------------------------------------------- |
| **What tokens exist / how they're picked** | `components.ReactionPalette` | `EmojiPicker` (a grid of `DEFAULT_REACTION_EMOJI`)                |
| **How a token is drawn**                   | `components.ReactionContent` | the token string (OS emoji font)                                  |
| **Which tokens may be written**            | `isAllowedReaction(token)`   | `isAllowedReactionEmoji` (membership in `DEFAULT_REACTION_EMOJI`) |

All three are set on the comment tool:

```tsx
CommentTool.configure({
  components: {
    ReactionPalette: MyPalette,
    ReactionContent: MyReactionContent,
  },
  isAllowedReaction: (token) => /* is this one of mine? */,
})
```

If you set none of them, you get the default emoji palette. **Reverting a custom palette is just
deleting these three overrides** — the defaults are the emoji system.

> **Why three, and why they must agree:** the picker emits tokens, the renderer draws them, and the
> validator gates writes. If the picker emits a token the renderer doesn't understand, the pill shows
> the raw token string; if the validator rejects it, the write is silently dropped. Keep the three in
> lockstep. (This is a known rough edge — the intent is to collapse them into a single
> `reactionPalette` object; until then, set all three together.)

## The three pieces in detail

### 1. The palette — `components.ReactionPalette`

A component with the same props as the built-in `EmojiPicker` (`EmojiPickerProps`):

```tsx
interface EmojiPickerProps {
	emoji?: string[] // tokens to offer (your palette)
	selected?: string[] // tokens the user has already reacted with (show as pressed)
	onSelect?(token: string): void // call this with the chosen token
	renderReaction?: RenderReaction // draw a token (pass through to your renderer)
}
```

It renders inside the add-reaction dropdown. When the user picks something, call
`onSelect(token)` — that token is what gets stored. It can be anything: an emoji glyph, a
shortcode, a `data:` URL, an id into your own store.

### 2. The renderer — `components.ReactionContent`

A component `({ token }) => ReactNode` used to draw a token wherever a reaction appears (the count
pills, and — via `renderReaction` — inside the palette). Return an `<img>`, an SVG, or plain text:

```tsx
function MyReactionContent({ token }: { token: string }) {
	return isMyToken(token) ? <img src={resolveImage(token)} alt="" /> : <>{token}</>
}
```

Fall through to `<>{token}</>` for tokens you don't own, so a custom palette and the stock emoji
palette can coexist on the same comment.

The presentational components (`Reaction`, `Reactions`, `EmojiPicker`, `ReactionPicker`) also take a
`renderReaction(token): ReactNode` **function** prop directly, if you're composing them yourself
rather than through `CanvasComments`. `defaultRenderReaction` is the token-string default.

### 3. Validation — `isAllowedReaction(token)`

Gates which tokens may be **added** (removals always go through, so a reaction carrying an
off-palette token can still be cleared). This is the client-side guard that stops a token the picker
would never offer. It should accept exactly the tokens your palette emits:

```ts
isAllowedReaction: (token) => isMyToken(token) || isAllowedReactionEmoji(token)
```

> Server-side, a reaction is still verified for identity/ownership by the sync authorizer, but the
> _palette membership_ check is client-side. If you need a hard server bound, enforce your token set
> in the sync server too.

## Worked example: draw-your-own reactions

`@tldraw/commenting` ships a complete custom palette — a small tldraw canvas you draw in, stored as
a `data:` image token — as `drawing-reactions`. Wiring it is the three overrides:

```tsx
import {
	CommentTool,
	DrawingReactionContent,
	DrawingReactionPalette,
	isAllowedReactionEmoji,
	isDrawingReactionToken,
	type EmojiPickerProps,
} from '@tldraw/commenting'

// DrawingReactionPalette is a nested tldraw editor, so bind its license key here.
function ReactionPalette(props: EmojiPickerProps) {
	return <DrawingReactionPalette {...props} licenseKey={getLicenseKey()} />
}

const commentTools = [
	CommentTool.configure({
		components: {
			ReactionPalette,
			ReactionContent: DrawingReactionContent, // draws data: tokens as <img>, emoji fall through
		},
		// drawings OR emoji are valid, so old emoji reactions still work after the switch
		isAllowedReaction: (token) => isDrawingReactionToken(token) || isAllowedReactionEmoji(token),
	}),
]
```

To go back to plain emoji, delete those overrides:

```tsx
const commentTools = [CommentTool.configure({})]
```

That's the entire revert — no package changes, because the defaults _are_ the emoji palette.

## Token gotchas

- **The token goes into the record id** (`id = f(comment, user, token)`), so keep tokens small.
  Large tokens (e.g. an inlined drawing) bloat the id and the Postgres primary key. The drawing
  palette caps token length (`DrawingReactionTooLargeError`) for this reason.
- **Tokens arrive from other users over sync.** If a token renders as HTML (an SVG, an image),
  render it in a way that can't execute script or reach the network — the drawing renderer uses
  `<img src>` (never inlined SVG) and gates on an explicit `data:` prefix allowlist.
- **Tokens are effectively immutable.** A stored reaction keeps its token forever; don't repurpose a
  token to mean something else, or old reactions change meaning.
