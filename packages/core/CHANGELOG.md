# Changelog

## 1.23.0

### Minor Changes

- - Fixes copy as PNG
  - Fixes a bug with copy and paste
  - Fixes a bug on iPad while using pencil
  - Fixes a bug with the style menus
  - Fixes a bug with image export
  - Updates translations

## 1.22.0

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

### Patch Changes

- Updated dependencies
  - @tldraw/intersect@1.9.0
  - @tldraw/vec@1.9.0

## 1.21.1

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
- Updated dependencies
- Updated dependencies [12c0b2ac]
  - @tldraw/intersect@1.8.1
  - @tldraw/vec@1.8.1

## 1.21.0

### Minor Changes

- - Adds missing Arabic translations for dialogs. @abedshamia
  - Updates core-example. @brydenfogelman
  - Updates Polish translations. @adan2013
  - Adds missing Aria-Labels. @KDSBrowne
  - Improves Japanese translation. @yashkumarbarot
  - Fixes height and width in app.viewport. @hiroshisuga
  - Improves labels on StlyeMenu @proke03
  - Adds missing tooltips to undo / redo buttons. @proke03

## 1.20.3

### Patch Changes

- Add external fonts, new translations, duplicate page fix.

## 1.20.2

### Patch Changes

- Fix text placement.

## 1.20.1

### Patch Changes

- Fix types in core.

## 1.20.0

### Minor Changes

- Add metadata property to user.

## 1.19.0

### Minor Changes

- - Adds `components` prop to Tldraw component (for custom Cursor, etc) @jamesbvaughan
  - Adds Thai language @watchakorn-18k
  - Fix event bug on `onRightPointCanvas`
  - Fix bug with bad data in document with up-to-date version number
  - Fix bug with arrow bindings
  - Improves freehand line performance
  - Improves performance of shape tree
  - Improved .tldr file size (strip white space)

### Patch Changes

- Updated dependencies
  - @tldraw/intersect@1.8.0
  - @tldraw/vec@1.8.0

## 1.18.4

### Patch Changes

- Fix mouse events.

## 1.18.3

### Patch Changes

- Small bump.

## 1.18.2

### Patch Changes

- Fix bug with scrolling.

## 1.18.1

### Patch Changes

- - Fix bug with mouse button state

## 1.18.0

### Minor Changes

- - Remove `mobx` and `mobx-react-lite` as dependencies. This is a breaking change for libraries that expect data to be observable in `@tldraw/core`.

## 1.17.0

### Minor Changes

- - Improve middle mouse panning
  - Fix bug with assets in VS Code plugin
  - Improve performance of draw-style shapes
  - Fix bug with creating assets
  - Fix bug with text align in labels when outputting images
  - Fix bug with middle mouse panning on Linux
  - Fix bug with zoom shortcuts on number pad
  - Fix bug with draw and erase direction when holding shift

## 1.16.0

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

## 1.15.0

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

## 1.14.1

### Patch Changes

- Improve page reordering, add german translation

## 1.14.0

### Minor Changes

- d919bd27: Bump dependencies, add international support.

### Patch Changes

- Add internationalization, improve readonly mode, bump dependencies for React 18

## 1.14.0-next.0

### Minor Changes

- Bump dependencies, add international support.

## 1.13.1

### Patch Changes

- Improve eraser scribble.

## 1.13.0

### Minor Changes

- Add erase line, bump dependencies.

## 1.12.0

### Minor Changes

- Fixes zooming and pinching bugs. Adds ErrorBoundary to Tldraw component. Cleans up sponosrship feature in menu.

## 1.11.1

### Patch Changes

- Improve clipboard, SVG text.

## 1.11.0

### Minor Changes

- Prevent clipboard events inside of text from reaching the document. Fix various clipboard-related bugs in tldraw.

## 1.10.0

### Minor Changes

- This update changes how clipboard actions (cut, copy, paste) and exports work. Significantly, image exports are no longer handled via a server-side integration, and are instead handled locally on the client. This allows now for exports in the VS Code extension, as well as greatly simplifying exports for apps that embed the Tldraw React component.

## 1.9.1

### Patch Changes

- Fix publish version.

## 1.9.0

### Minor Changes

- - Adds menu item for CAD-selection
  - Adds scrolling to menus
  - Fixes "dot" shapes created when clicking with geometric tools
  - Fixes wrong text bounds when fonts load
  - Adds export to VS Code extension.

## 1.8.0

### Minor Changes

- Improves camera (zoom and pan).

### Patch Changes

- e8dd64ba: Fix text in multiplayer
- Updated dependencies [e8dd64ba]
  - @tldraw/intersect@1.7.1

## 1.7.0

### Minor Changes

- Update dependencies and monorepo.

### Patch Changes

- Updated dependencies
  - @tldraw/intersect@1.7.0
  - @tldraw/vec@1.7.0

## 1.5.0

- Fix propagation on pointer move events.

## 1.4.3

- Update README
- Update LICENSE year

## 1.4.0

- Adds support for performance modes.
- Makes assets an optional prop for the Renderer.

## 1.3.0

- Adds assets for image and video shape types.

## 1.2.10

- Fix bug in shape events.

## 1.2.9

- Improves multiplayer cursor appearance.

## 1.2.2

- Adds mobx and support for mobx observables in the Renderer's props.
- Removes unused code.

## 0.1.21

New:

- Adds the `isGhost` prop to `TLShape`. In `TLComponentProps`, the `isGhost` prop will be true if either a shape has its `isGhost` set to `true` OR if a shape is the descendant of a shape with `isGhost` set to `true`. A ghost shape will have the `tl-ghost` class name, though this is not used in the Renderer. You can set it yourself in your app.
- Adds the `isChildOfSelected` prop for `TLComponentProps`. If a shape is the child of a selected shape, its `isChildOfSelected` prop will be true.

Improved:

- Fixes a bug that could occur with the order of grouped shapes.
- Adds an Eraser tool to the advanced example.
- Adds a Pencil tool to the advanced example.

## 0.1.20

- Update docs.
- Adds `hideResizeHandles` prop.

## 0.1.19

- Remove stray `index.js` files.

## 0.1.18

- Even more dependency fixes.

## 0.1.17

- More dependency fixes.

## 0.1.16

- Fix dependencies, remove `@use-gesture/react` from bundle.

## 0.1.15

- Fix README.

## 0.1.14

- Add README to package.

## 0.1.13

- Remove `type` from `TLBinding`.

## 0.1.12

- Fix bug with initial bounds.

## 0.1.12

- Fix bug with initial bounds.

## 0.1.12

- Fix bug with bounds handle events.

## 0.1.11

- Fix bug with initial camera state.

## 0.1.10

- Improve example.
- Improve types for `TLPage`.

## 0.1.9

- Bug fixes.

## 0.1.8

- Expands README.
- Removes properties specific to the tldraw app.

## 0.1.7

- Fixes selection bug with SVGContainer.
- Removes various properties specific to the tldraw app.

## 0.1.0

- Re-writes API for ShapeUtils.
