<div style="text-align: center; transform: scale(.5);">
  <img src="card-repo.png"/>
</div>

# @tldraw/tldraw

This package contains the [tldraw](https://tldraw.com) editor as a React component named `<TLDraw>`. You can use this package to embed the editor in any React application.

🎨 Want to build your own tldraw-ish app instead? Try [@tldraw/core](https://github.com/tldraw/core).

💕 Love this library? Consider [becoming a sponsor](https://github.com/sponsors/steveruizok?frequency=recurring&sponsor=steveruizok).

## Installation

Use your package manager of choice to install `@tldraw/core` and its peer dependencies.

```bash
yarn add @tldraw/tldraw
# or
npm i @tldraw/tldraw
```

## Usage

Import the `TLDraw` React component and use it in your app.

```tsx
import { TLDraw } from '@tldraw/tldraw'

function App() {
  return <TLDraw />
}
```

### Persisting the State

You can use the `id` to persist the state in a user's browser storage.

```tsx
import { TLDraw } from '@tldraw/tldraw'

function App() {
  return <TLDraw id="myState" />
}
```

### Controlling the Component through Props

You can control the `TLDraw` component through its props.

```tsx
import { TLDraw, TLDrawDocument } from '@tldraw/tldraw'

function App() {
  const myDocument: TLDrawDocument = {}

  return <TLDraw document={document} />
}
```

### Controlling the Component through the TLDrawState API

You can also control the `TLDraw` component imperatively through the `TLDrawState` API.

```tsx
import { TLDraw, TLDrawState } from '@tldraw/tldraw'

function App() {
  const handleMount = React.useCallback((tlstate: TLDrawState) => {
    tlstate.selectAll()
  }, [])

  return <TLDraw onMount={handleMount} />
}
```

Internally, the `TLDraw` component's user interface uses this API to make changes to the component's state. See the `TLDrawState` section for more on this API.

### Responding to Changes

You can respond to changes and user actions using the `onChange` callback.

```tsx
import { TLDraw, TLDrawState } from '@tldraw/tldraw'

function App() {
  const handleChange = React.useCallback((tlstate: TLDrawState, reason: string) => {}, [])

  return <TLDraw onMount={handleMount} />
}
```

Internally, the `TLDraw` component's user interface uses this API to make changes to the component's state. See the `TLDrawState` section for more on this API.

## Documentation

### `TLDraw`

The `TLDraw` React component is the [tldraw](https://tldraw.com) editor exported as a standalone component. You can control the editor through props, or through the `TLDrawState`'s imperative API. **All props are optional.**

| Prop            | Type             | Description                                                                                                                                                  |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`            | `string`         | An id under which to persist the component's state.                                                                                                          |
| `document`      | `TLDrawDocument` | An initial [`TLDrawDocument`](#tldrawdocument) object.                                                                                                       |
| `currentPageId` | `string`         | A current page id, referencing the `TLDrawDocument` object provided via the `document` prop.                                                                 |
| `onMount`       | `Function`       | A callback function that will be called when the editor first mounts, receiving the current `TLDrawState`.                                                   |
| `onChange`      | `Function`       | A callback function that will be called whenever the `TLDrawState` updates. The update will include the current `TLDrawState` and the reason for the change. |
| `onUserChange`  | `Function`       | A callback function that will be fired when the user's "presence" information changes.                                                                       |
| `autofocus`     | `boolean`        | Whether the editor should immediately receive focus. Defaults to true.                                                                                       |
| `showMenu`      | `boolean`        | Whether to show the menu.                                                                                                                                    |
| `showPages`     | `boolean`        | Whether to show the pages menu.                                                                                                                              |
| `showStyles`    | `boolean`        | Whether to show the styles menu.                                                                                                                             |
| `showTools`     | `boolean`        | Whether to show the tools.                                                                                                                                   |
| `showUI`        | `boolean`        | Whether to show any UI other than the canvas.                                                                                                                |

### `TLDrawDocument`

A `TLDrawDocument` is an object with three properties:

- `id` - A unique ID for this document
- `pages` - A table of `TLDrawPage` objects
- `pageStates` - A table of `TLPageState` objects
- `version` - The document's version, used internally for migrations.

```ts
import { TLDrawDocument, TLDrawState } from '@tldraw/tldraw'

const tldocument: TLDrawDocument = {
  id: 'doc',
  version: TLDrawState.version,
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

**Tip:** TLDraw is built [@tldraw/core](https://github.com/tldraw/core). The pages and pagestates in TLDraw are just objects containing `TLPage` and `TLPageState` objects from the core library. For more about these types, check out the [@tldraw/core](https://github.com/tldraw/core) documentation.

**Important:** In the `pages` object, each `TLPage` object must be keyed under its `id` property. Likewise, each `TLPageState` object must be keyed under its `id`. In addition, each `TLPageState` object must have an `id` that matches its corresponding page.

### Shapes

Your `TLPage` objects may include shapes: objects that fit one of the `TLDrawShape` interfaces listed below. All `TLDrawShapes` extends a common interface:

| Property              | Type             | Description                                                     |
| --------------------- | ---------------- | --------------------------------------------------------------- |
| `id`                  | `string`         | A unique ID for the shape.                                      |
| `name`                | `string`         | The shape's name.                                               |
| `type`                | `string`         | The shape's type.                                               |
| `parentId`            | `string`         | The ID of the shape's parent (a shape or its page).             |
| `childIndex`          | `number`         | The shape's order within its parent's children, indexed from 1. |
| `point`               | `number[]`       | The `[x, y]` position of the shape.                             |
| `rotation`            | `number[]`       | (optional) The shape's rotation in radians.                     |
| `children`            | `string[]`       | (optional) The shape's child shape ids.                         |
| `handles`             | `TLDrawHandle{}` | (optional) A table of `TLHandle` objects.                       |
| `isLocked`            | `boolean`        | (optional) True if the shape is locked.                         |
| `isHidden`            | `boolean`        | (optional) True if the shape is hidden.                         |
| `isEditing`           | `boolean`        | (optional) True if the shape is currently editing.              |
| `isGenerated`         | `boolean`        | (optional) True if the shape is generated.                      |
| `isAspectRatioLocked` | `boolean`        | (optional) True if the shape's aspect ratio is locked.          |

> **Important:** In order for re-ordering to work correctly, a shape's `childIndex` values _must_ start from 1, not 0. The page or parent shape's "bottom-most" child should have a `childIndex` of 1.

The `ShapeStyle` object is a common style API for all shapes.

| Property   | Type         | Description                             |
| ---------- | ------------ | --------------------------------------- |
| `size`     | `SizeStyle`  | The size of the shape's stroke.         |
| `dash`     | `DashStyle`  | The style of the shape's stroke.        |
| `color`    | `ColorStyle` | The shape's color.                      |
| `isFilled` | `boolean`    | (optional) True if the shape is filled. |

#### `DrawShape`

A hand-drawn line.

| Property | Type         | Description                               |
| -------- | ------------ | ----------------------------------------- |
| `points` | `number[][]` | An array of points as `[x, y, pressure]`. |

##### `RectangleShape`

A rectangular shape.

| Property | Type       | Description                             |
| -------- | ---------- | --------------------------------------- |
| `size`   | `number[]` | The `[width, height]` of the rectangle. |

#### `EllipseShape`

An elliptical shape.

| Property | Type       | Description                         |
| -------- | ---------- | ----------------------------------- |
| `radius` | `number[]` | The `[x, y]` radius of the ellipse. |

#### `ArrowShape`

An arrow that can connect shapes.

| Property      | Type     | Description                                                             |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `handles`     | `object` | An object with three `TLHandle` properties: `start`, `end`, and `bend`. |
| `decorations` | `object` | An object with two properties `start`, `end`, and `bend`.               |

#### `TextShape`

A line of text.

| Property | Type     | Description               |
| -------- | -------- | ------------------------- |
| `text`   | `string` | The shape's text content. |

#### `StickyShape`

A sticky note.

| Property | Type     | Description               |
| -------- | -------- | ------------------------- |
| `text`   | `string` | The shape's text content. |

### Bindings

A binding is a connection **from** one shape and **to** another shape. At the moment, only arrows may be bound "from". Most shapes may be bound "to", except other `ArrowShape` and `DrawShape`s.

| Property   | Type             | Description                                              |
| ---------- | ---------------- | -------------------------------------------------------- |
| `id`       | `string`         | The binding's own unique ID.                             |
| `fromId`   | `string`         | The id of the `ArrowShape` that the binding is bound to. |
| `toId`     | `string`         | The id of the other shape that the binding is bound to.  |
| `handleId` | `start` or `end` | The connected arrow handle.                              |
| `distance` | `number`         | The distance from the bound point.                       |
| `point`    | `number[]`       | A normalized point representing the bound point.         |

## Local Development

- Run `yarn` to install dependencies.

- Run `yarn start` to start the development server for the package and for the example.

- Open `localhost:5420` to view the example project.

- Run `yarn test` to execute unit tests via [Jest](https://jestjs.io).

- Run `yarn docs` to build the docs via [ts-doc](https://typedoc.org/).

## Example

See the `example` folder.

## Community

### Support

Need help? Please [open an issue](https://github.com/tldraw/tldraw/issues/new) for support.

### Discussion

Want to connect with other devs? Visit the [Discord channel](https://discord.gg/s4FXZ6fppJ).

### License

This project is licensed under MIT. If you're using the library in a commercial product, please consider [becoming a sponsor](https://github.com/sponsors/steveruizok?frequency=recurring&sponsor=steveruizok).

## Author

- [@steveruizok](https://twitter.com/steveruizok)
