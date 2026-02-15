---
title: Scripter
component: ./EditorControllerRepl.tsx
category: editor-api
priority: 3
keywords: [editor controller, scripter, scripting, automation, imperative, console, repl]
---

Write and run scripts against the tldraw editor using the EditorController API.

---

A Scripter-style environment for writing and running scripts against the canvas. The left panel has a script list, a code editor, and a console output area. Hit **⌘+Enter** (or the **▶ Run** button) to execute.

Available globals:

- `editor` / `e` — the Editor instance
- `controller` / `c` — an EditorController for imperative commands
- `print(...)` — log output to the console
