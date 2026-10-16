# tldraw TUI

tldraw in the terminal. This app runs the real tldraw editor headlessly in Node and draws it with box-drawing and braille characters, so the tools, selection, snapping, arrows, bindings, undo history, styles and pages behave like tldraw.com. It reads and writes `.tldr` files and can export the canvas as plain text.

Single player only. Images, video, embeds and bookmarks are shown as placeholders.

## Running

From the repo root:

```bash
pnpm dev-tui                      # run from source with tsx (slow startup)
pnpm dev-tui path/to/file.tldr    # open a file

cd apps/tui
pnpm build && pnpm start          # bundle with esbuild, then start (fast startup)
```

Startup is dominated by loading jsdom (under a second from the bundle, a few seconds from source). Input latency is independent of that: an input byte normally becomes a frame on the terminal within a few milliseconds.

Flags:

| Flag                         | Meaning                                                                 |
| ---------------------------- | ----------------------------------------------------------------------- |
| `--light`, `--dark`          | Force the colour scheme instead of detecting the terminal background    |
| `--fps N`                    | Maximum frames per second, 30 to 120 (default 60)                       |
| `--glyphs rich\|safe\|ascii` | Glyph set; `ascii` works in any font or locale                          |
| `--color 24bit\|256\|16`     | Colour depth instead of detecting it                                    |
| `--no-mouse`                 | Do not request mouse reporting; use keyboard pointer mode               |
| `--osc52`                    | Also send exported text to the terminal clipboard                       |
| `--debug`                    | Show frame timings, bytes per frame and input latency in the status bar |

## Using it

The toolbar is on the top row, the status bar on the bottom row. The rest is the canvas.

Mouse: left-drag draws or moves, right-click opens the context menu, right-drag or middle-drag pans, the wheel pans, ctrl+wheel or alt+wheel zooms around the pointer. Double-click a shape to edit its text. Selection handles for resizing and rotating appear as small squares; click them like in tldraw.

Terminals do not report held keys, and most strip shift from mouse reports, so held modifiers are replaced by latches: press F5 (shift), F6 (alt) or F7 (ctrl) before a drag to constrain, add to the selection or clone. A latch releases after the next pointer up; press it twice to make it sticky. The status bar shows active latches.

### Tools

| Key           | Tool                                       |
| ------------- | ------------------------------------------ |
| `v`           | Select                                     |
| `h`           | Hand                                       |
| `d`, `b`, `x` | Draw                                       |
| `e`           | Eraser                                     |
| `a`           | Arrow                                      |
| `l`           | Line                                       |
| `t`           | Text                                       |
| `n`           | Note                                       |
| `f`           | Frame                                      |
| `r`           | Rectangle                                  |
| `o`           | Ellipse                                    |
| `g`           | Shape picker (press again to cycle shapes) |
| `k`           | Laser                                      |
| `shift+d`     | Highlighter                                |

### Editing

| Key                          | Action                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- |
| `ctrl+z`                     | Undo                                                                   |
| `ctrl+y`                     | Redo (also `ctrl+shift+z` with the kitty keyboard protocol)            |
| `ctrl+x`, `ctrl+c`, `ctrl+v` | Cut, copy, paste (paste at the pointer with the shift latch)           |
| `ctrl+d`                     | Duplicate                                                              |
| `delete`, `backspace`        | Delete                                                                 |
| `ctrl+a`                     | Select all                                                             |
| `esc`                        | Cancel the current action or deselect                                  |
| `enter`                      | Edit the text of the selected shape                                    |
| `ctrl+g`                     | Group, or ungroup a selected group                                     |
| `shift+l`                    | Lock or unlock                                                         |
| `]`, `[`                     | Bring to front, send to back                                           |
| `}`, `{`                     | Bring forward, send backward                                           |
| `shift+h`, `shift+v`         | Flip horizontally, vertically                                          |
| `shift+.`, `shift+,`         | Rotate clockwise, counterclockwise                                     |
| arrows                       | Nudge the selection (10 cells with the shift latch)                    |
| `alt+a/h/d/v/w/s`            | Align left, center, right, top, middle, bottom (also in the Edit menu) |

While editing text: type to insert, `enter` adds a line, arrows and `home`/`end` move the caret, `esc` finishes. Pasting into the terminal inserts the text, or creates a text shape when nothing is being edited.

### View and pages

| Key                             | Action                                             |
| ------------------------------- | -------------------------------------------------- |
| `=`, `-`                        | Zoom in, out                                       |
| `shift+0`, `shift+1`, `shift+2` | Zoom to 100%, to fit, to selection                 |
| `'`                             | Toggle the grid                                    |
| `"`                             | Toggle snap mode                                   |
| `ctrl+/`                        | Toggle dark mode                                   |
| `pgup`, `pgdn`                  | Previous, next page (also `alt+left`, `alt+right`) |
| `F2`                            | Rename the page                                    |
| `F4`                            | Pages                                              |

### Interface

| Key                          | Action                                                    |
| ---------------------------- | --------------------------------------------------------- |
| `?`, `F1`                    | Keyboard shortcuts                                        |
| `m`, `F9`                    | Menu                                                      |
| `F10`                        | Context menu                                              |
| `s`, `F3`                    | Style panel                                               |
| `F5`, `F6`, `F7`             | Latch shift, alt, ctrl                                    |
| `F8`                         | Keyboard pointer mode                                     |
| `ctrl+s`, `ctrl+o`, `ctrl+n` | Save, open, new                                           |
| `ctrl+e`                     | Export the canvas as text                                 |
| `ctrl+q`                     | Quit (`ctrl+c` twice also quits when nothing is selected) |

The style panel docks on the right on wide terminals (110 columns or more) and opens as a popup elsewhere. Use the arrow keys to pick a row and change its value, or click a value.

Keyboard pointer mode (`F8` or `--no-mouse`): arrows move the pointer, `space` presses or releases the button, `enter` clicks, `tab` jumps to the next shape.

## Terminal notes

- The kitty keyboard protocol is used when the terminal supports it (kitty, WezTerm, foot, Ghostty, Alacritty 0.13+, iTerm2 3.5+). It makes `esc` instant, lets held modifiers work natively and enables the `ctrl+shift` chords shown in the help overlay.
- Under tmux, set `set -s escape-time 10` so `esc` is not delayed.
- On macOS Terminal.app and iTerm2 enable "Use Option as Meta key" for the `alt` shortcuts; everything they do is also in the menus.
- Truecolor is detected from `COLORTERM`, `TERM` and known terminal variables; pass `--color 256` for terminals that misreport it.
- The glyph set falls back to ASCII when the locale is not UTF-8 or the terminal renders box-drawing characters two cells wide.

## Development

```bash
cd apps/tui
pnpm test run            # unit and integration tests
pnpm exec vitest bench --run
pnpm lint
cd ../.. && pnpm typecheck --filter=@tldraw/tui
```

The editor runs under jsdom with a small set of polyfills (`src/bootstrap`). Terminal input and output live in `src/terminal`, the renderer in `src/render`, the toolbar, menus and prompts in `src/ui`, and input routing and actions in `src/input` and `src/actions`.
