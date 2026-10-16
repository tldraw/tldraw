# tldraw TUI

tldraw in the terminal. The app runs the real tldraw editor headlessly in Node (under jsdom) and draws it with box-drawing and braille characters, so the tools, selection, snapping, arrows and bindings, undo history, styles and pages behave like tldraw.com. It reads and writes `.tldr` files and exports the canvas as plain text.

Single player only. Images, video, embeds and bookmarks are drawn as placeholders, and text is plain (no rich formatting).

## Running

From the repo root:

```bash
pnpm dev-tui                      # run from source with tsx (slow startup)
pnpm dev-tui path/to/file.tldr    # open a file

cd apps/tui
pnpm build && pnpm start          # bundle with esbuild, then start (fast startup)
```

Startup is dominated by loading jsdom (under a second from the bundle, a few seconds from source). Input latency is independent of that: an input byte normally becomes a frame on the terminal within a few milliseconds, and the app sleeps completely while nothing changes.

Flags:

| Flag                         | Meaning                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `--light`, `--dark`          | Force the colour scheme instead of detecting the terminal background                    |
| `--fps N`                    | Maximum frames per second, 30 to 120 (default 60)                                       |
| `--glyphs rich\|safe\|ascii` | Glyph set; `ascii` works in any font or locale                                          |
| `--color 24bit\|256\|16`     | Colour depth instead of detecting it                                                    |
| `--no-mouse`                 | Do not request mouse reporting; drive the pointer from the keyboard (see below)         |
| `--osc52`                    | Also offer exported text to the terminal clipboard (on by default where it works)       |
| `--debug`                    | Show frames per second, frame time, bytes per frame and input latency in the status bar |

## Using it

The toolbar is on the top row, the status bar on the bottom row and the canvas in between. On terminals at least 110 columns wide the style panel docks on the right while something is selected or a shape tool is active.

### Mouse

- Left drag draws, selects, brushes or moves; a left click selects. Double-click a shape to edit its text: a double click is two clicks in the same cell within 450 ms.
- Right click (press and release in the same cell) opens the context menu. Right drag or middle drag pans.
- The wheel pans two rows per tick, `shift`+wheel scrolls sideways, `ctrl`+wheel or `alt`+wheel zooms around the pointer. Many terminals use `ctrl`+wheel for their own font size, so `alt`+wheel is the reliable one.
- The four corner handles of a selection are drawn as small squares; the edge handles are invisible but clickable along the selection edges, and arrow and line points are dots. The rotate handle shares its corner's cell and loses to resizing there, so to rotate with the mouse drag from the cell one step diagonally outside the corner, or press `shift+.` and `shift+,`.
- The hover outline settles about 32 ms after the pointer stops (tldraw's own throttle). Hover needs any-motion mouse reporting, which GNU screen does not provide.

Terminals do not report key releases, and most strip `shift` from mouse reports, so held modifiers are replaced by latches: press `F5` (shift), `F6` (alt) or `F7` (ctrl) before a drag to constrain, add to the selection or clone. A latch releases after the next pointer up; press it a second time to keep it held and a third time to release it. The status bar shows active latches (sticky ones inverted). Under the kitty keyboard protocol really held modifier keys drive the same latches.

### Tools

| Key           | Tool                                                                  |
| ------------- | --------------------------------------------------------------------- |
| `v`           | Select                                                                |
| `h`           | Hand                                                                  |
| `d`, `b`, `x` | Draw                                                                  |
| `e`           | Eraser                                                                |
| `a`           | Arrow                                                                 |
| `l`           | Line                                                                  |
| `t`           | Text                                                                  |
| `n`           | Note                                                                  |
| `f`           | Frame                                                                 |
| `r`           | Rectangle                                                             |
| `o`           | Ellipse                                                               |
| `g`           | Shape picker; again within a second (or while open) cycles the shapes |
| `k`           | Laser                                                                 |
| `shift+d`     | Highlighter                                                           |

### Editing

| Key                          | Action                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `ctrl+z`                     | Undo                                                                             |
| `ctrl+y`                     | Redo (also `ctrl+shift+z` with full keys)                                        |
| `ctrl+x`, `ctrl+c`, `ctrl+v` | Cut, copy, paste (paste at the pointer with the shift latch)                     |
| `ctrl+d`                     | Duplicate                                                                        |
| `del`, `backspace`           | Delete                                                                           |
| `ctrl+a`                     | Select all                                                                       |
| `esc`                        | Cancel the current action, or deselect                                           |
| `enter`                      | Edit the text of the selected shape                                              |
| `ctrl+g`                     | Group, or ungroup a selected group (also `ctrl+shift+g` ungroups with full keys) |
| `shift+l`                    | Lock or unlock                                                                   |
| `]`, `[`                     | Bring to front, send to back                                                     |
| `}`, `{`                     | Bring forward, send backward (also `alt+]`, `alt+[` with full keys)              |
| `shift+h`, `shift+v`         | Flip horizontally, vertically                                                    |
| `shift+.`, `shift+,`         | Rotate 15° clockwise, counterclockwise                                           |
| arrows                       | Nudge by 1 (10 with the shift latch; in grid mode one grid step, 5 with shift)   |
| `alt+a/h/d/v/w/s`            | Align left, center, right, top, middle, bottom                                   |
| `alt+shift+h`, `alt+shift+v` | Distribute horizontally, vertically                                              |

The `alt` chords need a terminal that sends alt as meta; everything they do, plus stretch, pack, stack and unlock all, is in the Edit menu.

While editing text: type to insert, `enter` adds a line, arrows move the caret, `home` and `end` go to the start or end of the line (`ctrl+home`, `ctrl+end`: of the text), `backspace` and `del` delete a character, `ctrl+backspace` or `alt+backspace` deletes a word, and `esc` or `alt+enter` (also `ctrl+enter` with full keys) finishes. Pasting inserts at the caret; pasting while nothing is being edited creates a text shape at the pointer. Editing starts with the caret at the end of the text; there is no text selection.

### View and pages

| Key                             | Action                                                                 |
| ------------------------------- | ---------------------------------------------------------------------- |
| `=`, `-`                        | Zoom in, out (also `+`, `_`)                                           |
| `shift+0`, `shift+1`, `shift+2` | Zoom to 100%, to fit, to selection                                     |
| `'`                             | Toggle the grid                                                        |
| `"`                             | Toggle snap mode                                                       |
| `ctrl+/`                        | Toggle dark mode                                                       |
| `pgup`, `pgdn`                  | Previous, next page (also `alt+left`/`alt+up`, `alt+right`/`alt+down`) |
| `F2`                            | Rename the page                                                        |
| `F4`                            | Pages list                                                             |

Next page stops at the last page instead of creating a new one; New page, Duplicate page and Delete page are in the Pages menu. Debug info is in the View menu.

### Interface

| Key                          | Action                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `?`, `F1`                    | Keyboard shortcuts                                                                |
| `m`, `F9`                    | Menu                                                                              |
| `F10`, `shift+F10`           | Context menu                                                                      |
| `s`, `F3`                    | Style panel                                                                       |
| `F5`, `F6`, `F7`             | Latch shift, alt, ctrl                                                            |
| `F8`, `ctrl+space`           | Keyboard pointer mode                                                             |
| `ctrl+s`, `ctrl+o`, `ctrl+n` | Save (asks for a path when untitled), open, new                                   |
| `ctrl+e`                     | Export the page, or the selection, as text                                        |
| `ctrl+q`                     | Quit (`ctrl+c` pressed twice within a second also quits when nothing is selected) |

Save as… is in the File menu (`ctrl+shift+s` with full keys). New, open and quit ask about unsaved changes: `y` saves, `n` discards, `esc` cancels.

Menus: `left` and `right` switch menus, `up` and `down` move, `enter` or `space` chooses, a letter jumps to the item starting with it (and activates it when it is the only one), `esc` closes the submenu or the menu. The same keys work in the context menu, the shape picker and the pages list, and the mouse works everywhere.

Help overlay: `left`, `right`, `tab` or the digits `1`–`5` pick a tab; `up`, `down`, `pgup`, `pgdn`, `home` and `end` scroll; `q`, `?`, `F1`, `esc` or `enter` closes it. It lists the shortcuts for the active keyboard encoding ("legacy keys" or "full keys").

Style panel: `s` docks it on a wide terminal (when there is something to style) or opens it as a popup. The docked panel is mouse-only: click a value or the arrows next to it. In the popup `up`/`down` (or `tab`) pick a row, `left`/`right` (or `space`) change the value, a letter jumps to its row (`c` color, `o` opacity, `f` fill, `d` dash, `z` size, `F` font, `t` text align, `a` align, `v` vertical align, `g` geo, `k` arrow kind, `s`/`e` arrowheads, `p` spline, `l` label color), and `enter` or `esc` closes. Opacity moves in steps of 10%.

Prompts (open, save as, export, rename page) live in the status row: `tab` completes a path and cycles through the matches, `~` expands to the home directory, `up`/`down` recall earlier answers, `ctrl+a`/`ctrl+e` jump to the start or end, `ctrl+u` clears to the start, `ctrl+w` deletes a word, `enter` submits and `esc` cancels.

Keyboard pointer mode (`F8`, `ctrl+space` or `--no-mouse`): arrows move the pointer one cell (five with the shift latch), `space` presses or releases the button, `enter` clicks, `tab` and `shift+tab` jump to the next or previous shape. The status bar shows `[PTR]`, or `[DRAG]` while the button is down. Arrow-key nudging is unavailable in this mode.

## Terminal notes

- Keyboard encoding: at startup the app asks for the kitty keyboard protocol and falls back to xterm's modifyOtherKeys. When either is in effect the help overlay shows "full keys" and the tldraw chords (`ctrl+shift+z`, `ctrl+shift+s`, `ctrl+shift+g`, `alt+[`, `alt+]`, `ctrl+enter`) work in addition to the legacy ones listed above, which work everywhere.
- `esc` is handled as soon as a lone escape byte arrives. Under tmux run `set -s escape-time 10` so tmux does not hold it back.
- On macOS Terminal.app and iTerm2 enable "Use Option as Meta key" for the `alt` shortcuts; the help overlay reminds you.
- Colour depth: truecolor when `COLORTERM` is `truecolor`/`24bit`, `TERM` mentions direct/truecolor/24bit, `TERM_PROGRAM` is a known truecolor terminal, a terminal-specific variable (kitty, WezTerm, Windows Terminal, Alacritty, Ghostty, Konsole) or `TMUX` is set, or `VTE_VERSION` ≥ 3600; otherwise 256 colours. Pass `--color 256` or `--color 16` for terminals that misreport it.
- Colour scheme: `--light`/`--dark`, else the background the terminal reports (OSC 11), else `COLORFGBG`, else dark.
- Glyphs: the rich set by default; the safe set (no dingbats or supplemental arrows) on Terminal.app, `TERM=linux` and GNU screen; ASCII when the locale is not UTF-8 or the terminal renders ambiguous-width glyphs two cells wide. `--glyphs` overrides.
- GNU screen: hover is off and the mouse arrives in the X10 encoding, which breaks past column 95 in UTF-8 locales.
- Clipboard: exported text is also sent with OSC 52 when kitty, WezTerm, Alacritty or Windows Terminal is detected, or with `--osc52`.
- Preferences such as the colour scheme and snap mode persist in `$XDG_CONFIG_HOME/tldraw-tui/prefs.json` (default `~/.config/tldraw-tui/prefs.json`).

## Limitations

- Shapes are drawn to the cell grid: rectangles, frames and axis-aligned arrows use box-drawing lines, everything else braille (or block or ASCII glyphs in the lower tiers). A frame's name sits on the row above its border.
- Labels are truncated with an ellipsis when they do not fit; the full text of a single selected shape is shown in the status bar.
- Edge handles are not drawn, and the rotate handle is reachable only from the cell diagonally outside a corner.
- Text editing is plain text with a caret and no selection; rich-text formatting in a file is kept but not shown.
- Windows is supported through Windows Terminal (or WSL); conhost does not deliver mouse events to Node.

## Development

```bash
cd apps/tui
pnpm test run                     # unit and integration tests
pnpm exec vitest bench --run      # benchmarks
pnpm lint
cd ../.. && pnpm typecheck --filter=@tldraw/tui
```

The editor runs under jsdom with a small set of polyfills (`src/bootstrap`). Terminal input and output live in `src/terminal`, the renderer in `src/render`, the toolbar, menus, help and prompts in `src/ui`, input routing in `src/input` and the actions in `src/actions`.
