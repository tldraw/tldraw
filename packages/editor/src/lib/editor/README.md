# Editor internals

`Editor.ts` is the SDK's public surface and is meant to stay that way. Every public method and
its TSDoc lives on `Editor`, so consumers get one flat, documented object rather than a graph of
collaborating parts. Splitting that surface up is not the goal here.

What does move out is the implementation behind it. Two mechanisms, and only two:

- **A free function taking the editor**, `fn(editor, …)`, in a file next to `Editor.ts` or under
  `../utils/`. The default. Use it for logic with no lifetime of its own. `reorderShapes.ts` and
  `shapeIntegrity.ts` are the examples.
- **A manager extending `EditorManager`**, under `managers/`. Only when the thing owns state that
  outlives a call _and_ is read back through the editor as a named field (`editor.snaps`,
  `editor.fonts`). See `EditorManager`'s doc comment for the teardown contract.

A registry with no behavior is neither; leave it on `Editor`. Managers that only looked things up
have been folded back before.

Two rules make the moves safe to review:

- `api-report.api.md` stays byte-identical. A move that changes it is not a move. Run `yarn api-check`.
- Never widen a `private` to make a move compile. If a helper needs internals, it has not separated
  from the editor and belongs where it is.
