---
title: '@tldraw/assets'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - assets
  - icons
  - fonts
  - translations
  - i18n
status: published
date: 12/19/2025
order: 0
---

`@tldraw/assets` provides static assets used by tldraw: icons, fonts, translations, and embed service icons. It includes helpers for resolving asset URLs in different bundling setups.

## Usage

Resolve asset URLs for your runtime and pass them to the editor:

```typescript
import { getAssetUrlsByImport } from '@tldraw/assets/imports'

const assets = getAssetUrlsByImport()
// assets.icons, assets.fonts, assets.translations
```

## Key components

- Icon sprite and icon map
- Font files and font manifests
- Translation bundles
- Embed service icons

## Key files

- packages/assets/imports.js - Import-based asset resolver
- packages/assets/urls.js - URL-based asset resolver
- packages/assets/selfHosted.js - Self-hosted asset resolver

## Related

- [@tldraw/tldraw](./tldraw.md)
- [Styles](../sdk-features/styles.md)
