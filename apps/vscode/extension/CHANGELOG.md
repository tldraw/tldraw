## 1.2.4

## 1.28.0

### Minor Changes

- - Fixes copy as PNG
  - Fixes a bug with copy and paste
  - Fixes a bug on iPad while using pencil
  - Fixes a bug with the style menus
  - Fixes a bug with image export
  - Updates translations

## 1.27.0

### Minor Changes

- - Adds Galacian language translation
  - Adds Farsi (Persian) language translation
  - Updates German translation
  - Updates Norwegian translation
  - Updates Japanese translation
  - Updates Spanish translation
  - Improves aria-labels
  - Fixes a bug with multiplayer menu
  - Fixes a bug with image exports

## 1.26.1

### Patch Changes

- - Adds Galacian language translation
  - Adds Farsi (Persian) language translation
  - Updates German translation
  - Updates Norwegian translation
  - Updates Japanese translation
  - Updates Spanish translation
  - Improves aria-labels
  - Fixes a bug with multiplayer menu
  - Fixes a bug with image exports
- 12c0b2ac: - Adds Galacian language translation
  - Adds Farsi (Persian) language translation
  - Updates Norwegian translation
  - Updates Japanese translation
  - Updates Spanish translation
  - Improves aria-labels
  - Fixes a bug with multiplayer menu
  - Fixes a bug with image exports

## 1.26.0

### Minor Changes

- - Adds missing Arabic translations for dialogs. @abedshamia
  - Updates core-example. @brydenfogelman
  - Updates Polish translations. @adan2013
  - Adds missing Aria-Labels. @KDSBrowne
  - Improves Japanese translation. @yashkumarbarot
  - Fixes height and width in app.viewport. @hiroshisuga
  - Improves labels on StlyeMenu @proke03
  - Adds missing tooltips to undo / redo buttons. @proke03

## 1.25.2

### Patch Changes

- Fix types in core.

## 1.25.1

### Patch Changes

- Fixes blurring text inputs in multiplayer.

## 1.25.0

### Minor Changes

- Add metadata property to user.

## 1.24.0

### Minor Changes

- - Adds `components` prop to Tldraw component (for custom Cursor, etc) @jamesbvaughan
  - Adds Thai language @watchakorn-18k
  - Fix event bug on `onRightPointCanvas`
  - Fix bug with bad data in document with up-to-date version number
  - Fix bug with arrow bindings
  - Improves freehand line performance
  - Improves performance of shape tree
  - Improved .tldr file size (strip white space)

## 1.23.5

### Patch Changes

- Fix mouse events.

## 1.23.4

### Patch Changes

- Fix menu bug.

## 1.23.3

### Patch Changes

- Small bump.

## 1.23.2

### Patch Changes

- Fix bug with scrolling.

## 1.23.1

### Patch Changes

- - Fix bug with mouse button state

## 1.23.0

### Minor Changes

- - Remove `mobx` and `mobx-react-lite` as dependencies. This is a breaking change for libraries that expect data to be observable in `@tldraw/core`.

## 1.22.0

### Minor Changes

- - Improve middle mouse panning
  - Fix bug with assets in VS Code plugin
  - Improve performance of draw-style shapes
  - Fix bug with creating assets
  - Fix bug with text align in labels when outputting images
  - Fix bug with middle mouse panning on Linux
  - Fix bug with zoom shortcuts on number pad
  - Fix bug with draw and erase direction when holding shift

## 1.21.1

### Patch Changes

- Remove share by URL.

## 1.21.0

### Minor Changes

- - Fix broken VS Code extension
  - Add share by URL

## 1.20.0

### Minor Changes

- - Improve text (and multiline text) in image exports
  - Create European Portugese translation
  - Create Swedish translation
  - Use system default for theme default
  - Update translation label for Chinese
  - Fix bugs with flip command
  - Fix bug with duplicate page command
  - Improve dialogs
  - Improve SVG pasting

## 1.19.0

### Minor Changes

- - restores the sponsor link
  - removes sign in / sign out / authentication / next-auth
  - removes sponsorware page
  - removes unused translation keys
  - fixes dark mode on help icon
  - improves border radius on panels
  - fixes dividers on panels
  - removes animated cursors (replace with CSS transitions for performance when - many cursors are present)
  - removes unused icons
  - adds migration for export default background option
  - correctly normalizes mouse wheel

## 1.18.0

### Minor Changes

- - Adds Ukrainian translations
  - Adds Farsi translation
  - Adds Hebrew translation
  - Adds option for dock position
  - Improves page numbering
  - Support dark mode in menus
  - Make language menu scrollable
  - Adds link to translation guide

## 1.17.2

### Patch Changes

- Improve page reordering, add german translation

## 1.17.1

### Patch Changes

- Add additional translations.

## 1.17.0

### Minor Changes

- 8ef86c19: - Updates multiplayer implementation.
  - Adds translation guide.
  - Fixes bug on text shape
  - Updates undo redo for text shapes.

## 1.16.2

### Patch Changes

- Replace multiplayer icon.

## 1.16.1

### Patch Changes

- Fix clipboard bug in Firefox, add overwite option to `insertContent`.

## 1.16.0

### Minor Changes

- Add getContent / insertContent, improve copy and paste position logic

## 1.15.0

### Minor Changes

- d919bd27: Bump dependencies, add international support.

### Patch Changes

- Add internationalization, improve readonly mode, bump dependencies for React 18

## 1.15.0-next.0

### Minor Changes

- Bump dependencies, add international support.

## 1.14.1

### Patch Changes

- Improve eraser scribble.

## 1.14.0

### Minor Changes

- Add erase line, bump dependencies.

## 1.13.3

### Patch Changes

- Fix keyboard events when style menu is open.

## 1.13.2

### Patch Changes

- Move style panel to right corner.

## 1.13.1

### Patch Changes

- Add option to keep style panel open.

## 1.13.0

### Minor Changes

- Fixes zooming and pinching bugs. Adds ErrorBoundary to Tldraw component. Cleans up sponosrship feature in menu.

## 1.12.6

### Patch Changes

- Improve image export for files that include scaled or rotated text.

## 1.12.5

### Patch Changes

- Improve clipboard, SVG text.

## 1.12.4

### Patch Changes

- Fix export on dark mode.

## 1.12.3

### Patch Changes

- Fix clipboard events in editing text in vscode extension, fix outline for editing text in vscode extension.

## 1.12.2

### Patch Changes

- Update to include 1.12.2.

## 1.12.1

### Patch Changes

- Fix tldraw assets for vscode extension.

## 1.12.0

### Minor Changes

- This update changes how clipboard actions (cut, copy, paste) and exports work. Significantly, image exports are no longer handled via a server-side integration, and are instead handled locally on the client. This allows now for exports in the VS Code extension, as well as greatly simplifying exports for apps that embed the Tldraw React component.

## 1.11.3

### Patch Changes

- Add paste for assets.

## 1.11.2

### Patch Changes

- Fix build.

## 1.10.0

### Minor Changes

- Bump underlying packages.

## 1.9.0

### Minor Changes

- c09d6a3a: Adds text field for page rename, undo buttons on all screen sizes, arrow behavior with alt key.

## 1.8.4

### Patch Changes

- Fix bug with missing parents / children.

- Fixed bug that prevented saving.

## 1.1.9

- Updates READMEs.

## 1.1.6

- Fixes bugs in VS Code extension.

## 0.1.23

- Fixing bugs related to saving files.

## 0.1.0

- Launched!
