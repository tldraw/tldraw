# v2.0.0-alpha.19 (Tue Dec 12 2023)

#### 💥 Breaking Change

- No impure getters pt 1 [#2189](https://github.com/tldraw/tldraw/pull/2189) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### 🐛 Bug Fix

- no impure getters pt 11 [#2236](https://github.com/tldraw/tldraw/pull/2236) ([@ds300](https://github.com/ds300))
- No impure getters pt10 [#2235](https://github.com/tldraw/tldraw/pull/2235) ([@ds300](https://github.com/ds300))

#### 📝 Documentation

- Replace getters in examples [#2261](https://github.com/tldraw/tldraw/pull/2261) ([@ds300](https://github.com/ds300))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.18 (Fri Nov 10 2023)

### Release Notes

#### Remove (optional) from jsdocs ([#2109](https://github.com/tldraw/tldraw/pull/2109))

- dev: Removed duplicate/inconsistent `(optional)`s from docs

---

#### 🏠 Internal

- Revert "bump prerelease from alpha to beta" [#2192](https://github.com/tldraw/tldraw/pull/2192) ([@ds300](https://github.com/ds300))
- bump prerelease from alpha to beta [#2148](https://github.com/tldraw/tldraw/pull/2148) ([@ds300](https://github.com/ds300))

#### 📝 Documentation

- Remove (optional) from jsdocs [#2109](https://github.com/tldraw/tldraw/pull/2109) ([@TodePond](https://github.com/TodePond))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))

---

# v2.0.0-alpha.16 (Wed Oct 11 2023)

#### 🏠 Internal

- Publish api.json [#2034](https://github.com/tldraw/tldraw/pull/2034) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.15 (Fri Oct 06 2023)

### Release Notes

#### Editor commands API / effects ([#1778](https://github.com/tldraw/tldraw/pull/1778))

- tbd

#### tldraw zero - package shuffle ([#1710](https://github.com/tldraw/tldraw/pull/1710))

- [@tldraw/editor] lots, wip
- [@tldraw/ui] gone, merged to tldraw/tldraw
- [@tldraw/polyfills] gone, merged to tldraw/editor
- [@tldraw/primitives] gone, merged to tldraw/editor / tldraw/tldraw
- [@tldraw/indices] gone, merged to tldraw/editor
- [@tldraw/file-format] gone, merged to tldraw/tldraw

---

#### 💥 Breaking Change

- Revert "Editor commands API / effects" [#1783](https://github.com/tldraw/tldraw/pull/1783) ([@steveruizok](https://github.com/steveruizok))
- Editor commands API / effects [#1778](https://github.com/tldraw/tldraw/pull/1778) ([@steveruizok](https://github.com/steveruizok))
- tldraw zero - package shuffle [#1710](https://github.com/tldraw/tldraw/pull/1710) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- [improvement] More selection logic [#1806](https://github.com/tldraw/tldraw/pull/1806) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.14 (Tue Jul 04 2023)

#### 🐛 Bug Fix

- [fix] rename `global` in @tldraw/state to avoid collissions [#1672](https://github.com/tldraw/tldraw/pull/1672) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.13 (Wed Jun 28 2023)

#### 🔩 Dependency Updates

- Incorporate signia as @tldraw/state [#1620](https://github.com/tldraw/tldraw/pull/1620) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.12 (Mon Apr 03 2023)

#### 🐛 Bug Fix

- Make sure all types and build stuff get run in CI [#1548](https://github.com/tldraw/tldraw-lite/pull/1548) ([@SomeHats](https://github.com/SomeHats))
- add pre-commit api report generation [#1517](https://github.com/tldraw/tldraw-lite/pull/1517) ([@SomeHats](https://github.com/SomeHats))
- [chore] restore api extractor [#1500](https://github.com/tldraw/tldraw-lite/pull/1500) ([@steveruizok](https://github.com/steveruizok))
- Asset loading overhaul [#1457](https://github.com/tldraw/tldraw-lite/pull/1457) ([@SomeHats](https://github.com/SomeHats))
- David/publish good [#1488](https://github.com/tldraw/tldraw-lite/pull/1488) ([@ds300](https://github.com/ds300))
- [chore] alpha 10 [#1486](https://github.com/tldraw/tldraw-lite/pull/1486) ([@ds300](https://github.com/ds300))
- [chore] package build improvements [#1484](https://github.com/tldraw/tldraw-lite/pull/1484) ([@ds300](https://github.com/ds300))
- [chore] bump for alpha 8 [#1485](https://github.com/tldraw/tldraw-lite/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- [fix] page point offset [#1483](https://github.com/tldraw/tldraw-lite/pull/1483) ([@steveruizok](https://github.com/steveruizok))
- stop using broken-af turbo for publishing [#1476](https://github.com/tldraw/tldraw-lite/pull/1476) ([@ds300](https://github.com/ds300))
- [chore] add canary release script [#1423](https://github.com/tldraw/tldraw-lite/pull/1423) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [chore] upgrade yarn [#1430](https://github.com/tldraw/tldraw-lite/pull/1430) ([@ds300](https://github.com/ds300))
- flush store on attach [#1449](https://github.com/tldraw/tldraw-lite/pull/1449) ([@ds300](https://github.com/ds300))
- [fix] dev version number for tldraw/tldraw [#1434](https://github.com/tldraw/tldraw-lite/pull/1434) ([@steveruizok](https://github.com/steveruizok))
- repo cleanup [#1426](https://github.com/tldraw/tldraw-lite/pull/1426) ([@steveruizok](https://github.com/steveruizok))
- [fix] use polyfill for `structuredClone` [#1408](https://github.com/tldraw/tldraw-lite/pull/1408) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Run all the tests. Fix linting for tests. [#1389](https://github.com/tldraw/tldraw-lite/pull/1389) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### Authors: 5

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu[ke] Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# @tldraw/tlstore

## 2.0.0-alpha.11

### Patch Changes

- fix some package build scripting
- Updated dependencies
  - @tldraw/utils@2.0.0-alpha.10

## 2.0.0-alpha.10

### Patch Changes

- 4b4399b6e: redeploy with yarn to prevent package version issues
- Updated dependencies [4b4399b6e]
  - @tldraw/utils@2.0.0-alpha.9

## 2.0.0-alpha.9

### Patch Changes

- Release day!
- Updated dependencies
  - @tldraw/utils@2.0.0-alpha.8

## 2.0.0-alpha.8

### Patch Changes

- 23dd81cfe: Make signia a peer dependency

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.
- Updated dependencies
  - @tldraw/utils@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.
- Updated dependencies
  - @tldraw/utils@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.
- Updated dependencies
  - @tldraw/utils@2.0.0-alpha.5

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw
- Updated dependencies
  - @tldraw/utils@2.0.0-alpha.4

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.
- Updated dependencies
  - @tldraw/utils@2.0.0-alpha.3

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor
- Updated dependencies
  - @tldraw/utils@2.0.0-alpha.2

## 0.1.0-alpha.11

### Patch Changes

- Fix stale reactors.
- Updated dependencies
  - @tldraw/utils@0.1.0-alpha.11

## 0.1.0-alpha.10

### Patch Changes

- Fix type export bug.
- Updated dependencies
  - @tldraw/utils@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Fix import bugs.
- Updated dependencies
  - @tldraw/utils@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Changes validation requirements, exports validation helpers.
- Updated dependencies
  - @tldraw/utils@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- - Pre-pre-release update
- Updated dependencies
  - @tldraw/utils@0.1.0-alpha.7

## 0.0.2-alpha.1

### Patch Changes

- Fix error with HMR
- Updated dependencies
  - @tldraw/utils@0.0.2-alpha.1

## 0.0.2-alpha.0

### Patch Changes

- Initial release
- Updated dependencies
  - @tldraw/utils@0.0.2-alpha.0
