---
title: Create a video shape
component: ./LocalVideosExample.tsx
priority: 2
keywords: [video, asset, assetrecordtype, createassets, local, static, mp4, videoshape]
---

Create a video shape from a locally hosted video by creating a video asset and a shape that references it.

---

Video shapes reference a `TLVideoAsset` record that holds the source URL and natural dimensions. This example creates the asset with `editor.createAssets`, then creates a `video` shape whose `assetId` points at it. The same pattern is used for images in the local-images example.
