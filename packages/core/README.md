# @tldraw/core

This package contains the core of the [tldraw](https://tldraw.com) library. It includes:

- [`Renderer`](#renderer) - a React component
- [`TLShapeUtility`](#tlshapeutility) - an abstract class for custom shape utilities
- the library's TypeScript [`types`](#types)
- several utility classes:
  - [`Utils`](#utils)
  - [`Vec`](#vec)
  - [`Svg`](#svg)
  - [`Intersect`](#intersect)

## Installation

```bash
yarn add @tldraw/core --peer
```

## Usage

Import the `Renderer` React component and pass it the required props.

- [Example](#example)
- [Guide: Create a Custom Shape](#create-a-custom-shape)

## Documentation

### `Renderer`

| Prop         | Type                              | Description                                                            |
| ------------ | --------------------------------- | ---------------------------------------------------------------------- |
| `page`       | [`TLPage`](#tlpage)               | The current page object.                                               |
| `pageState`  | [`TLPageState`](#tlpagestate)     | The current page's state.                                              |
| `shapeUtils` | [`TLShapeUtils`](#tlshapeutils){} | The shape utilities used to render the shapes.                         |
| `theme`      | `object`                          | (optional) an object with overrides for the Renderer's default colors. |

The theme object accepts valid CSS colors for the following properties:

| Property       | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `foreground`   | (optional) The primary (usually "text") color                   |
| `background`   | (optional) The default page's background color                  |
| `brushFill`    | (optional) The fill color of the brush selection box            |
| `brushStroke`  | (optional) The stroke color of the brush selection box          |
| `selectFill`   | (optional) The fill color of the selection bounds               |
| `selectStroke` | (optional) The stroke color of the selection bounds and handles |

> Tip: If providing an object for the `theme` prop, either define the object outside of the parent component or memoize it with `React.useMemo`.

The renderer also accepts many (optional) event callbacks.

| Prop                        | Description                                               |
| --------------------------- | --------------------------------------------------------- |
| `onPan`                     | The user panned with the mouse wheel                      |
| `onZoom`                    | The user zoomed with the mouse wheel                      |
| `onPinch`                   | The user moved their pointers during a pinch              |
| `onPinchEnd`                | The user stopped a two-pointer pinch                      |
| `onPinchStart`              | The user began a two-pointer pinch                        |
| `onPointerMove`             | The user moved their pointer                              |
| `onPointerUp`               | The user ended a point                                    |
| `onPointShape`              | The user pointed a shape                                  |
| `onDoubleClickShape`        | The user double-pointed a shape                           |
| `onRightPointShape`         | The user right-pointed a shape                            |
| `onMoveOverShape`           | The user moved their pointer a shape                      |
| `onHoverShape`              | The user moved their pointer onto a shape                 |
| `onUnhoverShape`            | The user moved their pointer off of a shape               |
| `onPointHandle`             | The user pointed a shape handle                           |
| `onDoubleClickHandle`       | The user double-pointed a shape handle                    |
| `onRightPointHandle`-       | he user right-pointed a shape handle                      |
| `onMoveOverHandle`          | The user moved their pointer over a shape handle          |
| `onHoverHandle`             | The user moved their pointer onto a shape handle          |
| `onUnhoverHandle`           | The user moved their pointer off of a shape handle        |
| `onPointCanvas`             | The user pointed the canvas                               |
| `onDoubleClickCanvas`       | The user double-pointed the canvas                        |
| `onRightPointCanvas`        | The user right-pointed the canvas                         |
| `onPointBounds`             | The user pointed the selection bounds                     |
| `onDoubleClickBounds`       | The user double-pointed the selection bounds              |
| `onRightPointBounds`        | The user right-pointed the selection bounds               |
| `onPointBoundsHandle`       | The user pointed a selection bounds edge or corner        |
| `onDoubleClickBoundsHandle` | The user double-pointed a selection bounds edge or corner |
| `onBlurEditingShape`        | The user blurred an editing (text) shape                  |
| `onError`                   | The renderer encountered an error                         |

> Tip: If providing callbacks, either define the functions outside of the parent component or memoize them first with `React.useMemo`.

### `TLPage`

An object describing the current page. It contains:

| Property          | Type                        | Description                                                                 |
| ----------------- | --------------------------- | --------------------------------------------------------------------------- |
| `id`              | `string`                    | A unique id for the page.                                                   |
| `shapes`          | [`TLShape{}`](#tlshape)     | A table of shapes.                                                          |
| `bindings`        | [`TLBinding{}`](#tlbinding) | A table of bindings.                                                        |
| `backgroundColor` | `string`                    | (optional) The page's background fill color. Will also overwrite the theme. |

### `TLPageState`

An object describing the current page. It contains:

| Property           | Type       | Description                                         |
| ------------------ | ---------- | --------------------------------------------------- |
| `id`               | `string`   | The corresponding page's id                         |
| `selectedIds`      | `string[]` | An array of selected shape ids                      |
| `camera`           | `object`   | An object describing the camera state               |
| `camera.point`     | `number[]` | The camera's `[x, y]` coordinates                   |
| `camera.zoom`      | `number`   | The camera's zoom level                             |
| `currentParentId`  | `string`   | (optional) The current parent id for selection      |
| `brush`            | `TLBounds` | (optional) A `Bounds` for the current selection box |
| `pointedId`        | `string`   | (optional) The currently pointed shape id           |
| `hoveredId`        | `string`   | (optional) The currently hovered shape id           |
| `editingId`        | `string`   | (optional) The currently editing shape id           |
| `editingBindingId` | `string`   | (optional) The currently editing binding id         |

### `TLShape`

An object that describes a shape on the page. The shapes in your document should extend this interface with other properties. See [Guide: Create a Custom Shape](#create-a-custom-shape).

| Property              | Type                      | Description                                                                            |
| --------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `id`                  | `string`                  | The shape's id.                                                                        |
| `type`                | `string`                  | The type of the shape, corresponding to the `type` of a [`TLShapeUtil`](#tlshapeutil). |
| `parentId`            | `string`                  | The id of the shape's parent (either the current page or another shape).               |
| `childIndex`          | `number`                  | the order of the shape among its parent's children                                     |
| `name`                | `string`                  | the name of the shape                                                                  |
| `point`               | `number[]`                | the shape's current `[x, y]` coordinates on the page                                   |
| `rotation`            | `number`                  | (optiona) The shape's current rotation in radians                                      |
| `children`            | `string[]`                | (optional) An array containing the ids of this shape's children                        |
| `handles`             | [`TLHandle{}`](#tlhandle) | (optional) A table of `TLHandle` objects                                               |
| `isLocked`            | `boolean`                 | (optional) True if the shape is locked                                                 |
| `isHidden`            | `boolean`                 | (optional) True if the shape is hidden                                                 |
| `isEditing`           | `boolean`                 | (optional) True if the shape is currently editing                                      |
| `isGenerated`         | `boolean`                 | optional) True if the shape is generated programatically                               |
| `isAspectRatioLocked` | `boolean`                 | (optional) True if the shape's aspect ratio is locked                                  |

### `TLHandle`

An object that describes a relationship between two shapes on the page.

| Property | Type       | Description                                    |
| -------- | ---------- | ---------------------------------------------- |
| `id`     | `string`   | An id for the handle.                          |
| `index`  | `number`   | The handle's order within the shape's handles. |
| `point`  | `number[]` | The handle's `[x, y]` coordinates.             |

### `TLBinding`

An object that describes a relationship between two shapes on the page.

| Property | Type     | Description                                   |
| -------- | -------- | --------------------------------------------- |
| `id`     | `string` | A unique id for the binding.                  |
| `type`   | `string` | The binding's type.                           |
| `fromId` | `string` | The id of the shape where the binding begins. |
| `toId`   | `string` | The id of the shape where the binding begins. |

### `TLShapeUtil`

The `TLShapeUtil` is an abstract class that you can extend to create utilities for your custom shapes. See [Guide: Create a Custom Shape](#create-a-custom-shape).

## `inputs`

A class instance that stores the current pointer position and pressed keys.

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
