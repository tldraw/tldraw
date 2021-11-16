# Sessions

A session is a class that handles events for interactions that have a beginning, middle and end.

They contrast with Commands, such as `duplicate`, which occur once.

The `tldrawApp` may only have one active session at a time (`tldrawApp.session`), or it may have no session. It may never have two sessions simulataneously—if a session begins while another session is already in progress, `tldrawApp` will throw an error. In this way, sessions function similar to a set of finite states: once a session begins, it must end before a new session can begin.

## Creating a Session

Sessions are created with `tldrawApp.startSession`. In this method, sessions are creating using the `new` keyword. Every session's constructor receives the `tldrawApp` instance's current state (`tldrawApp.state`), together with any additional parameters it defines in its constructor.

## Life Cycle Methods

A session has four life-cycle methods: `start`, `update`, `cancel` and `complete`.

### Start

When a session is created using `tldrawApp.startSession`, `tldrawApp` also calls the session's `start` method, passing in the state as the only parameter. If the `start` method returns a patch, then that patch is applied to the state.

### Update

When a session is updated using `tldrawApp.updateSession`, `tldrawApp` calls the session's `update` method, again passing in the state as well as several additional parameters: `point`, `shiftKey`, `altKey`, and `metaKey`. If the `update` method returns a patch, then that patch is applied to the state.

A session may use whatever information is wishes internally in order to produce its update patch. Often this means saving information about the initial state, point, or initial selected shapes, in order to compare against the update's parameters. For example, `RotateSession.update` saves the center of the selection bounds, as well as the initial angle from this center to the user's initial point, in order to compare this angle against the angle from this center to the user's current point.

### Cancel

A session may be cancelled using `tldrawApp.cancelSession`. When a session is cancelled, `tldrawApp` calls the session's `cancel` method passing in the state as the only parameter. If the `cancel` method returns a patch, then that patch is applied to the state.

A cancel method is expected to revert any changes made to the state since the session began. For example, `RotateSession.cancel` should restore the rotations of the user's selected shapes to their original rotations. If no change has occurred (e.g. if the rotation began and was immediately cancelled) then the `cancel` method should return `undefined` so as to avoid updating the state.

### Complete

A session may be cancelled using `tldrawApp.complete`. When a session is cancelled, `tldrawApp` calls the session's `complete` method passing in the state as the only parameter. If the `complete` method returns a patch, then that patch is applied to the state; if it returns a `command`, then that command is patched and added to the state's history.

If the `complete` method returns a command, then it is expected that the command's `before` patch will revert any changes made to the state since the session began, including any changes introduced in the command's `after` patch.

## Notes

A session should always be cancelled by pressing escape.
