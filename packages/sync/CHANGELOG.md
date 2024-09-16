# v3.0.0 (Fri Sep 13 2024)

### Release Notes

#### Detect multiple installed versions of tldraw packages ([#4398](https://github.com/tldraw/tldraw/pull/4398))

- We detect when there are multiple versions of tldraw installed and let you know, as this can cause bugs in your application

#### Rename `StoreOptions.multiplayerStatus` ([#4349](https://github.com/tldraw/tldraw/pull/4349))

- Renames `StoreOptions.multiplayerStatus` to `StoreOptions.collaboration.status`.

#### images: show ghost preview image whilst uploading ([#3988](https://github.com/tldraw/tldraw/pull/3988))

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
- images: show ghost preview image whilst uploading [#3988](https://github.com/tldraw/tldraw/pull/3988) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))

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
