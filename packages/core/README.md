# core

This package contains the core of the `tldraw` library. It includes:

- [`Renderer`](#renderer), a React component
- [`TLShapeUtility`](#tlshapeutility), an abstract class for custom shape utilities
- the library's [`types`](#types)
- several utility classes:
  - [`Utils`](#utils)
  - [`Vec`](#vec)
  - [`Svg`](#svg)
  - [`Intersect`](#intersect)

## Installation

```bash
yarn add @tldraw/core
```

## Usage

Import the `Renderer` component and pass it the required props.

- [Example](#example)
- [Guide: Create a Custom Shape](#create-a-custom-shape)

## Documentation

### `Renderer`

- `page` - A [`TLPage`](#tlpage) object.
- `pageState` - A [`TLPageState`](#tlpagestate) object.
- `shapeUtils` - A table of [`TLShapeUtils`](#tlshapeutils) classes.
- `theme` - (optional) an object with overrides for the Renderer's default colors.
  - `foreground` - The primary (usually "text") color
  - `background` - The default page's background color
  - `brushFill` - The fill color of the brush selection box
  - `brushStroke` - The stroke color of the brush selection box
  - `selectFill` - The fill color of the selection bounds
  - `selectStroke` - The stroke color of the selection bounds and handles

> Tip: If providing an object for the `theme` prop, memoize it first with `React.useMemo`.

The renderer also accepts many (optional) event callbacks.

- `onPan` - The user panned with the mouse wheel
- `onZoom` - The user zoomed with the mouse wheel
- `onPinch` - The user moved their pointers during a pinch
- `onPinchEnd` - The user stopped a two-pointer pinch
- `onPinchStart` - The user began a two-pointer pinch
- `onPointerMove` - The user moved their pointer
- `onStopPointing` - The user ended a point
- `onPointShape` - The user pointed a shape
- `onDoublePointShape` - The user double-pointed a shape
- `onRightPointShape` - The user right-pointed a shape
- `onMoveOverShape` - The user moved their pointer a shape
- `onHoverShape` - The user moved their pointer onto a shape
- `onUnhoverShape` - The user moved their pointer off of a shape
- `onPointHandle` - The user pointed a shape handle
- `onDoublePointHandle` - The user double-pointed a shape handle
- `onRightPointHandle`- The user right-pointed a shape handle
- `onMoveOverHandle` - The user moved their pointer over a shape handle
- `onHoverHandle` - The user moved their pointer onto a shape handle
- `onUnhoverHandle` - The user moved their pointer off of a shape handle
- `onPointCanvas` - The user pointed the canvas
- `onDoublePointCanvas` - The user double-pointed the canvas
- `onRightPointCanvas` - The user right-pointed the canvas
- `onPointBounds` - The user pointed the selection bounds
- `onDoublePointBounds` - The user double-pointed the selection bounds
- `onRightPointBounds` - The user right-pointed the selection bounds
- `onPointBoundsHandle` - The user pointed a selection bounds edge or corner
- `onDoublePointBoundsHandle` - The user double-pointed a selection bounds edge or corner
- `onBlurEditingShape` - The user blurred an editing (text) shape
- `onError` - The renderer encountered an error

### `TLPage`

An object describing the current page. It contains:

- `id` - a unique id for the page
- `shapes` - a table of [`TLShape`](#tlshape) objects
- `bindings` - a table of [`TLBinding`](#tlbinding) objects
- `backgroundColor` - (optional) the page's background fill color

### `TLPageState`

An object describing the current page. It contains:

- `id` - the corresponding page's id
- `currentParentId`: the current parent id for selection
- `selectedIds`: an array of selected shape ids
- `camera` : an object describing the camera state
  - `point` - the camera's `[x, y]` coordinates
  - `zoom` - the camera's zoom level
- `brush`: (optional) a `Bounds` for the current selection box
- `pointedId`: (optional) the currently pointed shape id
- `hoveredId`: (optional) the currently hovered shape id
- `editingId`: (optional) the currently editing shape id
- `editingBindingId`: (optional) the currently editing binding id

### `TLShape`

An object that describes a shape on the page. The shapes in your document should extend this interface with other properties. See [Guide: Create a Custom Shape](#create-a-custom-shape).

- `id`: string
- `type` - the type of the shape, corresponding to the `type` of a [`TLShapeUtil`](#tlshapeutil).
- `parentId` - the id of the shape's parent (either the current page or another shape).
- `childIndex` - the order of the shape among its parent's children
- `name` - the name of the shape
- `point` - the shape's current `[x, y]` coordinates on the page
- `rotation` - the shape's current rotation in radians
- `children` - (optional) An array containing the ids of this shape's children
- `handles` - (optional) A table of `TLHandle` objects
- `isLocked` - (optional) True if the shape is locked
- `isHidden` - (optional) True if the shape is hidden
- `isEditing` - (optional) True if the shape is currently editing
- `isGenerated`- (optional) True if the shape is generated programatically
- `isAspectRatioLocked` - (optional) True if the shape's aspect ratio is locked

### `TLBinding`

An object that describes a relationship between two shapes on the page.

- `id` - a unique id for the binding
- `type` - the binding's type
- `fromId` - the id of the shape where the binding begins
- `toId` - the id of the shape where the binding begins

### `TLShapeUtil`

The `TLShapeUtil` is an abstract class that you can extend to create utilities for your custom shapes. See [Guide: Create a Custom Shape](#create-a-custom-shape).

### `Utils`

A general purpose utility class.

### `Vec`

A utility class for vector math and related methods.

### `Svg`

A utility class for creating SVG path data through imperative commands.

### `Intersect`

A utility class for finding intersections between various geometric shapes.

## Guides

### Create a Custom Shape

...

### Example

```tsx
import * as React from "react"
import { Renderer, TLShape, TLShapeUtil, Vec } from '@tldraw/core'

interface RectangleShape extends TLShape {
  type: "rectangle",
  size: number[]
}

class Rectangle extends TLShapeUtil<RectangleShape> {
  // See the "Create a Custom Shape" guide
}

const myShapes = { rectangle: new Rectangle() }

function App() {
  const [page, setPage] = React.useState({
    id: "page1"
    shapes: {
      "rect1": {
        id: 'rect1',
        parentId: 'page1',
        name: 'Rectangle',
        childIndex: 0,
        type: 'rectangle',
        point: [0, 0],
        rotation: 0,
        size: [100, 100],
      }
    },
    bindings: {}
  })

  const [pageState, setPageState] = React.useState({
    id: "page1",
    selectedIds: [],
    camera: {
      point: [0,0],
      zoom: 1
    }
  })

  const handlePan = React.useCallback((delta: number[]) => {
    setPageState(pageState => {
      ...pageState,
      camera: {
        zoom,
        point: Vec.sub(pageState.point, Vec.div(delta, pageState.zoom)),
      },
    })
  }, [])

  return (<Renderer
    shapes={myShapes}
    page={page}
    pageState={pageState}
    onPan={handlePan}
  />)
}
```

## Development

Run `yarn` to install dependencies.

Run `yarn start` to begin the monorepo's development server (`@tldraw/site`).

Run `nx test core` to execute unit tests via [Jest](https://jestjs.io).

## Contribution

To contribute, visit the [Discord channel](https://discord.gg/s4FXZ6fppJ).
