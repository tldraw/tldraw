---
title: Table CSV import / export
component: ./TableCsvExample.tsx
priority: 5
keywords: [table, csv, export, import, data]
---

Export a table to CSV and import a CSV back into it.

---

The SDK exposes the data accessors — `getTableData` (table → ordered 2D array of
plain text) and `setCellText` — and leaves CSV/Excel serialization to the
consumer. This example is that reference: "Export CSV" serializes `getTableData`
and downloads it; "Import CSV" parses a file, grows the table to fit with
`insertRow`/`insertColumn`, and writes each cell with `setCellText`.
