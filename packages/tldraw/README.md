# @tldraw/tldraw

> 🚧 This library is in active development. Some of the docs below may to out of sync with the library. When in doubt, check the TypeScript typings in your editor, the source code, or the **[CodeSandbox example](https://codesandbox.io/s/tldraw-example-n539u)**.

This package contains the [tldraw](https://tldraw.com) editor as a standalone React component.

## Installation

```bash
yarn add @tldraw/tldraw --peer
```

## Usage

Import the `TLDraw` React component and use it in your app.

```tsx
import { TLDraw } from '@tldraw/tldraw'

function App() {
  return (
    <div>
      <TLDraw />
    </div>
  )
}
```

## Documentation

### `TLDraw`

The `TLDraw` React component is the [tldraw](https://tldraw.com) editor exported as a standalone component. You can control the editor through props, or through the `TLDrawState`'s imperative API.

| Prop            | Type                            | Description                                                                                                                                                             |
| --------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document`      | `TLDrawDocument`                | (optional) An initial [`TLDrawDocument`](#tldrawdocument) object.                                                                                                       |
| `currentPageId` | `string`                        | (optional) A current page id, referencing the `TLDrawDocument` object provided via the `document` prop.                                                                 |
| `onMount`       | `(TLDrawState) => void`         | (optional) A callback function that will be called when the editor first mounts, receiving the current `TLDrawState`.                                                   |
| `onChange`      | `(TLDrawState, string) => void` | (optional) A callback function that will be called whenever the `TLDrawState` updates. The update will include the current `TLDrawState` and the reason for the change. |

### `TLDrawDocument`

A `TLDrawDocument` is an object with three properties:

- `id` - A unique ID for this document
- `pages` - A table of `TLPage` objects
- `pageStates` - A table of `TLPageState` objects

```ts
const tldocument: TLDrawDocument = {
  id: 'doc',
  pages: {
    page1: {
      id: 'page1',
      shapes: {},
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: [],
      currentParentId: 'page1',
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
}
```

**Important:** In the `pages` object, each `TLPage` object must be keyed under its `id` property. Likewise, each `TLPageState` object must be keyed under its `id`. In addition, each `TLPageState` object must have an `id` that matches its corresponding page.

In the example above, the page above with the id `page1`is at `tldocument.pages["page1"]`. Its corresponding page state has the same id (`page1`) and is at `tldocument.pageStates["page1"]`.

### Shapes

Your `TLPage` objects may include shapes: objects that fit one of the `TLDrawShape` interfaces listed below. All `TLDrawShapes` extends a common interface:

| Property              | Type         | Description                                                     |
| --------------------- | ------------ | --------------------------------------------------------------- |
| `id`                  | `string`     | A unique ID for the shape.                                      |
| `name`                | `string`     | The shape's name.                                               |
| `type`                | `string`     | The shape's type.                                               |
| `parentId`            | `string`     | The ID of the shape's parent (a shape or its page).             |
| `childIndex`          | `number`     | The shape's order within its parent's children, indexed from 1. |
| `point`               | `number[]`   | The `[x, y]` position of the shape.                             |
| `rotation`            | `number[]`   | (optional) The shape's rotation in radians.                     |
| `children`            | `string[]`   | (optional) The shape's child shape ids.                         |
| `handles`             | `TLHandle{}` | (optional) A table of `TLHandle` objects.                       |
| `isLocked`            | `boolean`    | True if the shape is locked.                                    |
| `isHidden`            | `boolean`    | True if the shape is hidden.                                    |
| `isEditing`           | `boolean`    | True if the shape is currently editing.                         |
| `isGenerated`         | `boolean`    | True if the shape is generated.                                 |
| `isAspectRatioLocked` | `boolean`    | True if the shape's aspect ratio is locked.                     |

> **Important:** In order for re-ordering to work correctly, a shape's `childIndex` values _must_ start from 1, not 0. The page or parent shape's "bottom-most" child should have a `childIndex` of 1.

The `ShapeStyle` object is a common style API for all shapes.

| Property   | Type         | Description                             |
| ---------- | ------------ | --------------------------------------- |
| `size`     | `SizeStyle`  | The size of the shape's stroke.         |
| `dash`     | `DashStyle`  | The style of the shape's stroke.        |
| `color`    | `ColorStyle` | The shape's color.                      |
| `isFilled` | `boolean`    | (optional) True if the shape is filled. |

#### Draw

| Property | Type         | Description                               |
| -------- | ------------ | ----------------------------------------- |
| `points` | `number[][]` | An array of points as `[x, y, pressure]`. |

##### Rectangle

| Property | Type       | Description                             |
| -------- | ---------- | --------------------------------------- |
| `size`   | `number[]` | The `[width, height]` of the rectangle. |

#### Ellipse

| Property | Type       | Description                         |
| -------- | ---------- | ----------------------------------- |
| `radius` | `number[]` | The `[x, y]` radius of the ellipse. |

#### Arrow

| Property  | Type     | Description                                                             |
| --------- | -------- | ----------------------------------------------------------------------- |
| `handles` | `object` | An object with three `TLHandle` properties: `start`, `end`, and `bend`. |

#### Text

| Property | Type     | Description               |
| -------- | -------- | ------------------------- |
| `text`   | `string` | The shape's text content. |

## Development

### Running unit tests

Run `nx test tldraw` to execute the unit tests via [Jest](https://jestjs.io).
