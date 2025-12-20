---
title: Clipboard
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - clipboard
  - copy
  - paste
  - cut
  - content
---

## Overview

The clipboard system handles copying and pasting shapes within and between editors. The `TLContent` type represents serialized shapes, bindings, and assets that can be transferred through the clipboard. The editor provides methods for extracting content from the current page and putting content onto the page with proper positioning and ID remapping.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/Editor.ts - getContentFromCurrentPage, putContentOntoCurrentPage methods
- packages/editor/src/lib/editor/types/clipboard-types.ts - TLContent type definition

## Related

- [External content handling](./external-content.md)
- [Selection system](./selection-system.md)
