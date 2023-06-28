# v2.0.0-alpha.13 (Wed Jun 28 2023)

### Release Notes

#### `ShapeUtil` refactor, `Editor` cleanup ([#1611](https://github.com/tldraw/tldraw/pull/1611))

- [editor] renames `defaultProps` to `getDefaultProps`
- [editor] removes `outline`, `outlineSegments`, `handles`, `bounds`
- [editor] renames `renderBackground` to `backgroundComponent`

#### Revert "Update dependencies (#1613)" ([#1617](https://github.com/tldraw/tldraw/pull/1617))

-

#### tldraw.css ([#1607](https://github.com/tldraw/tldraw/pull/1607))

- [tldraw] Removes `editor.css` and `ui.css` exports, replaces with `tldraw.css`

#### mini `defineShape` API ([#1563](https://github.com/tldraw/tldraw/pull/1563))

[dev-facing, notes to come]

#### rename app to editor ([#1503](https://github.com/tldraw/tldraw/pull/1503))

- Rename `App` to `Editor` and many other things that reference `app` to `editor`.

#### [chore] refactor user preferences ([#1435](https://github.com/tldraw/tldraw/pull/1435))

- Add a brief release note for your PR here.

#### [refactor] restore createTLSchema ([#1444](https://github.com/tldraw/tldraw/pull/1444))

- [editor] Simplifies custom shape definition
- [tldraw] Updates props for <TldrawEditor> component to require a `TldrawEditorConfig`.

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

---

#### 💥 Breaking Change

- `ShapeUtil` refactor, `Editor` cleanup [#1611](https://github.com/tldraw/tldraw/pull/1611) ([@steveruizok](https://github.com/steveruizok))
- tldraw.css [#1607](https://github.com/tldraw/tldraw/pull/1607) ([@steveruizok](https://github.com/steveruizok))
- mini `defineShape` API [#1563](https://github.com/tldraw/tldraw/pull/1563) ([@SomeHats](https://github.com/SomeHats))
- rename app to editor [#1503](https://github.com/tldraw/tldraw/pull/1503) ([@steveruizok](https://github.com/steveruizok))
- [refactor] User-facing APIs [#1478](https://github.com/tldraw/tldraw/pull/1478) ([@steveruizok](https://github.com/steveruizok))
- [chore] refactor user preferences [#1435](https://github.com/tldraw/tldraw/pull/1435) ([@ds300](https://github.com/ds300))
- [refactor] restore createTLSchema [#1444](https://github.com/tldraw/tldraw/pull/1444) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- [fix] tldraw api report [#1615](https://github.com/tldraw/tldraw/pull/1615) ([@steveruizok](https://github.com/steveruizok))
- New vite-based examples app [#1226](https://github.com/tldraw/tldraw/pull/1226) ([@SomeHats](https://github.com/SomeHats))
- readmes [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@steveruizok](https://github.com/steveruizok))
- [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
- derived presence state [#1204](https://github.com/tldraw/tldraw/pull/1204) ([@ds300](https://github.com/ds300))
- Fix to not ignore the `userId` option for `<Tldraw/>` component in `@tldraw/tldraw` [#1205](https://github.com/tldraw/tldraw/pull/1205) ([@orangemug](https://github.com/orangemug))
- [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
- transfer-out: transfer out [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- [chore] remove benchmark [#1489](https://github.com/tldraw/tldraw/pull/1489) ([@steveruizok](https://github.com/steveruizok))
- avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))

#### 🔩 Dependency Updates

- Revert "Update dependencies (#1613)" [#1617](https://github.com/tldraw/tldraw/pull/1617) ([@SomeHats](https://github.com/SomeHats))
- Update dependencies [#1613](https://github.com/tldraw/tldraw/pull/1613) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.12 (Mon Apr 03 2023)

#### 🐛 Bug Fix

- Make sure all types and build stuff get run in CI [#1548](https://github.com/tldraw/tldraw-lite/pull/1548) ([@SomeHats](https://github.com/SomeHats))
- [fix] Tldraw component props [#1552](https://github.com/tldraw/tldraw-lite/pull/1552) ([@ds300](https://github.com/ds300))
- add pre-commit api report generation [#1517](https://github.com/tldraw/tldraw-lite/pull/1517) ([@SomeHats](https://github.com/SomeHats))
- [chore] restore api extractor [#1500](https://github.com/tldraw/tldraw-lite/pull/1500) ([@steveruizok](https://github.com/steveruizok))
- David/publish good [#1488](https://github.com/tldraw/tldraw-lite/pull/1488) ([@ds300](https://github.com/ds300))
- [chore] alpha 10 [#1486](https://github.com/tldraw/tldraw-lite/pull/1486) ([@ds300](https://github.com/ds300))
- [chore] package build improvements [#1484](https://github.com/tldraw/tldraw-lite/pull/1484) ([@ds300](https://github.com/ds300))
- [chore] bump for alpha 8 [#1485](https://github.com/tldraw/tldraw-lite/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- stop using broken-af turbo for publishing [#1476](https://github.com/tldraw/tldraw-lite/pull/1476) ([@ds300](https://github.com/ds300))
- [chore] add canary release script [#1423](https://github.com/tldraw/tldraw-lite/pull/1423) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [chore] upgrade yarn [#1430](https://github.com/tldraw/tldraw-lite/pull/1430) ([@ds300](https://github.com/ds300))
- repo cleanup [#1426](https://github.com/tldraw/tldraw-lite/pull/1426) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# @tldraw/ui

## 2.0.0-alpha.11

### Patch Changes

- fix some package build scripting
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.11
  - @tldraw/polyfills@2.0.0-alpha.10
  - @tldraw/tlsync-client@2.0.0-alpha.11
  - @tldraw/ui@2.0.0-alpha.11

## 2.0.0-alpha.10

### Patch Changes

- 4b4399b6e: redeploy with yarn to prevent package version issues
- Updated dependencies [4b4399b6e]
  - @tldraw/polyfills@2.0.0-alpha.9
  - @tldraw/tlsync-client@2.0.0-alpha.10
  - @tldraw/ui@2.0.0-alpha.10
  - @tldraw/editor@2.0.0-alpha.10

## 2.0.0-alpha.9

### Patch Changes

- Release day!
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.9
  - @tldraw/polyfills@2.0.0-alpha.8
  - @tldraw/tlsync-client@2.0.0-alpha.9
  - @tldraw/ui@2.0.0-alpha.9

## 2.0.0-alpha.8

### Patch Changes

- Updated dependencies [23dd81cfe]
  - @tldraw/editor@2.0.0-alpha.8
  - @tldraw/tlsync-client@2.0.0-alpha.8
  - @tldraw/ui@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.7
  - @tldraw/tlsync-client@2.0.0-alpha.7
  - @tldraw/ui@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.6
  - @tldraw/tlsync-client@2.0.0-alpha.6
  - @tldraw/ui@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.5
  - @tldraw/tlsync-client@2.0.0-alpha.5
  - @tldraw/ui@2.0.0-alpha.5

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.4
  - @tldraw/tlsync-client@2.0.0-alpha.4
  - @tldraw/ui@2.0.0-alpha.4

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.3
  - @tldraw/tlsync-client@2.0.0-alpha.3
  - @tldraw/ui@2.0.0-alpha.3

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor
- Updated dependencies
  - @tldraw/editor@2.0.0-alpha.2
  - @tldraw/tlsync-client@2.0.0-alpha.2
  - @tldraw/ui@2.0.0-alpha.2

## 0.1.0-alpha.11

### Patch Changes

- Fix stale reactors.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.11
  - @tldraw/tldraw-beta@0.1.0-alpha.11
  - @tldraw/tlsync-client@0.1.0-alpha.11
  - @tldraw/utils@0.1.0-alpha.11

## 0.1.0-alpha.10

### Patch Changes

- Fix type export bug.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.10
  - @tldraw/tldraw-beta@0.1.0-alpha.10
  - @tldraw/tlsync-client@0.1.0-alpha.10
  - @tldraw/utils@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Fix import bugs.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.9
  - @tldraw/tldraw-beta@0.1.0-alpha.9
  - @tldraw/tlsync-client@0.1.0-alpha.9
  - @tldraw/utils@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Changes validation requirements, exports validation helpers.
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.8
  - @tldraw/tldraw-beta@0.1.0-alpha.8
  - @tldraw/tlsync-client@0.1.0-alpha.8
  - @tldraw/utils@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- - Pre-pre-release update
- Updated dependencies
  - @tldraw/primitives@0.1.0-alpha.7
  - @tldraw/tldraw-beta@0.1.0-alpha.7
  - @tldraw/tlsync-client@0.1.0-alpha.7
  - @tldraw/utils@0.1.0-alpha.7

## 0.0.2-alpha.1

### Patch Changes

- Fix error with HMR
- Updated dependencies
  - @tldraw/primitives@0.0.2-alpha.1
  - @tldraw/tldraw-beta@0.0.2-alpha.1
  - @tldraw/tlsync-client@0.0.2-alpha.1
  - @tldraw/utils@0.0.2-alpha.1

## 0.0.2-alpha.0

### Patch Changes

- Initial release
- Updated dependencies
  - @tldraw/primitives@0.0.2-alpha.0
  - @tldraw/tldraw-beta@0.0.2-alpha.0
  - @tldraw/tlsync-client@0.0.2-alpha.0
  - @tldraw/utils@0.0.2-alpha.0
