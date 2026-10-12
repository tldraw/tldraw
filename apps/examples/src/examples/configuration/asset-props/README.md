---
title: Asset options
component: ./AssetPropsExample.tsx
priority: 1
keywords:
  [
    assets,
    images,
    videos,
    upload,
    acceptedimagetypes,
    acceptedvideotypes,
    maxassetsize,
    maximagesize,
    maximagedimension,
  ]
---

Restrict which images and videos can be added to the canvas.

---

The `Tldraw` component has props that control which assets it accepts when files are dropped, pasted, or uploaded:

- `acceptedImageMimeTypes` and `acceptedVideoMimeTypes` filter by file type. Here only JPEGs are allowed and videos are turned off entirely.
- `maxAssetSize` caps the file size in bytes (1 MB here).
- `maxImageDimension` limits an image's width or height in pixels; larger images are scaled down on import. `Infinity` disables the limit.

Try dropping a PNG or a video onto the canvas: it is rejected with a toast. A JPEG under 1 MB is accepted.
