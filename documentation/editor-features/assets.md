---
title: Assets
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - assets
  - images
  - files
  - upload
  - media
---

## Overview

The assets system manages media files like images, videos, and other binary content. Assets are stored separately from shapes and referenced by ID, enabling efficient reuse of the same media across multiple shapes. The editor provides methods for creating, updating, and deleting assets, as well as handlers for uploading and resolving asset URLs.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/Editor.ts - Asset methods (createAssets, getAsset, deleteAssets, etc.)
- packages/tlschema/src/records/TLAsset.ts - Asset record types
- packages/editor/src/lib/editor/types/external-content.ts - Asset handler types

## Related

- [External content handling](./external-content.md)
