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
