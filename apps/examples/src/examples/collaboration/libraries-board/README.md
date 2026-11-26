---
title: Board libraries
component: ./LibrariesBoardExample.tsx
priority: 12
keywords: [libraries, library, board, document, store, schema, records, reusable shapes]
---

Keep libraries in the document itself, next to its shapes.

---

`BoardLibrarySource` stores libraries and their items as records in the editor's store, so they travel with the document: they're saved, synced and copied along with the shapes. Register `librarySchemaRecords` on the store's schema and give the source the editor.

Select some shapes, then use "Add to library" in the context menu to start a library on this board.
