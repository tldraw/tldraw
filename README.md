# tldraw

A tiny little drawing app.

Visit [tldraw.com](https://tldraw.com/).

## Author

- [steveruizok](https://twitter.com/steveruizok)
- ...and more!

## Support

To support this project (and gain access to the project while it is in development) you can [sponsor the author](https://github.com/sponsors/steveruizok) on GitHub. Thanks!

## Documentation

...

## Local Development

1. Download or clone the repository.

   ```bash
   git clone https://github.com/tldraw/tldraw.git
   ```

2. Install dependencies.

   ```bash
   yarn
   ```

3. Start the development server.

   ```bash
   yarn dev
   ```

4. Open the local site at `https://localhost:3000`.

This project is a [Next.js](https://nextjs.org/) project. If you've worked with Next.js before, the tldraw code-base and setup instructions should all be very familiar.

## How it works

The app's state is a very large state machine located in `state/state.ts`. The machine is organized as a tree of state notes, such as `selecting` and `pinching`.

```
root
├── loading
└── ready
    ├── selecting
    │   ├── notPointing
    │   ├── pointingBounds
    │   ├── translatingSelection
    │   └── ...
    ├── usingTool
    ├── pinching
    └── ...
```

### State Nodes

Nodes may be active or inactive. The root node is always active. Depending on what's happened in the app, different branches of the state tree may be active, while other branches may be inactive.

```ts
pinching: {
  onExit: { secretlyDo: 'updateZoomCSS' },
  initial: 'selectPinching',
  states: {
    selectPinching: {
      on: {
        STOPPED_PINCHING: { to: 'selecting' },
      },
    },
    toolPinching: {
      on: {
        STOPPED_PINCHING: { to: 'usingTool.previous' },
      },
    },
  },
},
```

State nodes are both a way to describe the state (e.g., "the pinching state is active") and a way of organizing events. Each node has a set of events (`on`). When the state receives an event, it will execute the event handlers on each of the machine's _active_ states where the event is present.

### Event Handlers

Event handlers contain references to event handler functions: `actions`, `conditions`, `results`, and `async`s. These are defined at the bottom of the state machine's configuration.

An event handler may be a single action:

```ts
on: {
  MOVED_POINTER: 'updateRotateSession',
}
```

Or it may be an array of actions:

```ts
on: {
  MOVED_TO_PAGE: ['moveSelectionToPage', 'zoomCameraToSelectionActual'],
}
```

Or it may be an object with conditions under `if` or `unless` and actions under `do`:

```ts
on: {
  SAVED_CODE: {
    unless: 'isReadOnly',
    do: 'saveCode',
  }
}
```

An event handler may also contain transitions under `to`:

```ts
on: {
  STOPPED_PINCHING: { to: 'selecting' },
},
```

As well as nested event handlers under control flow, `then` and `else`.

```ts
on: {
  STOPPED_POINTING: {
    if: 'isPressingShiftKey',
    then: {
      if: 'isPointedShapeSelected',
      do: 'pullPointedIdFromSelectedIds',
    },
    else: {
      if: 'isPointingShape',
      do: [
        'clearSelectedIds',
        'setPointedId',
        'pushPointedIdToSelectedIds',
      ],
    },
  },
}
```

And finally, an event handler may have arrays of event handler objects.

```ts
on: {
  STOPPED_POINTING: [
    'completeSession',
    {
      if: 'isToolLocked',
      to: 'dot.creating',
      else: {
        to: 'selecting'
      },
    },
  ],
}
```

### Event Handler Functions

The configuration's event handlers work by calling event handler functions. While each event handler function does a different job, all event handler functions receive the _same_ three parameters:

1. The machine's current `data` draft
2. The payload sent by the event that has caused the function to run
3. The most recent result returned by a `result` function

> Note: The `payload` and `result` parameters must be typed manually inline.

```ts
eventHandlerFn(data, payload: { id: string }, result: Shape) {}
```

Results may return any value.

```ts
pageById(data, payload: { id: string }) {
  return data.document.pages[payload.id]
}
```

Conditions must return `true` or `false`.

```ts
pageIsCurrentPage(data, payload, result: Page) {
  return data.currentPageId === result.id
}
```

Actions may mutate the `data` draft.

```ts
setCurrentPageId(data, payload, result: Page) {
  data.currentPageId = result.id
}
```

In a state's event handlers, event handler functions are referred to by name.

```ts
on: {
  SOME_EVENT: {
    get: "pageById"
    unless: "pageIsCurrentPage",
    do: "setCurrentPageId"
  }
}
```

Asyncs are asynchronous functions. They work like results, but resolve data instead.

```ts
async getCurrentUser(data) {
  return fetch(`https://tldraw/api/users/${data.currentUserId}`)
}
```

These are used in asynchronous event handlers:

```ts
loadingUser: {
  async: {
    await: "getCurrentUser",
    onResolve: { to: "user" },
    onReject: { to: "error" },
  }
}
```

### State Updates

The state will update each time it:

1. receives an event...
2. that causes it to run an event handler...
3. that passes its conditions...
4. and that contains either an action or a transition

Such updates are batched: while a single event may cause several event handlers to run, the state will update only once provided that at least one of the event handlers caused an action or transition to occur.

When a state updates, it will cause any subscribed components to update via hooks.

### Subscribing to State

To use the state's data reactively, we use the `useSelector` hook.

```tsx
import state, { useSelector } from 'state'

function SomeComponent() {
  const pointingId = useSelector((s) => s.data.pointingId)

  return <div>The pointing id is {pointingId}</div>
}
```

Each time the state updates, the hook will check whether the data returned by the selector function matches its previous data. If the answer is false (ie if the data is new) the hook will update and the new data will become its previous data.

The hook may also accept a second parameter, a comparison function. If the selector function returns anything other than a primitive, we will often use a comparison function to correctly find changes.

```tsx
import state, { useSelector } from 'state'
import { deepCompareArrays } from 'utils'

function SomeComponent() {
  const selectedIds = useSelector(
    (s) => tld.getSelectedShapes(s.data).map((shape) => shape.id),
    deepCompareArrays
  )

  return <div>The selected ids are {selectedIds.toString()}</div>
}
```

### Events

Events are sent from the user interface to the state.

```ts
import state from 'state'

state.send('SELECTED_DRAW_TOOL')
```

Events may also include payloads of data.

```ts
state.send('ALIGNED', { type: AlignType.Right })
```

The payload will become the second parameter of any event handler function that runs as a result of the event.

Note that with very few exceptions, we send events to the state regardless of whether the state can handle the event. Whether the event should have an effect—and what that effect should be—these questions are left entirely to the state machine.

> Note: You can send an event to the state from anywhere in the app: even from components that are not subscribed to the state. See the components/style-panel files for examples.

### Commands and History

The app uses a command pattern to keep track of what has happened in the app, and to support an undo and redo stack. Each command includes a `do` method and an `undo` method. When the command is created, it will run its `do` method. If it is "undone", it will run its `undo` method. If the command is "redone", it will run its `do` method again.

```ts
export default function nudgeCommand(data: Data, delta: number[]): void {
  const initialShapes = tld.getSelectedShapeSnapshot(data, () => null)

  history.execute(
    data,
    new Command({
      name: 'nudge_shapes',
      category: 'canvas',
      do(data) {
        tld.mutateShapes(
          data,
          initialShapes.map((shape) => shape.id),
          (shape, utils) => {
            utils.setProperty(shape, 'point', vec.add(shape.point, delta))
          }
        )
      },
      undo(data) {
        tld.mutateShapes(
          data,
          initialShapes.map((shape) => shape.id),
          (shape, utils) => {
            utils.setProperty(shape, 'point', vec.sub(shape.point, delta))
          }
        )
      },
    })
  )
}
```

Undos are not done programatically. It's the responsibility of a command to ensure that any mutations made in its `do` method are correctly reversed in its `undo` method.

> Note: All mutations to a shape must be done through a shape's utils (the structure returned by `getShapeUtils`). Currently, many commands do this directly: however we're currently working on a more robust API for this, with built-in support for side effects, such as shown with `mutateShapes` above.

### Sessions

Not every change to the app's state needs to be put into the undo / redo stack. Sessions are a way of managing the data associated with certain states that lie _between_ commands, such as when a user is dragging a shape to a new position.

Sessions are managed by the SessionManager (`state/session`). It guarantees that only one session is active at a time and allows other parts of the app's state to access information about the current session.

A session's life cycle is accessed via four methods, `begin`, `update`, `cancel` and `complete`. Different sessions will implement these methods in different ways.

A session begins when constructed.

```ts
session.begin(
  new Sessions.TranslateSession(
    data,
    tld.screenToWorld(inputs.pointer.origin, data)
  )
)
```

Next, the session receives updates. Note that we're passing in the `data` draft from an action. The session will make any necessary changes to the draft.

```ts
session.update<Sessions.TranslateSession>(
  data,
  tld.screenToWorld(payload.point, data),
  payload.shiftKey,
  payload.altKey
)
```

> Note: To get proper typing in `session.update`, you must provide the generic type of the session you're updating.

When a session completes, the session calls a method. This way, a user is able to travel back through the undo stack, visit only discrete commands (like deleting a shape) and those commands that marked the end of a session.

```ts
session.complete(data)
```

A session may also be cancelled.

```ts
session.cancel(data)
```

When cancelled, it is the responsibility of the session to restore the state to exactly how it was when the session began, reversing any changes that were made to the state during the session.

For this reason, many sessions begin by taking a snapshot of the current draft.

> Because the draft is a JavaScript Proxy, you must deep clone any parts of the draft that you want to include in a snapshot. (Direct references will fail as the underlying Proxy will have expired.) While the memory size of a snapshot is not usually a concern, this deep-cloning process is thread-blocking, so try to snapshot only the parts of the `data` draft that you need.
