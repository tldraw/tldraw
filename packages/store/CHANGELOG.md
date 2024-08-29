# v2.4.6 (Thu Aug 29 2024)

#### 🐛 Bug Fix

- [patch hotfix] render perf thingy [#4434](https://github.com/tldraw/tldraw/pull/4434) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.3.0 (Tue Jun 25 2024)

### Release Notes

#### Update license in readme of the store package ([#3990](https://github.com/tldraw/tldraw/pull/3990))

- Fix the license in the readme file for the store package.

---

#### 📚 SDK Changes

- security: enforce use of our fetch function and its default referrerpolicy [#3884](https://github.com/tldraw/tldraw/pull/3884) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 📖 Documentation changes

- Update license in readme of the store package [#3990](https://github.com/tldraw/tldraw/pull/3990) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### Authors: 2

- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))

---

# v2.2.0 (Tue Jun 11 2024)

### Release Notes

#### Snapshots pit of success ([#3811](https://github.com/tldraw/tldraw/pull/3811))

- Add a brief release note for your PR here.

#### focus: rework and untangle existing focus management logic in the sdk ([#3718](https://github.com/tldraw/tldraw/pull/3718))

- Focus: rework and untangle existing focus management logic in the SDK

#### Store-level "operation end" event ([#3748](https://github.com/tldraw/tldraw/pull/3748))

#### Breaking changes
`editor.registerBatchCompleteHandler` has been replaced with `editor.registerOperationCompleteHandler`

#### Move arrow helpers from editor to tldraw ([#3721](https://github.com/tldraw/tldraw/pull/3721))

#### Breaking changes
- `editor.getArrowInfo(shape)` has been replaced with `getArrowInfo(editor, shape)`
- `editor.getArrowsBoundTo(shape)` has been removed. Instead, use `editor.getBindingsToShape(shape, 'arrow')` and follow the `fromId` of each binding to the corresponding arrow shape
- These types have moved from `@tldraw/editor` to `tldraw`:
    - `TLArcInfo`
    - `TLArrowInfo`
    - `TLArrowPoint`
- `WeakMapCache` has been removed

#### Bindings ([#3326](https://github.com/tldraw/tldraw/pull/3326))

#### Breaking changes
- The `start` and `end` properties on `TLArrowShape` no longer have `type: point | binding`. Instead, they're always a point, which may be out of date if a binding exists. To check for & retrieve arrow bindings, use `getArrowBindings(editor, shape)` instead.
- `getArrowTerminalsInArrowSpace` must be passed a `TLArrowBindings` as a third argument: `getArrowTerminalsInArrowSpace(editor, shape, getArrowBindings(editor, shape))`
- The following types have been renamed:
    - `ShapeProps` -> `RecordProps`
    - `ShapePropsType` -> `RecordPropsType`
    - `TLShapePropsMigrations` -> `TLPropsMigrations`
    - `SchemaShapeInfo` -> `SchemaPropsInfo`

---

#### 📚 SDK Changes

- Add return info to StoreSideEffects methods [#3918](https://github.com/tldraw/tldraw/pull/3918) ([@steveruizok](https://github.com/steveruizok))
- Snapshots pit of success [#3811](https://github.com/tldraw/tldraw/pull/3811) ([@ds300](https://github.com/ds300))
- Force `interface` instead of `type` for better docs [#3815](https://github.com/tldraw/tldraw/pull/3815) ([@SomeHats](https://github.com/SomeHats))
- focus: rework and untangle existing focus management logic in the sdk [#3718](https://github.com/tldraw/tldraw/pull/3718) ([@mimecuvalo](https://github.com/mimecuvalo))
- Store-level "operation end" event [#3748](https://github.com/tldraw/tldraw/pull/3748) ([@SomeHats](https://github.com/SomeHats))
- Move arrow helpers from editor to tldraw [#3721](https://github.com/tldraw/tldraw/pull/3721) ([@SomeHats](https://github.com/SomeHats))
- Bindings [#3326](https://github.com/tldraw/tldraw/pull/3326) ([@SomeHats](https://github.com/SomeHats))
- Automatic undo/redo [#3364](https://github.com/tldraw/tldraw/pull/3364) ([@SomeHats](https://github.com/SomeHats))

#### 📖 Documentation changes

- make sure everything marked @public gets documented [#3892](https://github.com/tldraw/tldraw/pull/3892) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- Don't check api.json files into git [#3565](https://github.com/tldraw/tldraw/pull/3565) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.1.0 (Tue Apr 23 2024)

### Release Notes

#### New migrations again ([#3220](https://github.com/tldraw/tldraw/pull/3220))

#### BREAKING CHANGES

- The `Migrations` type is now called `LegacyMigrations`.
- The serialized schema format (e.g. returned by `StoreSchema.serialize()` and `Store.getSnapshot()`) has changed. You don't need to do anything about it unless you were reading data directly from the schema for some reason. In which case it'd be best to avoid that in the future! We have no plans to change the schema format again (this time was traumatic enough) but you never know.
- `compareRecordVersions` and the `RecordVersion` type have both disappeared. There is no replacement. These were public by mistake anyway, so hopefully nobody had been using it.
- `compareSchemas` is gone. Comparing the schemas directly is no longer really possible since we introduced some fuzziness. The best thing to do now to check compatibility is to call `schema.getMigraitonsSince(prevSchema)` and it will return an error if the schemas are not compatible, an empty array if there are no migrations to apply since the prev schema, and a nonempty array otherwise.

   Generally speaking, the best way to check schema compatibility now is to call `store.schema.getMigrationsSince(persistedSchema)`. This will throw an error if there is no upgrade path from the `persistedSchema` to the current version.

- `defineMigrations` has been deprecated and will be removed in a future release. For upgrade instructions see https://tldraw.dev/docs/persistence#Updating-legacy-shape-migrations-defineMigrations

- `migrate` has been removed. Nobody should have been using this but if you were you'll need to find an alternative. For migrating tldraw data, you should stick to using `schema.migrateStoreSnapshot` and, if you are building a nuanced sync engine that supports some amount of backwards compatibility, also feel free to use `schema.migratePersistedRecord`.
- the `Migration` type has changed. If you need the old one for some reason it has been renamed to `LegacyMigration`. It will be removed in a future release.
- the `Migrations` type has been renamed to `LegacyMigrations` and will be removed in a future release.
- the `SerializedSchema` type has been augmented. If you need the old version specifically you can use `SerializedSchemaV1`

#### Perf: (slightly) faster min dist checks ([#3401](https://github.com/tldraw/tldraw/pull/3401))

- Performance: small improvements to hit testing.

#### Don't double squash ([#3182](https://github.com/tldraw/tldraw/pull/3182))

- Minor improvement when modifying multiple shapes at once.

#### Performance improvements ([#2977](https://github.com/tldraw/tldraw/pull/2977))

- Improves the performance of rendering.

---

#### 💥 Breaking Change

- Performance improvements [#2977](https://github.com/tldraw/tldraw/pull/2977) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 📚 SDK Changes

- New migrations again [#3220](https://github.com/tldraw/tldraw/pull/3220) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- undo devFreeze unintentional commit [#3466](https://github.com/tldraw/tldraw/pull/3466) ([@mimecuvalo](https://github.com/mimecuvalo))
- Improve hand dragging with long press [#3432](https://github.com/tldraw/tldraw/pull/3432) ([@steveruizok](https://github.com/steveruizok))
- Perf: (slightly) faster min dist checks [#3401](https://github.com/tldraw/tldraw/pull/3401) ([@steveruizok](https://github.com/steveruizok))
- Fix typo. [#3306](https://github.com/tldraw/tldraw/pull/3306) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Don't double squash [#3182](https://github.com/tldraw/tldraw/pull/3182) ([@steveruizok](https://github.com/steveruizok))
- use native structuredClone on node, cloudflare workers, and in tests [#3166](https://github.com/tldraw/tldraw/pull/3166) ([@si14](https://github.com/si14))

#### 📖 Documentation changes

- Fix typo in Store.ts [#3385](https://github.com/tldraw/tldraw/pull/3385) ([@OrionReed](https://github.com/OrionReed))

#### Authors: 6

- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orion Reed ([@OrionReed](https://github.com/OrionReed))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.5 (Thu Feb 29 2024)

#### 🔩 Dependency Updates

- bump typescript / api-extractor [#2949](https://github.com/tldraw/tldraw/pull/2949) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.4 (Wed Feb 21 2024)

### Release Notes

#### Faster validations + record reference stability at the same time ([#2848](https://github.com/tldraw/tldraw/pull/2848))

- Add a brief release note for your PR here.

---

#### 🐛 Bug Fix

- Faster validations + record reference stability at the same time [#2848](https://github.com/tldraw/tldraw/pull/2848) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- Check tsconfig "references" arrays [#2891](https://github.com/tldraw/tldraw/pull/2891) ([@ds300](https://github.com/ds300))
- dev: swap yarn test and test-dev for better dx [#2773](https://github.com/tldraw/tldraw/pull/2773) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))

---

# v2.0.0-beta.3 (Tue Feb 13 2024)

### Release Notes

#### dev: add test-dev command for easier testing of packages ([#2627](https://github.com/tldraw/tldraw/pull/2627))

- Adds easier testing command for individual packages.

---

#### 🚀 Enhancement

- [dx] use Biome instead of Prettier, part 2 [#2731](https://github.com/tldraw/tldraw/pull/2731) ([@si14](https://github.com/si14))

#### 🏠 Internal

- Unbiome [#2776](https://github.com/tldraw/tldraw/pull/2776) ([@si14](https://github.com/si14))
- Update the project to Node 20 [#2691](https://github.com/tldraw/tldraw/pull/2691) ([@si14](https://github.com/si14))
- make CI check for yarn install warnings and fix the peer deps ones we have [#2683](https://github.com/tldraw/tldraw/pull/2683) ([@si14](https://github.com/si14))
- dev: add test-dev command for easier testing of packages [#2627](https://github.com/tldraw/tldraw/pull/2627) ([@mimecuvalo](https://github.com/mimecuvalo))
- unbrivate, dot com in [#2475](https://github.com/tldraw/tldraw/pull/2475) ([@steveruizok](https://github.com/steveruizok) [@si14](https://github.com/si14) [@SomeHats](https://github.com/SomeHats))
- Add docs [#2470](https://github.com/tldraw/tldraw/pull/2470) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- Bump jest to fix weird prettier bug [#2716](https://github.com/tldraw/tldraw/pull/2716) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Bump Yarn to 4.0.2 and add version constraints [#2481](https://github.com/tldraw/tldraw/pull/2481) ([@si14](https://github.com/si14))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.2 (Wed Jan 10 2024)

#### 🐛 Bug Fix

- Fix meta examples [#2379](https://github.com/tldraw/tldraw/pull/2379) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.1 (Wed Dec 20 2023)

### Release Notes

#### Prevent diff mutation ([#2336](https://github.com/tldraw/tldraw/pull/2336))

- Fix `squashRecordDiffs` to prevent a bug where it mutates the 'updated' entires

---

#### 💥 Breaking Change

- bump to beta [#2364](https://github.com/tldraw/tldraw/pull/2364) ([@steveruizok](https://github.com/steveruizok))
- Change licenses to tldraw [#2167](https://github.com/tldraw/tldraw/pull/2167) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Prevent diff mutation [#2336](https://github.com/tldraw/tldraw/pull/2336) ([@ds300](https://github.com/ds300))
- Call devFreeze on initialData [#2332](https://github.com/tldraw/tldraw/pull/2332) ([@ds300](https://github.com/ds300))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.19 (Tue Dec 12 2023)

#### 💥 Breaking Change

- No impure getters pt 1 [#2189](https://github.com/tldraw/tldraw/pull/2189) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### 🐛 Bug Fix

- No impure getters pt10 [#2235](https://github.com/tldraw/tldraw/pull/2235) ([@ds300](https://github.com/ds300))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.18 (Fri Nov 10 2023)

#### 🏠 Internal

- Revert "bump prerelease from alpha to beta" [#2192](https://github.com/tldraw/tldraw/pull/2192) ([@ds300](https://github.com/ds300))
- bump prerelease from alpha to beta [#2148](https://github.com/tldraw/tldraw/pull/2148) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-alpha.17 (Tue Oct 17 2023)

#### 🔩 Dependency Updates

- bump nanoid [#2078](https://github.com/tldraw/tldraw/pull/2078) ([@ds300](https://github.com/ds300))

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

#### Fix shape drag perf ([#1932](https://github.com/tldraw/tldraw/pull/1932))

- Fixes a perf regression for dragging shapes around

#### Migrate snapshot ([#1843](https://github.com/tldraw/tldraw/pull/1843))

- [editor] add `Store.migrateSnapshot`

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

- SideEffectManager [#1785](https://github.com/tldraw/tldraw/pull/1785) ([@steveruizok](https://github.com/steveruizok))
- Revert "Editor commands API / effects" [#1783](https://github.com/tldraw/tldraw/pull/1783) ([@steveruizok](https://github.com/steveruizok))
- Editor commands API / effects [#1778](https://github.com/tldraw/tldraw/pull/1778) ([@steveruizok](https://github.com/steveruizok))
- tldraw zero - package shuffle [#1710](https://github.com/tldraw/tldraw/pull/1710) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- Migrate snapshot [#1843](https://github.com/tldraw/tldraw/pull/1843) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix shape drag perf [#1932](https://github.com/tldraw/tldraw/pull/1932) ([@ds300](https://github.com/ds300))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.14 (Tue Jul 04 2023)

### Release Notes

#### [fix] mutating `snapshot` in `migrateStoreSnapshot` ([#1663](https://github.com/tldraw/tldraw/pull/1663))

- [@tldraw/store] Fixed a bug that would cause `Store.migrateStoreSnapshot` to mutate its `snapshot` argument.

---

#### 🐛 Bug Fix

- [fix] mutating `snapshot` in `migrateStoreSnapshot` [#1663](https://github.com/tldraw/tldraw/pull/1663) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.13 (Wed Jun 28 2023)

### Release Notes

#### [improvement] store snapshot types ([#1657](https://github.com/tldraw/tldraw/pull/1657))

- [dev] Rename `StoreSnapshot` to `SerializedStore`
- [dev] Create new `StoreSnapshot` as type related to `getSnapshot`/`loadSnapshot`

#### tlschema cleanup ([#1509](https://github.com/tldraw/tldraw/pull/1509))

- [editor] Remove `app.createShapeId`
- [tlschema] Cleans up exports

#### Rename tlstore to store ([#1507](https://github.com/tldraw/tldraw/pull/1507))

- Replace @tldraw/tlstore with @tldraw/store

---

#### 💥 Breaking Change

- [tweak] migrate store snapshot arguments [#1659](https://github.com/tldraw/tldraw/pull/1659) ([@steveruizok](https://github.com/steveruizok))
- [improvement] store snapshot types [#1657](https://github.com/tldraw/tldraw/pull/1657) ([@steveruizok](https://github.com/steveruizok))
- Independent instance state persistence [#1493](https://github.com/tldraw/tldraw/pull/1493) ([@ds300](https://github.com/ds300))
- tlschema cleanup [#1509](https://github.com/tldraw/tldraw/pull/1509) ([@steveruizok](https://github.com/steveruizok))
- Rename tlstore to store [#1507](https://github.com/tldraw/tldraw/pull/1507) ([@steveruizok](https://github.com/steveruizok))

#### ⚠️ Pushed to `main`

- update lazyrepo ([@ds300](https://github.com/ds300))

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
