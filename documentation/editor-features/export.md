---
title: Export
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - export
  - SVG
  - image
  - PNG
  - download
---

## Overview

The export system converts shapes to SVG and raster images for download or embedding. The `exportToSvg` method renders selected shapes or the entire page to an SVG element, handling fonts, images, and custom shape rendering. The SVG can be converted to PNG, JPEG, or WebP using `getSvgAsImage`. Export options control background color, padding, scale, and whether to include dark mode styling.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/exports/exportToSvg.ts - SVG export implementation
- packages/editor/src/lib/exports/getSvgAsImage.ts - Image conversion
- packages/editor/src/lib/editor/types/misc-types.ts - Export option types

## Related

- [Text measurement](./text-measurement.md)
