# tldraw

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test tldraw` to execute the unit tests via [Jest](https://jestjs.io).

### `onChange`

The `onChange` prop accepts a callback function that will be called whenever something about the `TLDrawState` changes. The function will receive the current `TLDrawState` instance and the reason for the change.

- `"session"` - The state changed while the user performed a session, such as while rotating a selected shapes. When completed, a session will end with a`command` change.
- `"command"` A command was executed, either as a one-off (e.g. "align shapes") or at the completion of a session.
- `"undo"` - The user undid a command.
- `"redo"` - The user redid a command.
- `"camera"` The user moved the camera by panning, piching or wheeling.
