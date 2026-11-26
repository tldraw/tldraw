---
title: Libraries in documents
component: ./LibrariesDocumentsExample.tsx
priority: 21
keywords: [libraries, library, documents, files, workspace, browse, add, remove, default library]
---

Show a workspace's libraries in the documents that add them.

---

Two documents share the user's workspace libraries. Each document shows the libraries added to it, the user's default library, "My stash", and its own board library. A source that implements `getLibraryPlacement`, `getAvailableLibraries`, `addLibraryToDocument` and `removeLibraryFromDocument` tells the panel which libraries each document shows and lets people browse the rest. Switch documents with the buttons at the top, and use "Browse more libraries" at the bottom of the panel to add one.
