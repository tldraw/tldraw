# v2.0.0-alpha.12 (Mon Apr 03 2023)

#### 🐛 Bug Fix

- [fix] Start on page 1 when importing from v1 [#1589](https://github.com/tldraw/tldraw-lite/pull/1589) ([@steveruizok](https://github.com/steveruizok))
- [fix] Arrow rebinding in v1 imports [#1588](https://github.com/tldraw/tldraw-lite/pull/1588) ([@steveruizok](https://github.com/steveruizok))
- Move resizing to the correct place. [#1579](https://github.com/tldraw/tldraw-lite/pull/1579) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] use masked page bounds for finding drop parent [#1564](https://github.com/tldraw/tldraw-lite/pull/1564) ([@steveruizok](https://github.com/steveruizok))
- Revert "[fix] text jump bug" [#1566](https://github.com/tldraw/tldraw-lite/pull/1566) ([@ds300](https://github.com/ds300))
- [improvement] select shapes on paste [#1565](https://github.com/tldraw/tldraw-lite/pull/1565) ([@steveruizok](https://github.com/steveruizok))
- Fix to `setPenMode` to `false` when `this._touchEventsRemainingBeforeExitingPenMode` reaches zero [#1541](https://github.com/tldraw/tldraw-lite/pull/1541) ([@orangemug](https://github.com/orangemug))
- [fix] text jump bug [#1555](https://github.com/tldraw/tldraw-lite/pull/1555) ([@ds300](https://github.com/ds300))
- Add proper messaging & import flows for migration from local & multiplayer rooms [#1506](https://github.com/tldraw/tldraw-lite/pull/1506) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- fix errors when migrating extremely large v1 rooms or rooms with funky data [#1553](https://github.com/tldraw/tldraw-lite/pull/1553) ([@SomeHats](https://github.com/SomeHats))
- Fix an error when we have an empty group. [#1549](https://github.com/tldraw/tldraw-lite/pull/1549) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make sure all types and build stuff get run in CI [#1548](https://github.com/tldraw/tldraw-lite/pull/1548) ([@SomeHats](https://github.com/SomeHats))
- make sure error annotations can't throw [#1550](https://github.com/tldraw/tldraw-lite/pull/1550) ([@SomeHats](https://github.com/SomeHats))
- [fix] Prevent unwanted offsets when embedding tldraw in scrollable page [#1551](https://github.com/tldraw/tldraw-lite/pull/1551) ([@ds300](https://github.com/ds300))
- Fix an error with importing certain files. [#1547](https://github.com/tldraw/tldraw-lite/pull/1547) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] simplify draw shape's outline [#1537](https://github.com/tldraw/tldraw-lite/pull/1537) ([@steveruizok](https://github.com/steveruizok))
- [fix] simplify line shape's outline [#1536](https://github.com/tldraw/tldraw-lite/pull/1536) ([@steveruizok](https://github.com/steveruizok))
- [feature] `App.canMoveCamera` [#1543](https://github.com/tldraw/tldraw-lite/pull/1543) ([@steveruizok](https://github.com/steveruizok))
- Fix the migration of ovals, size was not correct. [#1544](https://github.com/tldraw/tldraw-lite/pull/1544) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- An attempt to fix text selection on chrome/android [#1452](https://github.com/tldraw/tldraw-lite/pull/1452) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- run v1 migrations when rebuilding v1 doc [#1534](https://github.com/tldraw/tldraw-lite/pull/1534) ([@SomeHats](https://github.com/SomeHats))
- add pre-commit api report generation [#1517](https://github.com/tldraw/tldraw-lite/pull/1517) ([@SomeHats](https://github.com/SomeHats))
- Migrate assets to v2 storage [#1520](https://github.com/tldraw/tldraw-lite/pull/1520) ([@SomeHats](https://github.com/SomeHats))
- [improvement] restore snap to center [#1529](https://github.com/tldraw/tldraw-lite/pull/1529) ([@steveruizok](https://github.com/steveruizok))
- Rename some methods [#1528](https://github.com/tldraw/tldraw-lite/pull/1528) ([@steveruizok](https://github.com/steveruizok))
- [ux] Don't select draw shapes when you use the draw tool [#1527](https://github.com/tldraw/tldraw-lite/pull/1527) ([@steveruizok](https://github.com/steveruizok))
- [fix] brush while pinch zooming [#1526](https://github.com/tldraw/tldraw-lite/pull/1526) ([@steveruizok](https://github.com/steveruizok))
- [fix] Don't let changing screen bounds be undoable [#1525](https://github.com/tldraw/tldraw-lite/pull/1525) ([@steveruizok](https://github.com/steveruizok))
- [tweak] Center camera on shape in new page [#1522](https://github.com/tldraw/tldraw-lite/pull/1522) ([@steveruizok](https://github.com/steveruizok))
- [fix] clear editing shape id when window loses focus [#1523](https://github.com/tldraw/tldraw-lite/pull/1523) ([@steveruizok](https://github.com/steveruizok))
- Fix splitting of chars for wide UTF-8 characters [#1501](https://github.com/tldraw/tldraw-lite/pull/1501) ([@orangemug](https://github.com/orangemug))
- Don't use previous opacity for new `bookmark`/`embed` shapes [#1510](https://github.com/tldraw/tldraw-lite/pull/1510) ([@orangemug](https://github.com/orangemug))
- Fix back to content button. [#1519](https://github.com/tldraw/tldraw-lite/pull/1519) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Allow migration of readonly rooms. [#1498](https://github.com/tldraw/tldraw-lite/pull/1498) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [chore] restore api extractor [#1500](https://github.com/tldraw/tldraw-lite/pull/1500) ([@steveruizok](https://github.com/steveruizok))
- Asset loading overhaul [#1457](https://github.com/tldraw/tldraw-lite/pull/1457) ([@SomeHats](https://github.com/SomeHats))
- [improvement] docs / api cleanup [#1491](https://github.com/tldraw/tldraw-lite/pull/1491) ([@steveruizok](https://github.com/steveruizok))
- David/publish good [#1488](https://github.com/tldraw/tldraw-lite/pull/1488) ([@ds300](https://github.com/ds300))
- [improvement] mobile docs [#1487](https://github.com/tldraw/tldraw-lite/pull/1487) ([@steveruizok](https://github.com/steveruizok))
- [chore] alpha 10 [#1486](https://github.com/tldraw/tldraw-lite/pull/1486) ([@ds300](https://github.com/ds300))
- [chore] package build improvements [#1484](https://github.com/tldraw/tldraw-lite/pull/1484) ([@ds300](https://github.com/ds300))
- [chore] bump for alpha 8 [#1485](https://github.com/tldraw/tldraw-lite/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- [fix] page point offset [#1483](https://github.com/tldraw/tldraw-lite/pull/1483) ([@steveruizok](https://github.com/steveruizok))
- [improvement] API Reference docs [#1478](https://github.com/tldraw/tldraw-lite/pull/1478) ([@steveruizok](https://github.com/steveruizok))
- stop using broken-af turbo for publishing [#1476](https://github.com/tldraw/tldraw-lite/pull/1476) ([@ds300](https://github.com/ds300))
- [chore] add canary release script [#1423](https://github.com/tldraw/tldraw-lite/pull/1423) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [fix] missing fonts in exports [#1468](https://github.com/tldraw/tldraw-lite/pull/1468) ([@steveruizok](https://github.com/steveruizok))
- [temp] no preload icons [#1466](https://github.com/tldraw/tldraw-lite/pull/1466) ([@steveruizok](https://github.com/steveruizok))
- [fix] crash with frames [#1465](https://github.com/tldraw/tldraw-lite/pull/1465) ([@steveruizok](https://github.com/steveruizok))
- Removed incorrect width recalc in text label for geo shapes [#1396](https://github.com/tldraw/tldraw-lite/pull/1396) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- derive currentToolId from app.root [#1459](https://github.com/tldraw/tldraw-lite/pull/1459) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Convert multiple spaces in export by converting to nbsp [#1419](https://github.com/tldraw/tldraw-lite/pull/1419) ([@orangemug](https://github.com/orangemug) [@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Always file->print with light-mode enabled [#1315](https://github.com/tldraw/tldraw-lite/pull/1315) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- [chore] export frameutil [#1461](https://github.com/tldraw/tldraw-lite/pull/1461) ([@steveruizok](https://github.com/steveruizok))
- [chore] upgrade yarn [#1430](https://github.com/tldraw/tldraw-lite/pull/1430) ([@ds300](https://github.com/ds300))
- Added `preserveAspectRatio` to print for overflow of content [#1453](https://github.com/tldraw/tldraw-lite/pull/1453) ([@orangemug](https://github.com/orangemug))
- Fixed throttle of `updateBounds` in `useScreenBounds` [#1442](https://github.com/tldraw/tldraw-lite/pull/1442) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- [update] docs [#1448](https://github.com/tldraw/tldraw-lite/pull/1448) ([@steveruizok](https://github.com/steveruizok))
- Always paste images with opactiy=1 [#1444](https://github.com/tldraw/tldraw-lite/pull/1444) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- [improvement] Wrap `buildFromV1Document` in transact [#1435](https://github.com/tldraw/tldraw-lite/pull/1435) ([@steveruizok](https://github.com/steveruizok))
- Hack around the outline cache for rendering x-box shapes [#1438](https://github.com/tldraw/tldraw-lite/pull/1438) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- [fix] dev version number for tldraw/tldraw [#1434](https://github.com/tldraw/tldraw-lite/pull/1434) ([@steveruizok](https://github.com/steveruizok))
- repo cleanup [#1426](https://github.com/tldraw/tldraw-lite/pull/1426) ([@steveruizok](https://github.com/steveruizok))
- Vscode extension [#1253](https://github.com/tldraw/tldraw-lite/pull/1253) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@orangemug](https://github.com/orangemug))
- [fix] use polyfill for `structuredClone` [#1408](https://github.com/tldraw/tldraw-lite/pull/1408) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Run all the tests. Fix linting for tests. [#1389](https://github.com/tldraw/tldraw-lite/pull/1389) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix an issue with loading v1 draw shapes that don't have any points. [#1404](https://github.com/tldraw/tldraw-lite/pull/1404) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### ⚠️ Pushed to `main`

- Revert "update tldraw's bounds" ([@steveruizok](https://github.com/steveruizok))
- update tldraw's bounds ([@steveruizok](https://github.com/steveruizok))

#### Authors: 6

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu[ke] Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# @tldraw/tldraw-beta

## 2.0.0-alpha.11

### Patch Changes

- fix some package build scripting
- Updated dependencies
  - @tldraw/primitives@2.0.0-alpha.11
  - @tldraw/tlschema@2.0.0-alpha.11
  - @tldraw/tlstore@2.0.0-alpha.11
  - @tldraw/tlvalidate@2.0.0-alpha.10
  - @tldraw/utils@2.0.0-alpha.10

## 2.0.0-alpha.10

### Patch Changes

- Updated dependencies [4b4399b6e]
  - @tldraw/primitives@2.0.0-alpha.10
  - @tldraw/tlschema@2.0.0-alpha.10
  - @tldraw/tlstore@2.0.0-alpha.10
  - @tldraw/tlvalidate@2.0.0-alpha.9
  - @tldraw/utils@2.0.0-alpha.9

## 2.0.0-alpha.9

### Patch Changes

- Release day!
- Updated dependencies
  - @tldraw/primitives@2.0.0-alpha.9
  - @tldraw/tlschema@2.0.0-alpha.9
  - @tldraw/tlstore@2.0.0-alpha.9
  - @tldraw/tlvalidate@2.0.0-alpha.8
  - @tldraw/utils@2.0.0-alpha.8

## 2.0.0-alpha.8

### Patch Changes

- 23dd81cfe: Make signia a peer dependency
- Updated dependencies [23dd81cfe]
  - @tldraw/tlstore@2.0.0-alpha.8
  - @tldraw/tlschema@2.0.0-alpha.8
  - @tldraw/primitives@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.
- Updated dependencies
  - @tldraw/primitives@2.0.0-alpha.7
  - @tldraw/tlschema@2.0.0-alpha.7
  - @tldraw/tlstore@2.0.0-alpha.7
  - @tldraw/tlvalidate@2.0.0-alpha.7
  - @tldraw/utils@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.
- Updated dependencies
  - @tldraw/primitives@2.0.0-alpha.6
  - @tldraw/tlschema@2.0.0-alpha.6
  - @tldraw/tlstore@2.0.0-alpha.6
  - @tldraw/tlvalidate@2.0.0-alpha.6
  - @tldraw/utils@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.
- Updated dependencies
  - @tldraw/primitives@2.0.0-alpha.5
  - @tldraw/tlschema@2.0.0-alpha.5
  - @tldraw/tlstore@2.0.0-alpha.5
  - @tldraw/tlvalidate@2.0.0-alpha.5
  - @tldraw/utils@2.0.0-alpha.5

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw
- Updated dependencies
  - @tldraw/primitives@2.0.0-alpha.4
  - @tldraw/tlschema@2.0.0-alpha.4
  - @tldraw/tlstore@2.0.0-alpha.4
  - @tldraw/tlvalidate@2.0.0-alpha.4
  - @tldraw/utils@2.0.0-alpha.4

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.
- Updated dependencies
  - @tldraw/primitives@2.0.0-alpha.3
  - @tldraw/tlschema@2.0.0-alpha.3
  - @tldraw/tlstore@2.0.0-alpha.3
  - @tldraw/tlvalidate@2.0.0-alpha.3
  - @tldraw/utils@2.0.0-alpha.3

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor
- Updated dependencies
  - @tldraw/primitives@2.0.0-alpha.2
  - @tldraw/tlschema@2.0.0-alpha.2
  - @tldraw/tlstore@2.0.0-alpha.2
  - @tldraw/tlvalidate@2.0.0-alpha.2
  - @tldraw/utils@2.0.0-alpha.2

## 0.1.0-alpha.11

### Patch Changes

- Fix stale reactors.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.11
  - @tldraw/tlschema@0.1.0-alpha.11
  - @tldraw/tlstore@0.1.0-alpha.11
  - @tldraw/tlvalidate@0.1.0-alpha.11
  - @tldraw/utils@0.1.0-alpha.11

## 0.1.0-alpha.10

### Patch Changes

- Fix type export bug.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.10
  - @tldraw/tlschema@0.1.0-alpha.10
  - @tldraw/tlstore@0.1.0-alpha.10
  - @tldraw/tlvalidate@0.1.0-alpha.10
  - @tldraw/utils@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Fix import bugs.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.9
  - @tldraw/tlschema@0.1.0-alpha.9
  - @tldraw/tlstore@0.1.0-alpha.9
  - @tldraw/tlvalidate@0.1.0-alpha.9
  - @tldraw/utils@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Changes validation requirements, exports validation helpers.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.8
  - @tldraw/tlschema@0.1.0-alpha.8
  - @tldraw/tlstore@0.1.0-alpha.8
  - @tldraw/tlvalidate@0.1.0-alpha.8
  - @tldraw/utils@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- - Pre-pre-release update
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.7
  - @tldraw/tlschema@0.1.0-alpha.7
  - @tldraw/tlstore@0.1.0-alpha.7
  - @tldraw/tlvalidate@0.1.0-alpha.7
  - @tldraw/utils@0.1.0-alpha.7

## 0.0.2-alpha.1

### Patch Changes

- Fix error with HMR
- Updated dependencies
  - @tldraw/primitives@0.0.2-alpha.1
  - @tldraw/tlschema@0.0.2-alpha.1
  - @tldraw/tlstore@0.0.2-alpha.1
  - @tldraw/utils@0.0.2-alpha.1

## 0.0.2-alpha.0

### Patch Changes

- Initial release
- Updated dependencies
  - @tldraw/primitives@0.0.2-alpha.0
  - @tldraw/tlschema@0.0.2-alpha.0
  - @tldraw/tlstore@0.0.2-alpha.0
  - @tldraw/utils@0.0.2-alpha.0
