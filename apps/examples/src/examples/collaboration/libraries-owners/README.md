---
title: Library owners
component: ./LibrariesOwnersExample.tsx
priority: 14
keywords: [libraries, library, owners, teams, tabs, composite, permissions, read-only, shared]
---

Combine libraries from several owners, such as the board, the user and their teams.

---

`CompositeLibrarySource` puts several sources together, each under an owner with a name and an icon. The panel shows a tab per owner, and "Add to library" in the context menu lists the libraries under their owners' names.

The Packs owner's source refuses every action through `can`, so its items can be placed but its libraries can't be renamed, deleted or added to.
