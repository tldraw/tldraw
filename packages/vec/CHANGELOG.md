# Changelog

## 1.9.2

### Patch Changes

- Include clipboard fixes.

## 1.9.1

### Patch Changes

- Fix clipboard stealing focus.

## 1.9.0

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

## 1.8.1

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

## 1.8.0

### Minor Changes

- - Adds `components` prop to Tldraw component (for custom Cursor, etc) @jamesbvaughan
  - Adds Thai language @watchakorn-18k
  - Fix event bug on `onRightPointCanvas`
  - Fix bug with bad data in document with up-to-date version number
  - Fix bug with arrow bindings
  - Improves freehand line performance
  - Improves performance of shape tree
  - Improved .tldr file size (strip white space)

## 1.7.1

### Patch Changes

- - Adds `Vec.nearestPointOnBounds`
  - Adds `Vec.distanceToBounds`

## 1.7.0

### Minor Changes

- Update dependencies and monorepo.

## 1.6.1

- Change `vec.toFixed` to always round to two decimal places. This drops the second parameter, which was previously available for custom precisions, but which was defaulted to 2 (its current behavior).

## 1.4.3

- Update README
- Update LICENSE year

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
