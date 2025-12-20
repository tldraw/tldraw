---
title: Deep links
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - deep link
  - URL
  - share
  - navigation
  - state
---

## Overview

The deep links system serializes editor state into URLs for sharing and navigation. Deep links can encode the current page, viewport position, and selected shapes, allowing users to share a link that opens the editor at a specific location. The system supports creating deep links from current state and navigating to deep links when loading.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/Editor.ts - createDeepLink, navigateToDeepLink methods
- packages/editor/src/lib/utils/deepLinks.ts - Deep link parsing and creation utilities

## Related

- [Camera system](./camera-system.md)
- [Pages](./pages.md)
