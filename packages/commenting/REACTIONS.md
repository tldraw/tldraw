# Reaction palettes

Comment reactions store a **token** — an opaque string the commenting layer only ever stores,
syncs, and hands back to a renderer. It never assumes the token is an emoji glyph. Out of the box
the token _is_ the glyph (drawn by the OS emoji font), but you can swap the palette to make a
reaction be anything: custom emoji images, SVGs, drawings, a fixed brand set, etc.

## Overrides are opt-in

Every extension point below — the palette, the renderer, the validator, and the reactor tooltip —
is **opt-in**. Each is a slot on the comment tool that defaults to a built-in when you leave it
unset. So an unconfigured tool gives you the full standard experience: OS-font emoji reactions, the
default emoji picker, and the default hover tooltip.

```tsx
// All of these are equivalent — the built-in emoji reactions + default tooltip:
const commentTools = [CommentTool]
const commentTools = [CommentTool.configure({})]
const commentTools = [CommentTool.configure({ components: {} })]
```

You only pass an override to change that specific slot; everything you don't pass stays the built-in.
`configure({})` is not "turn reactions off" — it's "use every default." Reverting any customisation
is just deleting the override, never adding config back.

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

## The reactor tooltip

Separate from the palette (which is about the tokens themselves), the **hover tooltip that names who
reacted** is its own override. By default, hovering a reaction pill shows an inline sentence —
`You reacted`, `You and Bo reacted`, `You, Bo and Ada reacted`, then `You, Bo, Ada and N others
reacted` past three names.

There are two levels of customisation, smallest first:

1. **Reword it — translation, no code.** The sentence is built from the `comments.reacted-1`,
   `comments.reacted-2`, `comments.reacted-3`, `comments.reacted-more`, and `comments.reacted-more-one`
   strings (plus `comments.mention-you` for "You"). Override them through the standard tldraw
   translation `overrides` to change the words or reorder the `{a}` / `{b}` / `{c}` / `{count}`
   placeholders per locale. This is also how the grammar gets localised.

2. **Replace it — `components.ReactionTooltip`.** To change more than the wording, replace the whole
   affordance. The component receives the reactors **and the pill itself** (as `children`) and
   returns the entire thing — so it owns the tooltip, its box, size, shape, and position, not just
   the text inside. That's what lets it be anything: a different box, avatars, or a banner painted
   anywhere on screen.

   The default just hangs the built-in sentence in a standard tooltip. To keep that box but change
   the contents, wrap `children` in `TldrawUiTooltip` yourself:

   ```tsx
   import { CommentTool, type ReactionTooltipProps } from '@tldraw/commenting'
   import { TldrawUiTooltip } from 'tldraw'

   function AvatarReactionTooltip({ reactors, children }: ReactionTooltipProps) {
   	return (
   		<TldrawUiTooltip
   			side="bottom"
   			content={reactors.map((r, i) => (
   				<Avatar key={i} name={r.you ? 'You' : r.name} />
   			))}
   		>
   			{children}
   		</TldrawUiTooltip>
   	)
   }

   const commentTools = [
   	CommentTool.configure({ components: { ReactionTooltip: AvatarReactionTooltip } }),
   ]
   ```

   To break out of the tooltip entirely — your own popover, a fixed banner, no box at all — don't
   render `TldrawUiTooltip`; wrap `children` however you like and own the hover state yourself.

   `ReactionTooltipProps` gives you `reactors: { name: string; you: boolean }[]` in reaction order,
   plus `children` (the pill). Unset, it falls back to `DefaultReactionTooltip` (the default wrapper).
   Two exports help you compose: `DefaultReactionTooltip` (the wrapper) and
   `DefaultReactionTooltipContent` (just the inline sentence, to drop inside your own box). This is
   the same override mechanism as `ReactionContent` / `ReactionPalette`, just for the reactor list.

   > `enableHoverList` still applies upstream: when another menu on the comment is open the pill
   > renders bare and your `ReactionTooltip` isn't mounted, so you never have to handle that case.

## Token gotchas

- **The token goes into the record id** (`id = f(comment, user, token)`), so keep tokens small.
  Large tokens (e.g. an inlined drawing) bloat the id and the Postgres primary key. The drawing
  palette caps token length (`DrawingReactionTooLargeError`) for this reason.
- **Tokens arrive from other users over sync.** If a token renders as HTML (an SVG, an image),
  render it in a way that can't execute script or reach the network — the drawing renderer uses
  `<img src>` (never inlined SVG) and gates on an explicit `data:` prefix allowlist.
- **Tokens are effectively immutable.** A stored reaction keeps its token forever; don't repurpose a
  token to mean something else, or old reactions change meaning.
