---
title: Custom asset type
component: ./CustomAssetTypeExample.tsx
keywords: [asset, assetutil, custom, file, upload, drag, drop, pdf, document, non-media]
priority: 4
---

Accept non-media files like PDFs and CSVs by pairing a custom `AssetUtil` with a shape that displays them.

---

Out of the box, dropping a PDF or text file on the canvas does nothing because no asset type claims those MIME types. This example adds a `file` asset type with a `FileAssetUtil` that declares its supported MIME types and converts a dropped `File` into an asset record. A `FileCardShapeUtil` lists `file` in its `handledAssetTypes` and implements `createShapeForAsset`, so the editor knows to render a card for each uploaded file.

Try dragging a `.pdf`, `.txt`, `.csv`, `.json`, `.zip`, or `.xml` file onto the canvas. The default asset store inlines the file as a data URL, so the card's filename becomes a link you can open.
