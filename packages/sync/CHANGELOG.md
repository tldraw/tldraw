# v3.11.0 (Thu Mar 20 2025)

### Release Notes

#### 5% minimum zoom / zoom-towards-cursor ([#5584](https://github.com/tldraw/tldraw/pull/5584))

- Added a new minimum zoom step at 5%
- Added new keyboard shortcuts for zoom in or out towards your cursor (Shift +, Shift -)

---

#### 🐛 Bug Fix

- upgrade yarn to 4.7 [#5687](https://github.com/tldraw/tldraw/pull/5687) ([@SomeHats](https://github.com/SomeHats))

#### 💄 Product Improvements

- 5% minimum zoom / zoom-towards-cursor [#5584](https://github.com/tldraw/tldraw/pull/5584) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.10.0 (Tue Mar 11 2025)

#### 🐛 Bug Fix

- CTA analytics [#5542](https://github.com/tldraw/tldraw/pull/5542) ([@TodePond](https://github.com/TodePond))

#### Authors: 1

- Lu Wilson ([@TodePond](https://github.com/TodePond))

---

# v3.9.0 (Mon Mar 03 2025)

#### 🐛 Bug Fix

- Update discord links [#5500](https://github.com/tldraw/tldraw/pull/5500) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))

#### Authors: 4

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.8.0 (Wed Feb 12 2025)

### Release Notes

#### support react 19 ([#5293](https://github.com/tldraw/tldraw/pull/5293))

- tldraw now supports react 19

#### Asset uploads ([#5218](https://github.com/tldraw/tldraw/pull/5218))

**Breaking change**

- `@tldraw/tlschema`: `TLAssetStore.upload` used to return just the `src` of the uploaded asset. It now returns `{src: string, meta?: JsonObject}`. The returned metadata will be added to the asset record and thus allows the users to add some additional data to them when uploading.
- `@tldraw/editor`: `Editor.uploadAsset` used to return `Promise<string>` and now returns `Promise<{ src: string; meta?: JsonObject }> `

#### Exports DX pass ([#5114](https://github.com/tldraw/tldraw/pull/5114))

#### Breaking changes / user facing changes
- The copy/export as JSON option has been removed. Data copied/exported from here could not be used anyway. If you need this in your app, look into `Editor.getContentFromCurrentPage`.
- `useImageOrVideoAssetUrl` now expects a `width` parameter representing the rendered width of the asset.
- `Editor.getSvgElement` and `Editor.getSvgString` will now export all shapes on the current page instead of returning undefined when passed an empty array of shape ids.

#### Product improvement
- When exporting to an image, image assets are now downloaded at a resolution appropriate for how they will appear in the export.

#### API changes
- There's a new `Editor.toImage` method that makes creating an image from your canvas easier. (`exportToBlob` is deprecated in favour of it)
- `SvgExportContext` now exposes the `scale` and `pixelRatio` options of the current export
- `SvgExportContext` now has a `resolveAssetUrl` method to resolve an asset at a resolution appropriate for the export.
- `copyAs(editor, ids, format, opts)` has been deprecated in favour of `copyAs(editor, ids, opts)`.
- `exportAs(editor, ids, format, name, opts)` has been deprecated in favour of `exportAs(editor, ids, opts)`

---

#### 💄 Product Improvements

- support react 19 [#5293](https://github.com/tldraw/tldraw/pull/5293) ([@SomeHats](https://github.com/SomeHats) [@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Asset uploads [#5218](https://github.com/tldraw/tldraw/pull/5218) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🛠️ API Changes

- Exports DX pass [#5114](https://github.com/tldraw/tldraw/pull/5114) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 4

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))

---

# v3.7.0 (Tue Jan 07 2025)

### Release Notes

#### custom sync presence ([#5071](https://github.com/tldraw/tldraw/pull/5071))

- It's now possible to customise what presence data is synced between clients, or disable presence syncing entirely.

---

#### 🛠️ API Changes

- custom sync presence [#5071](https://github.com/tldraw/tldraw/pull/5071) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 1

- alex ([@SomeHats](https://github.com/SomeHats))

---

# v3.5.0 (Tue Nov 26 2024)

### Release Notes

#### Add rate limiting. ([#4898](https://github.com/tldraw/tldraw/pull/4898))

- Fixed a bug with…

---

#### 🐛 Bug Fix

- botcom: scaffolding for i18n [#4719](https://github.com/tldraw/tldraw/pull/4719) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats))

#### 💄 Product Improvements

- Add rate limiting. [#4898](https://github.com/tldraw/tldraw/pull/4898) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))

---

# v3.4.0 (Thu Oct 24 2024)

#### 🐛 Bug Fix

- roll back changes from bad deploy [#4780](https://github.com/tldraw/tldraw/pull/4780) ([@SomeHats](https://github.com/SomeHats))
- Update CHANGELOG.md \[skip ci\] ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- botcom: redirect to intended room when signing in [#4725](https://github.com/tldraw/tldraw/pull/4725) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 3

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))

---

# v3.3.0 (Wed Oct 09 2024)

### Release Notes

#### [sync] refine error handling + room.closeSession method ([#4660](https://github.com/tldraw/tldraw/pull/4660))

- Adds a `closeSession` to the `TLSocketRoom` class, for terminating or restarting a client's socket connection.

#### [sync] Set instance.isReadonly automatically ([#4673](https://github.com/tldraw/tldraw/pull/4673))

- Puts the editor into readonly mode automatically when the tlsync server responds in readonly mode.
- Adds the `editor.getIsReadonly()` method.
- Fixes a bug where arrow labels could be edited in readonly mode.

---

#### 💄 Product Improvements

- [sync] refine error handling + room.closeSession method [#4660](https://github.com/tldraw/tldraw/pull/4660) ([@ds300](https://github.com/ds300))
- [sync] Set instance.isReadonly automatically [#4673](https://github.com/tldraw/tldraw/pull/4673) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- [botcom] Use auth on backend [#4639](https://github.com/tldraw/tldraw/pull/4639) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v3.1.0 (Wed Sep 25 2024)

#### 🐛 Bug Fix

- npm: make our React packages consistent [#4547](https://github.com/tldraw/tldraw/pull/4547) ([@mimecuvalo](https://github.com/mimecuvalo) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Clean up `apps` directory [#4548](https://github.com/tldraw/tldraw/pull/4548) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))

---

# v3.0.0 (Fri Sep 13 2024)

### Release Notes

#### Detect multiple installed versions of tldraw packages ([#4398](https://github.com/tldraw/tldraw/pull/4398))

- We detect when there are multiple versions of tldraw installed and let you know, as this can cause bugs in your application

#### Rename `StoreOptions.multiplayerStatus` ([#4349](https://github.com/tldraw/tldraw/pull/4349))

- Renames `StoreOptions.multiplayerStatus` to `StoreOptions.collaboration.status`.

#### images: show ghost preview image while uploading ([#3988](https://github.com/tldraw/tldraw/pull/3988))

- Media: add image and video upload indicators.

#### remove onEditorMount prop ([#4320](https://github.com/tldraw/tldraw/pull/4320))

- **Breaking:** the `onEditorMount` option to `createTLStore` is now called `onMount`

#### Move from function properties to methods ([#4288](https://github.com/tldraw/tldraw/pull/4288))

- Adds eslint rules for enforcing the use of methods instead of function properties and fixes / disables all the resulting errors.

#### Sync docs rework ([#4267](https://github.com/tldraw/tldraw/pull/4267))

- Update sync.mdx

---

#### 🐛 Bug Fix

- [SORRY, PLEASE MERGE] 3.0 megabus [#4494](https://github.com/tldraw/tldraw/pull/4494) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- Store bookmark images on our own asset server [#4460](https://github.com/tldraw/tldraw/pull/4460) ([@SomeHats](https://github.com/SomeHats))
- Sync docs rework [#4267](https://github.com/tldraw/tldraw/pull/4267) ([@ds300](https://github.com/ds300) [@adamwiggins](https://github.com/adamwiggins))

#### 💄 Product Improvements

- inline nanoid [#4410](https://github.com/tldraw/tldraw/pull/4410) ([@SomeHats](https://github.com/SomeHats))
- images: show ghost preview image while uploading [#3988](https://github.com/tldraw/tldraw/pull/3988) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))

#### 🛠️ API Changes

- Detect multiple installed versions of tldraw packages [#4398](https://github.com/tldraw/tldraw/pull/4398) ([@SomeHats](https://github.com/SomeHats))
- allow loading the sync URI dynamically [#4379](https://github.com/tldraw/tldraw/pull/4379) ([@SomeHats](https://github.com/SomeHats))
- Rename `StoreOptions.multiplayerStatus` [#4349](https://github.com/tldraw/tldraw/pull/4349) ([@steveruizok](https://github.com/steveruizok))
- remove onEditorMount prop [#4320](https://github.com/tldraw/tldraw/pull/4320) ([@SomeHats](https://github.com/SomeHats))
- Move from function properties to methods [#4288](https://github.com/tldraw/tldraw/pull/4288) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### Authors: 6

- Adam Wiggins ([@adamwiggins](https://github.com/adamwiggins))
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.4.0 (Mon Jul 22 2024)

### Release Notes

#### Finesse sync api ([#4212](https://github.com/tldraw/tldraw/pull/4212))

- Fixed a bug with…

#### Make asset.fileSize optional ([#4206](https://github.com/tldraw/tldraw/pull/4206))

- Made the `fileSize` property of `TLImageAsset` and `TLVideoAsset` optional

#### [bemo] allow special chars in roomId ([#4153](https://github.com/tldraw/tldraw/pull/4153))

- Fixed a bug with…

#### [bemo] allow custom shapes ([#4144](https://github.com/tldraw/tldraw/pull/4144))

- Fixed a bug with…

#### put sync stuff in bemo worker ([#4060](https://github.com/tldraw/tldraw/pull/4060))

- Fixed a bug with...

---

#### 🐛 Bug Fix

- bemo custom shape example [#4174](https://github.com/tldraw/tldraw/pull/4174) ([@SomeHats](https://github.com/SomeHats))
- publish bemo canaries [#4175](https://github.com/tldraw/tldraw/pull/4175) ([@SomeHats](https://github.com/SomeHats))
- [5/5] Move bemo from dotcom to examples [#4135](https://github.com/tldraw/tldraw/pull/4135) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300))
- [4/5] sync -> sync-core, sync-react -> sync [#4123](https://github.com/tldraw/tldraw/pull/4123) ([@SomeHats](https://github.com/SomeHats))

#### 💄 Product Improvements

- [bemo] allow special chars in roomId [#4153](https://github.com/tldraw/tldraw/pull/4153) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- [bemo] allow custom shapes [#4144](https://github.com/tldraw/tldraw/pull/4144) ([@ds300](https://github.com/ds300))
- put sync stuff in bemo worker [#4060](https://github.com/tldraw/tldraw/pull/4060) ([@ds300](https://github.com/ds300))

#### 🛠️ API Changes

- Rename APIs for new sync demo [#4248](https://github.com/tldraw/tldraw/pull/4248) ([@SomeHats](https://github.com/SomeHats))
- Finesse sync api [#4212](https://github.com/tldraw/tldraw/pull/4212) ([@ds300](https://github.com/ds300))
- Make asset.fileSize optional [#4206](https://github.com/tldraw/tldraw/pull/4206) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
