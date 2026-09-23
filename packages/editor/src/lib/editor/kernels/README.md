# Kernels

A kernel is the algorithm behind an `Editor` method, with the editor taken out of it: data in, data
out. `Editor` keeps the public member, its docs, its decorators, its reads and all of its writes.

```ts
// Editor.ts
getConstrainedCamera(point: VecLike, opts?: TLCameraMoveOptions): CameraXYZ {
	const current = this.getCamera()
	// ... gather the rest
	return constrainCamera({ current, requested, constraints, viewport, baseZoom, resetZoom })
}
```

## Rules

- **A kernel imports nothing that can reach the editor.** Primitives, `@tldraw/utils`, and types.
  Never `Editor`, a manager, `@tldraw/state`, `@tldraw/store`, the DOM, or another kernel. The
  dependency graph stays a star, so a kernel can be read and tested on its own.
- **Editor gathers inputs where the old code read them**, in the same order, on the same branches.
  Subclasses override these getters and reactive dependency capture is call-order sensitive, so a
  read hoisted out of its branch changes behavior in ways types and most tests won't catch.
- **Never hoist a read across a shape util callback.** `onResize`, `canBeLaidOut` and friends can
  read or change editor state, so a read that came after one stays after it.
- **Kernels return plans, not effects.** Deltas, partials, positions. Every `updateShapes`,
  `run`, and history call stays in the shell.
- **Callback-heavy code keeps its choreography in the shell.** When only the arithmetic is pure,
  extract only the arithmetic. A kernel that needs the editor back is a kernel that shouldn't exist.

## What this is not

Kernels don't hide the editor behind a port, and they don't own state. Code that is genuinely a
graph walk over editor queries (cluster building, ancestor search) belongs in a free function
`fn(editor, …)`, not here.
