# v3.13.0 (Thu May 22 2025)

### Release Notes

#### Elbow arrows ([#5572](https://github.com/tldraw/tldraw/pull/5572))

- The arrow shape now supports elbow arrows. Instead of a single straight line or arc, these arrows get from A to B in a series straight lines joined at right angles. Access the new arrow type by selecting the arrow tool, and choosing the new option under the "Line" style.

---

#### 🐛 Bug Fixes

- [tlsync] Add internal hooks to expose presence changes [#6096](https://github.com/tldraw/tldraw/pull/6096) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- Elbow arrows [#5572](https://github.com/tldraw/tldraw/pull/5572) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))

#### Authors: 3

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v3.11.0 (Thu Mar 20 2025)

#### 🐛 Bug Fix

- upgrade yarn to 4.7 [#5687](https://github.com/tldraw/tldraw/pull/5687) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 1

- alex ([@SomeHats](https://github.com/SomeHats))

---

# v3.10.0 (Tue Mar 11 2025)

### Release Notes

#### [feature] add rich text and contextual toolbar ([#4895](https://github.com/tldraw/tldraw/pull/4895))

- Rich text using ProseMirror as a first-class supported option in the Editor.

---

#### 🐛 Bug Fix

- CTA analytics [#5542](https://github.com/tldraw/tldraw/pull/5542) ([@TodePond](https://github.com/TodePond))

#### 🎉 New Features

- [feature] add rich text and contextual toolbar [#4895](https://github.com/tldraw/tldraw/pull/4895) ([@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))

#### Authors: 6

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

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

#### close sockets on 'close' event ([#5214](https://github.com/tldraw/tldraw/pull/5214))

- sync: close the server sockets on disconnect to proactively clean up socket connections.

---

#### 💄 Product Improvements

- support react 19 [#5293](https://github.com/tldraw/tldraw/pull/5293) ([@SomeHats](https://github.com/SomeHats) [@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Asset uploads [#5218](https://github.com/tldraw/tldraw/pull/5218) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- close sockets on 'close' event [#5214](https://github.com/tldraw/tldraw/pull/5214) ([@ds300](https://github.com/ds300))

#### Authors: 5

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
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

# v3.6.0 (Wed Dec 04 2024)

#### 💄 Product Improvements

- [dotcom] Handle max connections properly [#5044](https://github.com/tldraw/tldraw/pull/5044) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v3.5.0 (Tue Nov 26 2024)

### Release Notes

#### Add rate limiting. ([#4898](https://github.com/tldraw/tldraw/pull/4898))

- Fixed a bug with…

#### Call ensureStoreIsUsable after mergeRemoteChanges ([#4833](https://github.com/tldraw/tldraw/pull/4833))

- Add store consistency checks during `mergeRemoteChanges`

#### [dotcom] fix Safari sleep crash ([#4822](https://github.com/tldraw/tldraw/pull/4822))

- Fixed a bug causing the app to crash on Safari (desktop or iPad) when the wifi is disconnected.

---

#### 🐛 Bug Fix

- botcom: scaffolding for i18n [#4719](https://github.com/tldraw/tldraw/pull/4719) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats))
- [botcom] Duplicate / Publish / Create / Delete files on the server [#4798](https://github.com/tldraw/tldraw/pull/4798) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fixes

- [dotcom] fix Safari sleep crash [#4822](https://github.com/tldraw/tldraw/pull/4822) ([@ds300](https://github.com/ds300))

#### 💄 Product Improvements

- Add rate limiting. [#4898](https://github.com/tldraw/tldraw/pull/4898) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Call ensureStoreIsUsable after mergeRemoteChanges [#4833](https://github.com/tldraw/tldraw/pull/4833) ([@ds300](https://github.com/ds300))

#### Authors: 5

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.4.0 (Thu Oct 24 2024)

### Release Notes

#### npm: upgrade eslint v8 → v9 ([#4757](https://github.com/tldraw/tldraw/pull/4757))

- Upgrade eslint v8 → v9

---

#### 🐛 Bug Fix

- roll back changes from bad deploy [#4780](https://github.com/tldraw/tldraw/pull/4780) ([@SomeHats](https://github.com/SomeHats))
- Update CHANGELOG.md \[skip ci\] ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- [botcom] Fix file deletion and creation [#4751](https://github.com/tldraw/tldraw/pull/4751) ([@ds300](https://github.com/ds300))
- botcom: account menu [bk] [#4683](https://github.com/tldraw/tldraw/pull/4683) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 💄 Product Improvements

- npm: upgrade eslint v8 → v9 [#4757](https://github.com/tldraw/tldraw/pull/4757) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### Authors: 6

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.3.0 (Wed Oct 09 2024)

### Release Notes

#### [botcom] sharing ([#4654](https://github.com/tldraw/tldraw/pull/4654))

- Fixed a bug with…

#### [sync] refine error handling + room.closeSession method ([#4660](https://github.com/tldraw/tldraw/pull/4660))

- Adds a `closeSession` to the `TLSocketRoom` class, for terminating or restarting a client's socket connection.

#### [sync] Expose sessions and individual records on TLSocketRoom ([#4677](https://github.com/tldraw/tldraw/pull/4677))

- [sync] Adds a couple of new methods to the TLSocketRoom class:
  - `getRecord` - for getting an individual record
  - `getSessions` - for getting a list of the active sessions

#### [sync] Set instance.isReadonly automatically ([#4673](https://github.com/tldraw/tldraw/pull/4673))

- Puts the editor into readonly mode automatically when the tlsync server responds in readonly mode.
- Adds the `editor.getIsReadonly()` method.
- Fixes a bug where arrow labels could be edited in readonly mode.

#### [sync] readonly mode ([#4648](https://github.com/tldraw/tldraw/pull/4648))

- [tldraw sync] Adds `isReadonly` mode for socket connections.

#### Add eslint rule to check that tsdoc params match with function params ([#4615](https://github.com/tldraw/tldraw/pull/4615))

- Add lint rules to check for discrepancies between tsdoc params and function params and fix all the discovered issues.

---

#### 🐛 Bug Fix

- [botcom] use tlsync as prototype backend [#4617](https://github.com/tldraw/tldraw/pull/4617) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))

#### 💄 Product Improvements

- [sync] refine error handling + room.closeSession method [#4660](https://github.com/tldraw/tldraw/pull/4660) ([@ds300](https://github.com/ds300))
- [sync] Set instance.isReadonly automatically [#4673](https://github.com/tldraw/tldraw/pull/4673) ([@ds300](https://github.com/ds300))
- [sync] readonly mode [#4648](https://github.com/tldraw/tldraw/pull/4648) ([@ds300](https://github.com/ds300))
- Add eslint rule to check that tsdoc params match with function params [#4615](https://github.com/tldraw/tldraw/pull/4615) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🎉 New Features

- [botcom] sharing [#4654](https://github.com/tldraw/tldraw/pull/4654) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [botcom] Use auth on backend [#4639](https://github.com/tldraw/tldraw/pull/4639) ([@ds300](https://github.com/ds300))

#### 🛠️ API Changes

- [sync] Expose sessions and individual records on TLSocketRoom [#4677](https://github.com/tldraw/tldraw/pull/4677) ([@ds300](https://github.com/ds300))

#### Authors: 3

- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.1.0 (Wed Sep 25 2024)

### Release Notes

#### [sync] Allow doing CRUD directly on the server ([#4559](https://github.com/tldraw/tldraw/pull/4559))

- Adds the `updateStore` method to the `TLSocketRoom` class, to allow updating room data directly on the server.

---

#### 🐛 Bug Fix

- npm: make our React packages consistent [#4547](https://github.com/tldraw/tldraw/pull/4547) ([@mimecuvalo](https://github.com/mimecuvalo) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Clean up `apps` directory [#4548](https://github.com/tldraw/tldraw/pull/4548) ([@SomeHats](https://github.com/SomeHats))

#### 💄 Product Improvements

- [sync] tiny perf thing [#4591](https://github.com/tldraw/tldraw/pull/4591) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- [sync] Allow doing CRUD directly on the server [#4559](https://github.com/tldraw/tldraw/pull/4559) ([@ds300](https://github.com/ds300))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))

---

# v3.0.0 (Fri Sep 13 2024)

### Release Notes

#### Add sleep fn ([#4454](https://github.com/tldraw/tldraw/pull/4454))

(internal-only change)

#### Detect multiple installed versions of tldraw packages ([#4398](https://github.com/tldraw/tldraw/pull/4398))

- We detect when there are multiple versions of tldraw installed and let you know, as this can cause bugs in your application

#### Move from function properties to methods ([#4288](https://github.com/tldraw/tldraw/pull/4288))

- Adds eslint rules for enforcing the use of methods instead of function properties and fixes / disables all the resulting errors.

#### Deprecate editor.mark, fix cropping tests ([#4250](https://github.com/tldraw/tldraw/pull/4250))

This deprecates `Editor.mark()` in favour of `Editor.markHistoryStoppingPoint()`.

This was done because calling `editor.mark(id)` is a potential footgun unless you always provide a random ID. So `editor.markHistoryStoppingPoint()` always returns a random id.

#### Make it easy to load preexisting snapshots into TLSocketRoom ([#4272](https://github.com/tldraw/tldraw/pull/4272))

- Allow `TLSocketRoom` to load regular `TLStoreSnapshot` snapshots.

#### Sync docs rework ([#4267](https://github.com/tldraw/tldraw/pull/4267))

- Update sync.mdx

#### Sync docs, further refinements ([#4263](https://github.com/tldraw/tldraw/pull/4263))



---

#### 🐛 Bug Fix

- [SORRY, PLEASE MERGE] 3.0 megabus [#4494](https://github.com/tldraw/tldraw/pull/4494) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- consistent function style [#4468](https://github.com/tldraw/tldraw/pull/4468) ([@SomeHats](https://github.com/SomeHats))
- Add sleep fn [#4454](https://github.com/tldraw/tldraw/pull/4454) ([@SomeHats](https://github.com/SomeHats))
- Update READMEs. [#4377](https://github.com/tldraw/tldraw/pull/4377) ([@steveruizok](https://github.com/steveruizok))
- Sync docs rework [#4267](https://github.com/tldraw/tldraw/pull/4267) ([@ds300](https://github.com/ds300) [@adamwiggins](https://github.com/adamwiggins))
- Sync docs, further refinements [#4263](https://github.com/tldraw/tldraw/pull/4263) ([@adamwiggins](https://github.com/adamwiggins) [@SomeHats](https://github.com/SomeHats))

#### 💄 Product Improvements

- inline nanoid [#4410](https://github.com/tldraw/tldraw/pull/4410) ([@SomeHats](https://github.com/SomeHats))

#### 🎉 New Features

- Make it easy to load preexisting snapshots into TLSocketRoom [#4272](https://github.com/tldraw/tldraw/pull/4272) ([@ds300](https://github.com/ds300))

#### 🛠️ API Changes

- Detect multiple installed versions of tldraw packages [#4398](https://github.com/tldraw/tldraw/pull/4398) ([@SomeHats](https://github.com/SomeHats))
- Move from function properties to methods [#4288](https://github.com/tldraw/tldraw/pull/4288) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Deprecate editor.mark, fix cropping tests [#4250](https://github.com/tldraw/tldraw/pull/4250) ([@ds300](https://github.com/ds300))

#### Authors: 5

- Adam Wiggins ([@adamwiggins](https://github.com/adamwiggins))
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.4.0 (Mon Jul 22 2024)

### Release Notes

#### Finesse sync api ([#4212](https://github.com/tldraw/tldraw/pull/4212))

- Fixed a bug with…

#### Example node + bun server ([#4173](https://github.com/tldraw/tldraw/pull/4173))

- Fixed a bug with…

#### [bemo] add analytics to bemo worker ([#4146](https://github.com/tldraw/tldraw/pull/4146))

- Fixed a bug with…

#### [bemo] allow custom shapes ([#4144](https://github.com/tldraw/tldraw/pull/4144))

- Fixed a bug with…

---

#### 🐛 Bug Fix

- Example node + bun server [#4173](https://github.com/tldraw/tldraw/pull/4173) ([@ds300](https://github.com/ds300))
- publish bemo canaries [#4175](https://github.com/tldraw/tldraw/pull/4175) ([@SomeHats](https://github.com/SomeHats))
- [5/5] Move bemo from dotcom to examples [#4135](https://github.com/tldraw/tldraw/pull/4135) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300))
- [4/5] sync -> sync-core, sync-react -> sync [#4123](https://github.com/tldraw/tldraw/pull/4123) ([@SomeHats](https://github.com/SomeHats))

#### 🎉 New Features

- [bemo] add analytics to bemo worker [#4146](https://github.com/tldraw/tldraw/pull/4146) ([@ds300](https://github.com/ds300))
- [bemo] allow custom shapes [#4144](https://github.com/tldraw/tldraw/pull/4144) ([@ds300](https://github.com/ds300))

#### 🛠️ API Changes

- Rename APIs for new sync demo [#4248](https://github.com/tldraw/tldraw/pull/4248) ([@SomeHats](https://github.com/SomeHats))
- Finesse sync api [#4212](https://github.com/tldraw/tldraw/pull/4212) ([@ds300](https://github.com/ds300))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))

---

# @tldraw/tlsync

## 2.0.0-alpha.11

### Patch Changes

- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.11
  - @tldraw/tlstore@2.0.0-alpha.11
  - @tldraw/utils@2.0.0-alpha.10

## 2.0.0-alpha.10

### Patch Changes

- Updated dependencies [4b4399b6e]
  - @tldraw/tlschema@2.0.0-alpha.10
  - @tldraw/tlstore@2.0.0-alpha.10
  - @tldraw/utils@2.0.0-alpha.9

## 2.0.0-alpha.9

### Patch Changes

- Release day!
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.9
  - @tldraw/tlstore@2.0.0-alpha.9
  - @tldraw/utils@2.0.0-alpha.8

## 2.0.0-alpha.8

### Patch Changes

- 23dd81cfe: Make signia a peer dependency
- Updated dependencies [23dd81cfe]
  - @tldraw/tlstore@2.0.0-alpha.8
  - @tldraw/tlschema@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.7
  - @tldraw/tlstore@2.0.0-alpha.7
  - @tldraw/utils@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.6
  - @tldraw/tlstore@2.0.0-alpha.6
  - @tldraw/utils@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.5
  - @tldraw/tlstore@2.0.0-alpha.5
  - @tldraw/utils@2.0.0-alpha.5

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.4
  - @tldraw/tlstore@2.0.0-alpha.4
  - @tldraw/utils@2.0.0-alpha.4

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.3
  - @tldraw/tlstore@2.0.0-alpha.3
  - @tldraw/utils@2.0.0-alpha.3

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.2
  - @tldraw/tlstore@2.0.0-alpha.2
  - @tldraw/utils@2.0.0-alpha.2

## 0.1.0-alpha.11

### Patch Changes

- Fix stale reactors.
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.11
  - @tldraw/tlstore@0.1.0-alpha.11
  - @tldraw/utils@0.1.0-alpha.11

## 0.1.0-alpha.10

### Patch Changes

- Fix type export bug.
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.10
  - @tldraw/tlstore@0.1.0-alpha.10
  - @tldraw/utils@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Fix import bugs.
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.9
  - @tldraw/tlstore@0.1.0-alpha.9
  - @tldraw/utils@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Changes validation requirements, exports validation helpers.
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.8
  - @tldraw/tlstore@0.1.0-alpha.8
  - @tldraw/utils@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- - Pre-pre-release update
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.7
  - @tldraw/tlstore@0.1.0-alpha.7
  - @tldraw/utils@0.1.0-alpha.7

## 0.0.2-alpha.1

### Patch Changes

- Fix error with HMR
- Updated dependencies
  - @tldraw/tlschema@0.0.2-alpha.1
  - @tldraw/tlstore@0.0.2-alpha.1
  - @tldraw/utils@0.0.2-alpha.1

## 0.0.2-alpha.0

### Patch Changes

- Initial release
- Updated dependencies
  - @tldraw/tlschema@0.0.2-alpha.0
  - @tldraw/tlstore@0.0.2-alpha.0
  - @tldraw/utils@0.0.2-alpha.0
