---
title: Table project tracker
component: ./TableProjectTrackerExample.tsx
priority: 3
keywords: [table, project tracker, status, checkbox, use case, showcase]
---

A project tracker built from the table shape — status badges and checkboxes.

---

A showcase of the table shape used the way a customer would: a header row, a status
column rendered as a colored badge, and a done column rendered as a checkbox. The
status and checkbox kinds are registered with the cell-kind registry (storing their
data in `meta`), so the same table that holds rich text also holds typed,
custom-rendered cells. Double-click the task or owner cells to edit them.
