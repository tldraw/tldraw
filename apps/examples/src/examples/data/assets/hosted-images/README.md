---
title: Hosted images
component: ./HostedImagesExample.tsx
priority: 2
keywords:
  [
    upload,
    images,
    assets,
    tlassetstore,
    file upload,
    asset handling,
    resolve,
    fetch,
    storage,
    hosting,
  ]
---

Upload user images to your own server with a `TLAssetStore` instead of storing them as data URLs.

---

Without an asset store, images and videos added to the canvas are inlined into the document as data URLs. A `TLAssetStore` passed to the `assets` prop takes over: its `upload` method sends each new file to your server and returns the URL to save, and its optional `resolve` method turns that saved URL into the one actually rendered, which is the place to add auth tokens or pick an optimized size.

The upload endpoint here is a placeholder, so this example won't actually store anything. It shows the code you'd write against your own backend.
