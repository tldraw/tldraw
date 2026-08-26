---
title: Mark exams
component: ./ExamMarkingExample.tsx
priority: 4
keywords: [education, pdf, annotation, marking, scoring, grading, toolbar, ui overrides, widget]
---

Mark up an exam PDF with per-question score shapes and see the total tallied live.

---

This builds on the [pdf-editor](https://examples.tldraw.com/pdf-editor) example (a copy of it lives in the `pdf-editor` folder here) and adds:

- An `exam-mark` custom shape: a small numeric input whose value is stored in the shape's `score` prop.
- A `mark` tool that places an exam mark where you click, plus a select-tool override so double-clicking the canvas does the same.
- A `SharePanel` widget that sums the scores of every `exam-mark` on the page with `useValue`, so it updates as marks are added, edited, or removed.
- UI overrides that add the tool to the toolbar and the keyboard shortcuts dialog (shortcut `M`).

Try it: open the example exam, click on a question to drop a mark, type a score, and watch the total change.
