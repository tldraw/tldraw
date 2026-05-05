## 6. Asset system

The asset system was reorganised so that asset extraction lives on the asset
util itself rather than in a free-floating `getMediaAssetInfoPartial` helper.

### `AssetUtil.getAssetFromFile`

Implement this method on a custom `AssetUtil` subclass to extract metadata
from a `File` and produce an asset record:

```tsx
import { AssetUtil, type TLAssetId, type TLImageAsset, AssetRecordType } from 'tldraw'

class MyImageAssetUtil extends AssetUtil<TLImageAsset> {
  static override type = 'image' as const

  override async getAssetFromFile(
    file: File,
    assetId: TLAssetId,
  ): Promise<TLImageAsset | null> {
    const src = URL.createObjectURL(file)
    return AssetRecordType.create({
      id: assetId,
      type: 'image',
      typeName: 'asset',
      props: { src, w: 0, h: 0, name: file.name, isAnimated: false, mimeType: file.type },
      meta: {},
    }) as TLImageAsset
  }
}
```

The signature is `(file: File, assetId: TLAssetId)`. There is **no** `editor`
parameter — access the editor via `this.editor` if you need it (e.g. to read
config, dispatch events, or trigger uploads).

### `notifyIfFileNotAllowed` and `getAssetInfo`

Both helpers gained an `editor` first argument:

```ts
// BEFORE
notifyIfFileNotAllowed(file, options)
const info = await getAssetInfo(file, options, assetId)

// AFTER
notifyIfFileNotAllowed(editor, file, options)
const info = await getAssetInfo(editor, file, assetId)
```

`getAssetInfo` now returns `Promise<TLAsset | null>` (instead of throwing on
unsupported files), so call sites should `if (!info) return` rather than
relying on `try/catch`.

### Removed exports

- `getMediaAssetInfoPartial` — implement `AssetUtil.getAssetFromFile` instead.
- `assetValidator` — use `imageAssetValidator`, `videoAssetValidator`, or
  `bookmarkAssetValidator` for the specific asset type. There is no longer a
  single union validator export.
