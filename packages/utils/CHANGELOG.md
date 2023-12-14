# v2.0.0-alpha.19 (Tue Dec 12 2023)

### Release Notes

#### fix vite HMR issue ([#2279](https://github.com/tldraw/tldraw/pull/2279))

- Fixes a bug that could cause crashes due to a re-render loop with HMR #1989

---

#### 🐛 Bug Fix

- fix vite HMR issue [#2279](https://github.com/tldraw/tldraw/pull/2279) ([@SomeHats](https://github.com/SomeHats))
- no impure getters pt 11 [#2236](https://github.com/tldraw/tldraw/pull/2236) ([@ds300](https://github.com/ds300))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-alpha.18 (Fri Nov 10 2023)

#### 🏠 Internal

- Revert "bump prerelease from alpha to beta" [#2192](https://github.com/tldraw/tldraw/pull/2192) ([@ds300](https://github.com/ds300))
- bump prerelease from alpha to beta [#2148](https://github.com/tldraw/tldraw/pull/2148) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-alpha.16 (Wed Oct 11 2023)

#### 🏠 Internal

- Publish api.json [#2034](https://github.com/tldraw/tldraw/pull/2034) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.15 (Fri Oct 06 2023)

### Release Notes

#### tldraw zero - package shuffle ([#1710](https://github.com/tldraw/tldraw/pull/1710))

- [@tldraw/editor] lots, wip
- [@tldraw/ui] gone, merged to tldraw/tldraw
- [@tldraw/polyfills] gone, merged to tldraw/editor
- [@tldraw/primitives] gone, merged to tldraw/editor / tldraw/tldraw
- [@tldraw/indices] gone, merged to tldraw/editor
- [@tldraw/file-format] gone, merged to tldraw/tldraw

---

#### 💥 Breaking Change

- move some utils into tldraw/utils [#1750](https://github.com/tldraw/tldraw/pull/1750) ([@steveruizok](https://github.com/steveruizok))
- tldraw zero - package shuffle [#1710](https://github.com/tldraw/tldraw/pull/1710) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.14 (Tue Jul 04 2023)

### Release Notes

#### [feature] add `meta` property to records ([#1627](https://github.com/tldraw/tldraw/pull/1627))

- todo

---

#### 🚀 Enhancement

- [feature] add `meta` property to records [#1627](https://github.com/tldraw/tldraw/pull/1627) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.13 (Wed Jun 28 2023)

### Release Notes

#### Styles API ([#1580](https://github.com/tldraw/tldraw/pull/1580))

-

#### mini `defineShape` API ([#1563](https://github.com/tldraw/tldraw/pull/1563))

[dev-facing, notes to come]

#### Stricter ID types ([#1439](https://github.com/tldraw/tldraw/pull/1439))

[internal only, covered by #1432 changelog]

#### Create @tldraw/indices package ([#1426](https://github.com/tldraw/tldraw/pull/1426))

- [@tldraw/editor] Remove fractional indices code into `@tldraw/indices`
- [@tldraw/indices] Create library for fractional indices code

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

#### presence-related fixes ([#1361](https://github.com/tldraw/tldraw/pull/1361))

- Fix a bug where creating a page could throw an error in some multiplayer contexts.

---

#### 💥 Breaking Change

- Styles API [#1580](https://github.com/tldraw/tldraw/pull/1580) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- mini `defineShape` API [#1563](https://github.com/tldraw/tldraw/pull/1563) ([@SomeHats](https://github.com/SomeHats))
- Create @tldraw/indices package [#1426](https://github.com/tldraw/tldraw/pull/1426) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Asset improvements [#1557](https://github.com/tldraw/tldraw/pull/1557) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Stricter ID types [#1439](https://github.com/tldraw/tldraw/pull/1439) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- presence-related fixes [#1361](https://github.com/tldraw/tldraw/pull/1361) ([@ds300](https://github.com/ds300))
- readmes [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@steveruizok](https://github.com/steveruizok))
- [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
- derived presence state [#1204](https://github.com/tldraw/tldraw/pull/1204) ([@ds300](https://github.com/ds300))
- [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
- transfer-out: transfer out [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.12 (Mon Apr 03 2023)

#### 🐛 Bug Fix

- Make sure all types and build stuff get run in CI [#1548](https://github.com/tldraw/tldraw-lite/pull/1548) ([@SomeHats](https://github.com/SomeHats))
- make sure error annotations can't throw [#1550](https://github.com/tldraw/tldraw-lite/pull/1550) ([@SomeHats](https://github.com/SomeHats))
- Fix an error with importing certain files. [#1547](https://github.com/tldraw/tldraw-lite/pull/1547) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- add pre-commit api report generation [#1517](https://github.com/tldraw/tldraw-lite/pull/1517) ([@SomeHats](https://github.com/SomeHats))
- [chore] restore api extractor [#1500](https://github.com/tldraw/tldraw-lite/pull/1500) ([@steveruizok](https://github.com/steveruizok))
- [improvement] docs / api cleanup [#1491](https://github.com/tldraw/tldraw-lite/pull/1491) ([@steveruizok](https://github.com/steveruizok))
- David/publish good [#1488](https://github.com/tldraw/tldraw-lite/pull/1488) ([@ds300](https://github.com/ds300))
- [chore] alpha 10 [#1486](https://github.com/tldraw/tldraw-lite/pull/1486) ([@ds300](https://github.com/ds300))
- [chore] bump for alpha 8 [#1485](https://github.com/tldraw/tldraw-lite/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- stop using broken-af turbo for publishing [#1476](https://github.com/tldraw/tldraw-lite/pull/1476) ([@ds300](https://github.com/ds300))
- [chore] add canary release script [#1423](https://github.com/tldraw/tldraw-lite/pull/1423) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [chore] upgrade yarn [#1430](https://github.com/tldraw/tldraw-lite/pull/1430) ([@ds300](https://github.com/ds300))
- repo cleanup [#1426](https://github.com/tldraw/tldraw-lite/pull/1426) ([@steveruizok](https://github.com/steveruizok))
- Vscode extension [#1253](https://github.com/tldraw/tldraw-lite/pull/1253) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@orangemug](https://github.com/orangemug))

#### Authors: 5

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# @tldraw/utils

## 2.0.0-alpha.10

### Patch Changes

- fix some package build scripting

## 2.0.0-alpha.9

### Patch Changes

- 4b4399b6e: redeploy with yarn to prevent package version issues

## 2.0.0-alpha.8

### Patch Changes

- Release day!

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor

## 0.1.0-alpha.11

### Patch Changes

- Fix stale reactors.

## 0.1.0-alpha.10

### Patch Changes

- Fix type export bug.

## 0.1.0-alpha.9

### Patch Changes

- Fix import bugs.

## 0.1.0-alpha.8

### Patch Changes

- Changes validation requirements, exports validation helpers.

## 0.1.0-alpha.7

### Patch Changes

- - Pre-pre-release update

## 0.0.2-alpha.1

### Patch Changes

- Fix error with HMR

## 0.0.2-alpha.0

### Patch Changes

- Initial release
