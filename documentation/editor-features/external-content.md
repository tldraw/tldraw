---
title: External content handling
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - external
  - content
  - paste
  - drop
  - embed
  - files
---

## Overview

The external content handling system processes content from outside the editor, such as pasted text, dropped files, or embedded URLs. It uses a handler registration pattern where you register handlers for specific content types (text, files, URLs, SVG, embeds). When external content arrives, the editor routes it to the appropriate handler, which transforms the content into shapes or assets.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/Editor.ts - registerExternalContentHandler, putExternalContent
- packages/editor/src/lib/editor/types/external-content.ts - Content type definitions
- packages/tldraw/src/lib/defaultExternalContentHandlers.ts - Default handler implementations

## Related

- [Assets](./assets.md)
- [Clipboard](./clipboard.md)
