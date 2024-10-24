# v3.3.0 (Wed Oct 09 2024)

### Release Notes

#### [dotcom] Menus, dialogs, toasts, etc. ([#4624](https://github.com/tldraw/tldraw/pull/4624))

- exports dialogs system
- exports toasts system
- exports translations system
- create a global `tlmenus` system for menus
- create a global `tltime` system for timers
- create a global `tlenv` for environment" 
- create a `useMaybeEditor` hook

#### Add eslint rule to check that tsdoc params match with function params ([#4615](https://github.com/tldraw/tldraw/pull/4615))

- Add lint rules to check for discrepancies between tsdoc params and function params and fix all the discovered issues.

---

#### 🐛 Bug Fix

- [dotcom] Menus, dialogs, toasts, etc. [#4624](https://github.com/tldraw/tldraw/pull/4624) ([@steveruizok](https://github.com/steveruizok))

#### 💄 Product Improvements

- Add eslint rule to check that tsdoc params match with function params [#4615](https://github.com/tldraw/tldraw/pull/4615) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### Authors: 2

- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.1.0 (Wed Sep 25 2024)

#### 🐛 Bug Fix

- docs: cleanup/add readmes/licenses [#4542](https://github.com/tldraw/tldraw/pull/4542) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
- Clean up `apps` directory [#4548](https://github.com/tldraw/tldraw/pull/4548) ([@SomeHats](https://github.com/SomeHats))
- licenses: add MIT and update GB ones to match US [#4517](https://github.com/tldraw/tldraw/pull/4517) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🐛 Bug Fixes

- Fix cloudflare worker error when using tldraw packages [#4549](https://github.com/tldraw/tldraw/pull/4549) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.0.0 (Fri Sep 13 2024)

### Release Notes

#### Add sleep fn ([#4454](https://github.com/tldraw/tldraw/pull/4454))

(internal-only change)

#### add default <foreignObject> based export for shapes ([#4403](https://github.com/tldraw/tldraw/pull/4403))

Custom shapes (and our own bookmark shapes) now render in image exports by default.

#### Detect multiple installed versions of tldraw packages ([#4398](https://github.com/tldraw/tldraw/pull/4398))

- We detect when there are multiple versions of tldraw installed and let you know, as this can cause bugs in your application

#### Custom embeds API ([#4326](https://github.com/tldraw/tldraw/pull/4326))

Adds the ability to customize the embeds that are supported. You can now customize or reorder the existing embeds, as well as add completely new ones.

#### Hotfix for index keys validation ([#4361](https://github.com/tldraw/tldraw/pull/4361))

- Fixed a bug with the index key validation logic

#### fractional indexing: rm the 0 check for indicies, outdated with jitter code ([#4332](https://github.com/tldraw/tldraw/pull/4332))

- Fix a bug with fractional indexing validation with the new jitter library.

#### shape ordering: upgrade fractional indexing to use jitter, avoid conflicts ([#4312](https://github.com/tldraw/tldraw/pull/4312))

- Shape ordering: upgrade fractional indexing to use jitter, avoid conflicts

#### Move from function properties to methods ([#4288](https://github.com/tldraw/tldraw/pull/4288))

- Adds eslint rules for enforcing the use of methods instead of function properties and fixes / disables all the resulting errors.

#### Sync docs, further refinements ([#4263](https://github.com/tldraw/tldraw/pull/4263))



---

#### 🐛 Bug Fix

- [SORRY, PLEASE MERGE] 3.0 megabus [#4494](https://github.com/tldraw/tldraw/pull/4494) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- Better docs search [#4485](https://github.com/tldraw/tldraw/pull/4485) ([@SomeHats](https://github.com/SomeHats) [@mimecuvalo](https://github.com/mimecuvalo))
- Add sleep fn [#4454](https://github.com/tldraw/tldraw/pull/4454) ([@SomeHats](https://github.com/SomeHats))
- chore: license cleanup [#4416](https://github.com/tldraw/tldraw/pull/4416) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update READMEs. [#4377](https://github.com/tldraw/tldraw/pull/4377) ([@steveruizok](https://github.com/steveruizok))
- Sync docs, further refinements [#4263](https://github.com/tldraw/tldraw/pull/4263) ([@adamwiggins](https://github.com/adamwiggins) [@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fixes

- Hotfix for index keys validation [#4361](https://github.com/tldraw/tldraw/pull/4361) ([@ds300](https://github.com/ds300))
- fractional indexing: rm the 0 check for indicies, outdated with jitter code [#4332](https://github.com/tldraw/tldraw/pull/4332) ([@mimecuvalo](https://github.com/mimecuvalo))
- shape ordering: upgrade fractional indexing to use jitter, avoid conflicts [#4312](https://github.com/tldraw/tldraw/pull/4312) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 💄 Product Improvements

- add default <foreignObject> based export for shapes [#4403](https://github.com/tldraw/tldraw/pull/4403) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- inline nanoid [#4410](https://github.com/tldraw/tldraw/pull/4410) ([@SomeHats](https://github.com/SomeHats))

#### 🎉 New Features

- Custom embeds API [#4326](https://github.com/tldraw/tldraw/pull/4326) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🛠️ API Changes

- support tc39 decorators [#4412](https://github.com/tldraw/tldraw/pull/4412) ([@SomeHats](https://github.com/SomeHats))
- Detect multiple installed versions of tldraw packages [#4398](https://github.com/tldraw/tldraw/pull/4398) ([@SomeHats](https://github.com/SomeHats))
- Move from function properties to methods [#4288](https://github.com/tldraw/tldraw/pull/4288) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### Authors: 7

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- Adam Wiggins ([@adamwiggins](https://github.com/adamwiggins))
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.4.0 (Mon Jul 22 2024)

#### 🏠 Internal

- Initial bemo worker setup [#4017](https://github.com/tldraw/tldraw/pull/4017) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.3.0 (Tue Jun 25 2024)

#### 📚 SDK Changes

- security: enforce use of our fetch function and its default referrerpolicy [#3884](https://github.com/tldraw/tldraw/pull/3884) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🖥️ tldraw.com Changes

- lod: dont transform SVGs [#3972](https://github.com/tldraw/tldraw/pull/3972) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 1

- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))

---

# v2.2.0 (Tue Jun 11 2024)

### Release Notes

#### security: don't send referrer paths for images and bookmarks ([#3881](https://github.com/tldraw/tldraw/pull/3881))

- Security: fix referrer being sent for bookmarks and images.

#### editor: register timeouts/intervals/rafs for disposal ([#3852](https://github.com/tldraw/tldraw/pull/3852))

- Editor: add registry of timeouts/intervals/rafs

#### assets: rework mime-type detection to be consistent/centralized; add support for webp/webm, apng, avif ([#3730](https://github.com/tldraw/tldraw/pull/3730))

- Images: unify list of acceptable types and expand to include webp, webm, apng, avif

#### Move arrow helpers from editor to tldraw ([#3721](https://github.com/tldraw/tldraw/pull/3721))

#### Breaking changes
- `editor.getArrowInfo(shape)` has been replaced with `getArrowInfo(editor, shape)`
- `editor.getArrowsBoundTo(shape)` has been removed. Instead, use `editor.getBindingsToShape(shape, 'arrow')` and follow the `fromId` of each binding to the corresponding arrow shape
- These types have moved from `@tldraw/editor` to `tldraw`:
    - `TLArcInfo`
    - `TLArrowInfo`
    - `TLArrowPoint`
- `WeakMapCache` has been removed

---

#### 📚 SDK Changes

- security: don't send referrer paths for images and bookmarks [#3881](https://github.com/tldraw/tldraw/pull/3881) ([@mimecuvalo](https://github.com/mimecuvalo))
- editor: register timeouts/intervals/rafs for disposal [#3852](https://github.com/tldraw/tldraw/pull/3852) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Force `interface` instead of `type` for better docs [#3815](https://github.com/tldraw/tldraw/pull/3815) ([@SomeHats](https://github.com/SomeHats))
- assets: rework mime-type detection to be consistent/centralized; add support for webp/webm, apng, avif [#3730](https://github.com/tldraw/tldraw/pull/3730) ([@mimecuvalo](https://github.com/mimecuvalo))
- Move arrow helpers from editor to tldraw [#3721](https://github.com/tldraw/tldraw/pull/3721) ([@SomeHats](https://github.com/SomeHats))
- Camera options followups [#3701](https://github.com/tldraw/tldraw/pull/3701) ([@steveruizok](https://github.com/steveruizok))

#### 📖 Documentation changes

- make sure everything marked @public gets documented [#3892](https://github.com/tldraw/tldraw/pull/3892) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- Update READMEs, add form link [#3741](https://github.com/tldraw/tldraw/pull/3741) ([@steveruizok](https://github.com/steveruizok))
- Measure action durations and fps for our interactions [#3472](https://github.com/tldraw/tldraw/pull/3472) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Don't check api.json files into git [#3565](https://github.com/tldraw/tldraw/pull/3565) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.1.0 (Tue Apr 23 2024)

### Release Notes

#### Perf: minor drawing speedup ([#3464](https://github.com/tldraw/tldraw/pull/3464))

- Improve performance of draw shapes.

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

#### Input buffering ([#3223](https://github.com/tldraw/tldraw/pull/3223))

- Add a brief release note for your PR here.

#### Fix lag while panning + translating at the same time ([#3186](https://github.com/tldraw/tldraw/pull/3186))

- Add a brief release note for your PR here.

#### Performance improvements ([#2977](https://github.com/tldraw/tldraw/pull/2977))

- Improves the performance of rendering.

#### Protect local storage calls ([#3043](https://github.com/tldraw/tldraw/pull/3043))

- Fixes a bug that could cause crashes in React Native webviews.

---

#### 💥 Breaking Change

- Performance improvements [#2977](https://github.com/tldraw/tldraw/pull/2977) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 📚 SDK Changes

- Perf: minor drawing speedup [#3464](https://github.com/tldraw/tldraw/pull/3464) ([@steveruizok](https://github.com/steveruizok))
- New migrations again [#3220](https://github.com/tldraw/tldraw/pull/3220) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Perf: slightly faster `getShapeAtPoint` [#3416](https://github.com/tldraw/tldraw/pull/3416) ([@steveruizok](https://github.com/steveruizok))
- Input buffering [#3223](https://github.com/tldraw/tldraw/pull/3223) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- use native structuredClone on node, cloudflare workers, and in tests [#3166](https://github.com/tldraw/tldraw/pull/3166) ([@si14](https://github.com/si14))
- Fix lag while panning + translating at the same time [#3186](https://github.com/tldraw/tldraw/pull/3186) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- fixup file helpers [#3130](https://github.com/tldraw/tldraw/pull/3130) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- Add two simple perf helpers. [#3399](https://github.com/tldraw/tldraw/pull/3399) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fixes

- chore: cleanup multiple uses of FileReader [#3110](https://github.com/tldraw/tldraw/pull/3110) ([@mimecuvalo](https://github.com/mimecuvalo))
- Wrap local/session storage calls in try/catch (take 2) [#3066](https://github.com/tldraw/tldraw/pull/3066) ([@SomeHats](https://github.com/SomeHats))
- Revert "Protect local storage calls (#3043)" [#3063](https://github.com/tldraw/tldraw/pull/3063) ([@SomeHats](https://github.com/SomeHats))
- Protect local storage calls [#3043](https://github.com/tldraw/tldraw/pull/3043) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 6

- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.5 (Thu Feb 29 2024)

### Release Notes

#### fix structured clone reference in drawing ([#2945](https://github.com/tldraw/tldraw/pull/2945))

- Fixes a reference to structuredClone that caused a crash on older browsers.

---

#### 🐛 Bug Fix

- fix structured clone reference in drawing [#2945](https://github.com/tldraw/tldraw/pull/2945) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- bump typescript / api-extractor [#2949](https://github.com/tldraw/tldraw/pull/2949) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.4 (Wed Feb 21 2024)

#### 🐛 Bug Fix

- [Snapping 1/5] Validation & strict types for fractional indexes [#2827](https://github.com/tldraw/tldraw/pull/2827) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- dev: swap yarn test and test-dev for better dx [#2773](https://github.com/tldraw/tldraw/pull/2773) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))

---

# v2.0.0-beta.3 (Tue Feb 13 2024)

### Release Notes

#### Split snap manager into ShapeBoundsSnaps and HandleSnaps ([#2747](https://github.com/tldraw/tldraw/pull/2747))

- `SnapLine`s are now called `SnapIndicator`s
- Snapping methods moved from `editor.snaps` to `editor.snaps.shapeBounds` and `editor.snaps.handles` depending on the type of snapping you're trying to do.

#### dev: add test-dev command for easier testing of packages ([#2627](https://github.com/tldraw/tldraw/pull/2627))

- Adds easier testing command for individual packages.

---

#### 💥 Breaking Change

- Split snap manager into ShapeBoundsSnaps and HandleSnaps [#2747](https://github.com/tldraw/tldraw/pull/2747) ([@SomeHats](https://github.com/SomeHats))
- faster image processing in default asset handler [#2441](https://github.com/tldraw/tldraw/pull/2441) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- [dx] use Biome instead of Prettier, part 2 [#2731](https://github.com/tldraw/tldraw/pull/2731) ([@si14](https://github.com/si14))

#### 🏠 Internal

- Unbiome [#2776](https://github.com/tldraw/tldraw/pull/2776) ([@si14](https://github.com/si14))
- dev: add test-dev command for easier testing of packages [#2627](https://github.com/tldraw/tldraw/pull/2627) ([@mimecuvalo](https://github.com/mimecuvalo))

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

### Release Notes

#### Add url validation ([#2428](https://github.com/tldraw/tldraw/pull/2428))

- Add validation to urls.

#### Fix trademark links ([#2380](https://github.com/tldraw/tldraw/pull/2380))

- Fixes broken links in a number of docs files.

---

#### 🐛 Bug Fix

- Add url validation [#2428](https://github.com/tldraw/tldraw/pull/2428) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))

#### 📝 Documentation

- Fix trademark links [#2380](https://github.com/tldraw/tldraw/pull/2380) ([@nonparibus](https://github.com/nonparibus))
- Another typo fix. [#2366](https://github.com/tldraw/tldraw/pull/2366) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David @ HASH ([@nonparibus](https://github.com/nonparibus))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.1 (Wed Dec 20 2023)

#### 💥 Breaking Change

- bump to beta [#2364](https://github.com/tldraw/tldraw/pull/2364) ([@steveruizok](https://github.com/steveruizok))
- Change licenses to tldraw [#2167](https://github.com/tldraw/tldraw/pull/2167) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- fix png images with pixel ratios <0.5 crashing the app [#2350](https://github.com/tldraw/tldraw/pull/2350) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

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
