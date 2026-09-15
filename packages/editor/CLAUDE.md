# packages/editor

## Managers

- Editor subsystems live in `packages/editor/src/lib/editor/managers/` as classes owned and disposed by the `Editor`.
- A manager that subscribes to events or holds a resource should extend `EditorManager` and register its cleanup so it runs on `dispose()`: `addEditorEvent(event, fn)` for editor bus events, `register(fn)` for everything else (store side effects, reactions, DOM listeners, child resources). Use `editor.timers` for timeouts/intervals/frames and `editor.disposables` for cleanup on the editor itself.
- Don't extend `EditorManager` for managers with no teardown. See the `EditorManager` doc comment for the full decision guide.
