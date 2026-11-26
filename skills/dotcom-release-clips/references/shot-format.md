# Shot format

A shot is an ES module that sets up a scene and scripts one action. `shoot.mjs` runs the same shot against the before build and the after build, so both takes have identical framing and timing. Worked examples are in `shots/`.

```js
export function setup(e, label, h) {
	e.createShapes([{ id: 'shape:a', type: 'geo', x: 340, y: 230, props: { w: 160, h: 110 } }])
	h.label(530, 110)
	return { target: h.screen(420, 285) }
}

export const steps = [
	{ idle: 300 },
	{ move: 'target', ms: 800, arc: 70 },
	{ click: true },
	{ move: { x: -60, y: 700 }, ms: 700, arc: 40 },
	{ idle: 500 },
]

export const speed = 1.2 // optional, 1.2-1.25
```

## setup(e, label, h)

Runs inside the page with the tldraw `Editor` as `e`, after the page has been cleared and the camera reset to `{ x: 0, y: 0, z: 1 }`, so page coordinates equal screen coordinates. The viewport is 1120 x 630.

`setup` is serialized into the page, so it can't use anything from the module around it. Use `h` instead:

- `h.label(cx, y)` adds the large "Before" or "After" text centred on `cx`. It does nothing in an after-only clip, which is recorded without `--label`, so call it in every shot.
- `h.screen(x, y)` turns a page point into a screen point.
- `h.rt(text)` builds rich text for `text`, `geo` and `note` shapes. `\n` starts a new paragraph.
- `h.W` and `h.H` are the viewport size.

Return the named screen points the steps move to.

## Steps

Each step has exactly one action. Unknown actions or options stop the take with an error.

| Step | Does | Options |
| --- | --- | --- |
| `{ idle: ms }` | Holds still | |
| `{ move: point }` | Moves the cursor along a curved, eased path | `ms` (default 700), `arc` in px (bend, either sign) |
| `{ down: true }` / `{ up: true }` | Presses or releases the mouse button | `ms` to hold afterwards (default 120) |
| `{ click: true }` | Clicks where the cursor is | `ms` to hold afterwards (default 200) |
| `{ key: 'a' }` | Presses a key and shows it in the keycast | `show` (keycast text), `showMs` (default 700), `ms` (default 200) |
| `{ type: 'text' }` | Types one character at a time | `perChar` (default 70) |

A point is a name returned by `setup`, `{ at: 'name', dx, dy }`, or `{ x, y }` in screen pixels.

Use Playwright key names with Mac modifiers: `Meta+k`, `Shift+1`, `Escape`, `Enter`. The page presents as a Mac on every host, so `Meta` is Cmd and menus show ⌘ hints. Show Mac glyphs in the keycast: `⌘ K`, `⇧ 1`, `esc`, `↵`.

## Making it read well

- Start with the cursor off screen (the default start is just off the bottom-right edge). Move in with one big, deliberate motion, do the action, then leave the frame the same way. End with about `{ idle: 500 }` so the loop doesn't restart the instant the cursor leaves.
- Keep the subject clear of the UI. The style panel covers x > 960, the toolbar y > 560 around the centre, and the menu bar the top-left corner. Menus and the command palette open over the middle of the screen above the toolbar.
- Hold long enough to read: about 500 ms after each change that matters.
- Keep it short. Four to eight seconds per take.
- The before and after must be the same action. If the before would be misleading (a new feature whose keys do something else without it), make the clip after only.
