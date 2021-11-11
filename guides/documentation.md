# Documentation

## Introduction

This file contains the documentatin for the `<TLDraw>` component as well as the data model that the component accepts.

In addition to the docs written below, this project also includes **generated documentation**. To view the generated docs:

1. Run `yarn docs` from the root folder
2. Open the file at:

```
/packages/tldraw/docs/classes/TLDrawState.html
```

## `TLDraw`

The `TLDraw` React component is the [tldraw](https://tldraw.com) editor exported as a standalone component. You can control the editor through props, or through the `TLDrawState`'s imperative API. **All props are optional.**

| Prop              | Type             | Description                                                                                               |
| ----------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `id`              | `string`         | An id under which to persist the component's state.                                                       |
| `document`        | `TLDrawDocument` | An initial [`TLDrawDocument`](#tldrawdocument) object.                                                    |
| `currentPageId`   | `string`         | A current page id, referencing the `TLDrawDocument` object provided via the `document` prop.              |
| `autofocus`       | `boolean`        | Whether the editor should immediately receive focus. Defaults to true.                                    |
| `showMenu`        | `boolean`        | Whether to show the menu.                                                                                 |
| `showPages`       | `boolean`        | Whether to show the pages menu.                                                                           |
| `showStyles`      | `boolean`        | Whether to show the styles menu.                                                                          |
| `showTools`       | `boolean`        | Whether to show the tools.                                                                                |
| `showUI`          | `boolean`        | Whether to show any UI other than the canvas.                                                             |
| `showSponsorLink` | `boolean`        | Whether to show a sponsor link.                                                                           |
| `onMount`         | `Function`       | Called when the editor first mounts, receiving the current `TLDrawState`.                                 |
| `onPatch`         | `Function`       | Called when the state is updated via a patch.                                                             |
| `onCommand`       | `Function`       | Called when the state is updated via a command.                                                           |
| `onPersist`       | `Function`       | Called when the state is persisted after an action.                                                       |
| `onChange`        | `Function`       | Called when the `TLDrawState` updates for any reason.                                                     |
| `onUserChange`    | `Function`       | Called when the user's "presence" information changes.                                                    |
| `onUndo`          | `Function`       | Called when the `TLDrawState` updates after an undo.                                                      |
| `onRedo`          | `Function`       | Called when the `TLDrawState` updates after a redo.                                                       |
| `onSignIn`        | `Function`       | Called when the user selects Sign In from the menu.                                                       |
| `onSignOut`       | `Function`       | Called when the user selects Sign Out from the menu.                                                      |
| `onNewProject`    | `Function`       | Called when the user when the user creates a new project through the menu or through a keyboard shortcut. |
| `onSaveProject`   | `Function`       | Called when the user saves a project through the menu or through a keyboard shortcut.                     |
| `onSaveProjectAs` | `Function`       | Called when the user saves a project as a new project through the menu or through a keyboard shortcut.    |
| `onOpenProject`   | `Function`       | Called when the user opens new project through the menu or through a keyboard shortcut.                   |

> **Note**: For help with the file-related callbacks, see `useFileSystem`.

## `useFileSystem`

You can use the `useFileSystem` hook to get prepared callbacks for `onNewProject`, `onOpenProject`, `onSaveProject`, and `onSaveProjectAs`. These callbacks allow a user to save files via the [FileSystem](https://developer.mozilla.org/en-US/docs/Web/API/FileSystem) API.

```ts
import { TLDraw, useFileSystem } from '@tldraw/tldraw'

function App() {
  const fileSystemEvents = useFileSystem()

  return <TLDraw {...fileSystemEvents} />
}
```

## `TLDrawDocument`

You can initialize or control the `<TLDraw>` component via its `document` property. A `TLDrawDocument` is an object with three properties:

- `id` - A unique ID for this document
- `pages` - A table of `TLDrawPage` objects
- `pageStates` - A table of `TLPageState` objects
- `version` - The document's version, used internally for migrations.

```ts
import { TLDrawDocument, TLDrawState } from '@tldraw/tldraw'

const myDocument: TLDrawDocument = {
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

function App() {
  return <TLDraw document={myDocument} />
}
```

**Tip:** TLDraw is built on [@tldraw/core](https://github.com/tldraw/core). The pages and pageStates in TLDraw are objects containing `TLPage` and `TLPageState` objects from the core library. For more about these types, check out the [@tldraw/core](https://github.com/tldraw/core) documentation.

**Important:** In the `pages` object, each `TLPage` object must be keyed under its `id` property. Likewise, each `TLPageState` object must be keyed under its `id`. In addition, each `TLPageState` object must have an `id` that matches its corresponding page.

## Shapes

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

> **Important:** In order for re-ordering to work, a shape's `childIndex` values _must_ start from 1, not 0. The page or parent shape's "bottom-most" child should have a `childIndex` of 1.

The `ShapeStyle` object is a common style API for all shapes.

| Property   | Type         | Description                             |
| ---------- | ------------ | --------------------------------------- |
| `size`     | `SizeStyle`  | The size of the shape's stroke.         |
| `dash`     | `DashStyle`  | The style of the shape's stroke.        |
| `color`    | `ColorStyle` | The shape's color.                      |
| `isFilled` | `boolean`    | (optional) True if the shape is filled. |

### `DrawShape`

A hand-drawn line.

| Property | Type         | Description                               |
| -------- | ------------ | ----------------------------------------- |
| `points` | `number[][]` | An array of points as `[x, y, pressure]`. |

#### `RectangleShape`

A rectangular shape.

| Property | Type       | Description                             |
| -------- | ---------- | --------------------------------------- |
| `size`   | `number[]` | The `[width, height]` of the rectangle. |

### `EllipseShape`

An elliptical shape.

| Property | Type       | Description                         |
| -------- | ---------- | ----------------------------------- |
| `radius` | `number[]` | The `[x, y]` radius of the ellipse. |

### `ArrowShape`

An arrow that can connect shapes.

| Property      | Type     | Description                                                             |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `handles`     | `object` | An object with three `TLHandle` properties: `start`, `end`, and `bend`. |
| `decorations` | `object` | An object with two properties `start`, `end`, and `bend`.               |

### `TextShape`

A line of text.

| Property | Type     | Description               |
| -------- | -------- | ------------------------- |
| `text`   | `string` | The shape's text content. |

### `StickyShape`

A sticky note.

| Property | Type     | Description               |
| -------- | -------- | ------------------------- |
| `text`   | `string` | The shape's text content. |

## Bindings

A binding is a connection **from** one shape and **to** another shape. At the moment, only arrows may be bound "from". Most shapes may be bound "to", except other `ArrowShape` and `DrawShape`s.

| Property   | Type             | Description                                              |
| ---------- | ---------------- | -------------------------------------------------------- |
| `id`       | `string`         | The binding's own unique ID.                             |
| `fromId`   | `string`         | The id of the `ArrowShape` that the binding is bound to. |
| `toId`     | `string`         | The id of the other shape that the binding is bound to.  |
| `handleId` | `start` or `end` | The connected arrow handle.                              |
| `distance` | `number`         | The distance from the bound point.                       |
| `point`    | `number[]`       | A normalized point representing the bound point.         |

## `TLDrawState` API

You can change the `TLDraw` component's state through an imperative API called `TLDrawState`. To access this API, use the `onMount` callback, or any of the component's callback props, like `onPersist`.

```tsx
import { TLDraw, TLDrawState } from '@tldraw/tldraw'

function App() {
  const handleMount = React.useCallback((state: TLDrawState) => {
    state.selectAll()
  }, [])

  return <TLDraw onMount={handleMount} />
}
```

To view the full documentation of the `TLDrawState` API, generate the project's documentation by running `yarn docs` from the root folder, then open the file at:

```
/packages/tldraw/docs/classes/TLDrawState.html
```

Here are some useful methods:

- `loadDocument`
- `select`
- `selectAll`
- `selectNone`
- `delete`
- `deleteAll`
- `deletePage`
- `changePage`
- `cut`
- `copy`
- `paste`
- `copyJson`
- `copySvg`
- `undo`
- `redo`
- `zoomIn`
- `zoomOut`
- `zoomToContent`
- `zoomToSelection`
- `zoomToFit`
- `zoomTo`
- `resetZoom`
- `setCamera`
- `resetCamera`
- `align`
- `distribute`
- `stretch`
- `nudge`
- `duplicate`
- `flipHorizontal`
- `flipVertical`
- `rotate`
- `style`
- `group`
- `ungroup`
- `createShapes`
- `updateShapes`
- `updateDocument`
- `updateUsers`
- `removeUser`
- `setSetting`
- `selectTool`
- `cancel`

Check the generated docs, source or the TypeScript types for more on these and other methods.
