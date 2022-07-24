# Changelog

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
