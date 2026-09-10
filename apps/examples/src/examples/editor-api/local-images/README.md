---
title: Create an image shape
component: ./LocalImagesExample.tsx
priority: 2
keywords: [image, asset, assetrecordtype, createassets, local, static, png, jpg, imageshape]
---

Create an image shape from a locally hosted image by creating an asset record and a shape that references it.

---

Image shapes don't store image data themselves. Each one references an asset record that holds the source URL and natural dimensions. This example creates the asset with `editor.createAssets` using `AssetRecordType.createId()` for its id, then creates an image shape with `editor.createShape` whose `assetId` points at it.

The image is served from the app's `public` folder. To let users upload their own images, see the hosted-images example.
