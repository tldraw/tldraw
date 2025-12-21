---
title: PNG scale preservation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - PNG
  - clipboard
  - pHYs
---

# PNG scale preservation

When we export shapes at 2x resolution (for high-DPI displays), we write a PNG that's 200×200 pixels but should display at 100×100 pixels. The file includes metadata that says "this is a 2x image"—specifically, a pHYs chunk that records pixel density. Read the metadata, divide the dimensions, and you get the correct display size.

The problem is that browsers strip this metadata when you copy and paste. Clipboard sanitization is a security feature—it prevents malicious data from sneaking through in image files. But it also breaks our high-DPI exports. When you copy a shape from tldraw and paste it back, the 200×200 pixel file appears at 200×200 pixels instead of 100×100.

We needed a way to bypass sanitization while staying within the browser's security model.

## The `web ` prefix trick

Chromium browsers support custom clipboard MIME types if you prefix them with `web `. This is an intentional escape hatch—it lets web apps write custom formats to the clipboard without sanitization. The key constraint is that these custom formats are isolated: they only work within the same origin (or with explicit permission from the origin that wrote them).

We use this to write the same PNG blob twice with different MIME types:

```typescript
const types: Record<string, Promise<Blob>> = {
  'image/png': blobPromise,  // Standard format, sanitized
}

const customMimeType = 'web image/vnd.tldraw+png'
if (doesClipboardSupportType(customMimeType)) {
  types[customMimeType] = blobPromise.then((blob) =>
    FileHelpers.rewriteMimeType(blob, customMimeType)
  )
}

clipboardWrite(types)
```

Both entries point to the same PNG data. The difference is what happens during paste:

- `image/png` goes through the browser's sanitizer, which strips the pHYs chunk
- `web image/vnd.tldraw+png` bypasses sanitization, preserving all metadata

When reading from the clipboard, we check for our custom type first:

```typescript
const expectedPasteFileMimeTypes = [
  'web image/vnd.tldraw+png',  // Check custom type first
  'image/png',                  // Fall back to standard
  'image/jpeg',
  // ...
]

for (const type of expectedPasteFileMimeTypes) {
  if (item.types.includes(type)) {
    const blob = await item.getType(type)
    // Use first match
    break
  }
}
```

In Chromium browsers, we get the unsanitized version and read the pHYs chunk to calculate the correct display size. In Firefox and Safari, which don't support custom MIME types, we fall back to the standard `image/png` format. The metadata is stripped, but at least the paste works.

## Why this is secure

The `web ` prefix only works within the same origin. If you copy from tldraw.com and paste into another site, that site can't read `web image/vnd.tldraw+png`—it only sees the standard `image/png` format. The browser enforces this isolation automatically.

This means:

- Tldraw-to-tldraw: metadata preserved (same origin, custom MIME type works)
- Tldraw-to-other-app: metadata stripped (cross-origin, standard format only)
- Malicious-app-to-tldraw: can't inject custom MIME types (origin isolation)

The security model is the same as clipboard text formats or any other same-origin data. The `web ` prefix doesn't weaken the sandbox—it just gives us a way to write unsanitized data that stays within our own origin.

## Browser support

Custom clipboard MIME types with the `web ` prefix work in Chrome, Edge, and Opera (all Chromium-based). Firefox and Safari don't support this feature as of late 2024. We detect support before writing the custom type:

```typescript
function doesClipboardSupportType(type: string): boolean {
  try {
    return ClipboardItem.supports(type)
  } catch {
    return false
  }
}
```

On unsupported browsers, we skip the custom MIME type and only write the standard format. High-DPI exports lose their scale metadata on copy/paste, but the workflow still functions.

## Normalizing back to standard types

When we read `web image/vnd.tldraw+png` from the clipboard, we immediately normalize it back to `image/png`:

```typescript
const canonicalClipboardReadTypes = {
  'web image/vnd.tldraw+png': 'image/png',
}

function getCanonicalClipboardReadType(type: string): string {
  return canonicalClipboardReadTypes[type] ?? type
}
```

This ensures the rest of the codebase doesn't need to know about our custom MIME type. As far as image handling is concerned, it's just a PNG—we've already extracted the metadata we needed.

## Tradeoffs

This workaround is Chromium-specific and non-standard. If Chromium removes support for `web ` prefixed MIME types, we'll lose metadata preservation in copy/paste. The feature isn't documented in any web standard; it's an implementation detail of Chromium's clipboard API.

That said, the fallback is reasonable. High-DPI exports still work—they just display at full pixel dimensions instead of scaled dimensions. For users who don't copy and paste shapes frequently, or who work at 1x scale, the limitation is invisible.

The alternative would be to not export at high resolution, which would make tldraw shapes look pixelated on Retina displays. That's a worse experience than occasionally getting the wrong size on paste in non-Chromium browsers.

## Related files

- `/packages/tldraw/src/lib/utils/clipboard.ts` - Custom MIME type definitions
- `/packages/tldraw/src/lib/utils/export/copyAs.ts` - Clipboard write with dual MIME types
- `/packages/tldraw/src/lib/ui/hooks/useClipboardEvents.ts` - Clipboard read with type priority
- `/packages/utils/src/lib/media/png.ts` - pHYs chunk writing and parsing
- `/packages/utils/src/lib/media/media.ts` - Display size calculation from pHYs metadata
