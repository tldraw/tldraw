# v2.0.0-alpha.13 (Wed Jun 28 2023)

### Release Notes

#### [refactor] snapping ([#1589](https://github.com/tldraw/tldraw/pull/1589))

- [editor] fix bug in snapping

#### Fix arrows with weird bends crashing ([#1540](https://github.com/tldraw/tldraw/pull/1540))

- Fixed a rare crash that could happen when you try to curve an arrow with zero distance.

#### [2/3] renderer changes to support "sandwich mode" highlighting ([#1418](https://github.com/tldraw/tldraw/pull/1418))

[not yet!]

#### Measure individual words instead of just line breaks for text exports ([#1397](https://github.com/tldraw/tldraw/pull/1397))

- Add a brief release note for your PR here.

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

---

#### 🚀 Enhancement

- [2/3] renderer changes to support "sandwich mode" highlighting [#1418](https://github.com/tldraw/tldraw/pull/1418) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fix

- [refactor] snapping [#1589](https://github.com/tldraw/tldraw/pull/1589) ([@steveruizok](https://github.com/steveruizok))
- Fix arrows with weird bends crashing [#1540](https://github.com/tldraw/tldraw/pull/1540) ([@TodePond](https://github.com/TodePond))
- ensure that fixed points stay fixed [#1523](https://github.com/tldraw/tldraw/pull/1523) ([@steveruizok](https://github.com/steveruizok))
- Measure individual words instead of just line breaks for text exports [#1397](https://github.com/tldraw/tldraw/pull/1397) ([@SomeHats](https://github.com/SomeHats))
- readmes [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@steveruizok](https://github.com/steveruizok))
- [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
- Use `strokePathData` for `<ShapeFill/>` path to avoid bugs in the inner path algo [#1207](https://github.com/tldraw/tldraw/pull/1207) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
- transfer-out: transfer out [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- replace console.log with nicelog [#1496](https://github.com/tldraw/tldraw/pull/1496) ([@steveruizok](https://github.com/steveruizok))
- [chore] remove benchmark [#1489](https://github.com/tldraw/tldraw/pull/1489) ([@steveruizok](https://github.com/steveruizok))
- avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 5

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.12 (Mon Apr 03 2023)

#### 🐛 Bug Fix

- Make sure all types and build stuff get run in CI [#1548](https://github.com/tldraw/tldraw-lite/pull/1548) ([@SomeHats](https://github.com/SomeHats))
- add pre-commit api report generation [#1517](https://github.com/tldraw/tldraw-lite/pull/1517) ([@SomeHats](https://github.com/SomeHats))
- Fix back to content button. [#1519](https://github.com/tldraw/tldraw-lite/pull/1519) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [chore] restore api extractor [#1500](https://github.com/tldraw/tldraw-lite/pull/1500) ([@steveruizok](https://github.com/steveruizok))
- David/publish good [#1488](https://github.com/tldraw/tldraw-lite/pull/1488) ([@ds300](https://github.com/ds300))
- [chore] alpha 10 [#1486](https://github.com/tldraw/tldraw-lite/pull/1486) ([@ds300](https://github.com/ds300))
- [chore] package build improvements [#1484](https://github.com/tldraw/tldraw-lite/pull/1484) ([@ds300](https://github.com/ds300))
- [chore] bump for alpha 8 [#1485](https://github.com/tldraw/tldraw-lite/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- stop using broken-af turbo for publishing [#1476](https://github.com/tldraw/tldraw-lite/pull/1476) ([@ds300](https://github.com/ds300))
- [chore] add canary release script [#1423](https://github.com/tldraw/tldraw-lite/pull/1423) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [chore] upgrade yarn [#1430](https://github.com/tldraw/tldraw-lite/pull/1430) ([@ds300](https://github.com/ds300))
- repo cleanup [#1426](https://github.com/tldraw/tldraw-lite/pull/1426) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# @tldraw/primitives

## 2.0.0-alpha.11

### Patch Changes

- fix some package build scripting
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.11

## 2.0.0-alpha.10

### Patch Changes

- 4b4399b6e: redeploy with yarn to prevent package version issues
- Updated dependencies [4b4399b6e]
  - @tldraw/tlschema@2.0.0-alpha.10

## 2.0.0-alpha.9

### Patch Changes

- Release day!
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.9

## 2.0.0-alpha.8

### Patch Changes

- @tldraw/tlschema@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.5

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.4

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.3

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor
- Updated dependencies
  - @tldraw/tlschema@2.0.0-alpha.2

## 0.1.0-alpha.11

### Patch Changes

- Fix stale reactors.
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.11

## 0.1.0-alpha.10

### Patch Changes

- Fix type export bug.
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Fix import bugs.
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Changes validation requirements, exports validation helpers.
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- - Pre-pre-release update
- Updated dependencies
  - @tldraw/tlschema@0.1.0-alpha.7

## 0.0.2-alpha.1

### Patch Changes

- Fix error with HMR
- Updated dependencies
  - @tldraw/tlschema@0.0.2-alpha.1

## 0.0.2-alpha.0

### Patch Changes

- Initial release
- Updated dependencies
  - @tldraw/tlschema@0.0.2-alpha.0
