---
title: Mark exams
component: ./ExamMarkingExample.tsx
category: use-cases
priority: 4
keywords: [education, pdf, annotation, toolbar, util, ui overrides]
---

A tool for marking exams. It includes common pdf annotation tools, as well as a built in tool for marking individual questions and tallying the total score of the exam.

---

This example, built on top of the [pdf-editor](https://examples.tldraw.com/pdf-editor) example, shows how you might take a more tailored approach to building a pdf editor experience. It includes:

- A custom shape called `exam-mark` that allows you to add marks on a per question basis.
- A custom tool to place the `exam-mark` shape.
- A widget that shows the total exam score (the sum of all `exam-mark` scores in the document), useful if you wanted to export it the total score to a database.
