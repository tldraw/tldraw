---
title: Mark exams
component: ./ExamMarkingExample.tsx
category: use-cases
priority: 1
keywords:
  [annotation, camera options, constraints, zoom, pan, camera bounds, pan speed, zoom speed, scroll]
---

A tool for marking exams. It has common pdf annotation tools with a built in tool for tallying a student's score

---

This example, built on top of the [pdf-editor](https://examples.tldraw.com/pdf-editor) example, shows how you might take a more tailored approach to builing a pdf editor experience. It includes:
- A custom shape called `exam-mark` that allows you to input scores on a per question basis.
- A custom tool to place that shape.
- A widget that shows the total exam score (the sum of all `exam-mark` scores in the document), useful if you wanted to export it the total score to a database.