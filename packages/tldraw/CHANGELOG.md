# v2.1.0 (Tue Apr 23 2024)

### Release Notes

#### Make note handles show only one when zoomed out ([#3562](https://github.com/tldraw/tldraw/pull/3562))

- Show only the bottom handle on notes when zoomed between .25 and .5

#### Perf: minor drawing speedup ([#3464](https://github.com/tldraw/tldraw/pull/3464))

- Improve performance of draw shapes.

#### Prevent default on native clipboard events ([#3536](https://github.com/tldraw/tldraw/pull/3536))

- Fix copy sound on clipboard events.

#### WebGL Minimap ([#3510](https://github.com/tldraw/tldraw/pull/3510))

- Add a brief release note for your PR here.

#### arrows: fix bound arrow labels going over text shape ([#3512](https://github.com/tldraw/tldraw/pull/3512))

- Arrows: fix label positioning when bound.

#### arrows: still use Dist instead of Dist2 ([#3511](https://github.com/tldraw/tldraw/pull/3511))

- Fix arrow label positioning

#### Fix culling. ([#3504](https://github.com/tldraw/tldraw/pull/3504))

- Fix culling.

#### "Soft preload" icons ([#3507](https://github.com/tldraw/tldraw/pull/3507))

- Improve icon preloading

#### Fix alt-duplicating shapes sometimes not working ([#3488](https://github.com/tldraw/tldraw/pull/3488))

- Add a brief release note for your PR here.

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

#### Stickies: release candidate ([#3249](https://github.com/tldraw/tldraw/pull/3249))

- Improves sticky notes (see list)

#### Don't show edit link for locked shapes. ([#3457](https://github.com/tldraw/tldraw/pull/3457))

- Hide edit link context menu option for locked shapes.

#### Faster selection / erasing ([#3454](https://github.com/tldraw/tldraw/pull/3454))

- Improve performance of minimum distance checks.

#### Make minimap display sharp rectangles. ([#3434](https://github.com/tldraw/tldraw/pull/3434))

- Improve

#### Perf: throttle `updateHoveredId` ([#3419](https://github.com/tldraw/tldraw/pull/3419))

- Improves canvas performance by throttling the update to the editor's hovered id.

#### Perf: (slightly) faster min dist checks ([#3401](https://github.com/tldraw/tldraw/pull/3401))

- Performance: small improvements to hit testing.

#### Add long press event ([#3275](https://github.com/tldraw/tldraw/pull/3275))

- Add support for long pressing on desktop.

#### Fix text resizing bug ([#3327](https://github.com/tldraw/tldraw/pull/3327))

- Fixes an issue with text shapes overflowing their bounds when resized.

#### Input buffering ([#3223](https://github.com/tldraw/tldraw/pull/3223))

- Add a brief release note for your PR here.

#### Add white ([#3321](https://github.com/tldraw/tldraw/pull/3321))

- Adds secret white color.

#### Decrease the number of rendered dom nodes for geo shape and arrows ([#3283](https://github.com/tldraw/tldraw/pull/3283))

- Reduce the number of rendered dom nodes for geo shapes and arrows without text.

#### styling: make dotcom and examples site have consistent font styling ([#3271](https://github.com/tldraw/tldraw/pull/3271))

- Add a brief release note for your PR here.

#### ui: make toasts look more toasty ([#2988](https://github.com/tldraw/tldraw/pull/2988))

- UI: Add severity to toasts.

#### textfields [1 of 3]: add text into speech bubble; also add rich text example ([#3050](https://github.com/tldraw/tldraw/pull/3050))

- Refactor textfields be composable/swappable.

#### Allow hiding debug panel. ([#3261](https://github.com/tldraw/tldraw/pull/3261))

- Allow users to fully override the `DebugPanel`.

#### toolbar: fix missing title attributes ([#3244](https://github.com/tldraw/tldraw/pull/3244))

- Fix title's being missing on toolbar items.

#### Fix lag while panning + translating at the same time ([#3186](https://github.com/tldraw/tldraw/pull/3186))

- Add a brief release note for your PR here.

#### [fix] Batch tick events ([#3181](https://github.com/tldraw/tldraw/pull/3181))

- Fix a performance issue effecting resizing multiple shapes.

#### [tinyish] Simplify / skip some work in Shape ([#3176](https://github.com/tldraw/tldraw/pull/3176))

- SDK: minor improvements to the Shape component

#### Menu updates / fix flip / add export / remove Shape menu ([#3115](https://github.com/tldraw/tldraw/pull/3115))

- Revert some changes in the menu.

#### Performance improvements ([#2977](https://github.com/tldraw/tldraw/pull/2977))

- Improves the performance of rendering.

#### [fix] Rotated crop handle ([#3093](https://github.com/tldraw/tldraw/pull/3093))

- Fixed a bug that could cause rotated cropping images to have incorrectly rotated handles.

#### Fix validation errors for `duplicateProps` ([#3065](https://github.com/tldraw/tldraw/pull/3065))

- Add a brief release note for your PR here.

#### Fix an issue where the video size was not drawn correctly ([#3047](https://github.com/tldraw/tldraw/pull/3047))

- Fix an issue where the video size was not drawn correctly.

#### [fix] Input tags ([#3038](https://github.com/tldraw/tldraw/pull/3038))

- Fixed autocomplete, autocapitalize, and autocorrect tags on text inputs.

#### [terrible] Firefox: Allow scrolling on keyboard shortcuts dialog ([#2974](https://github.com/tldraw/tldraw/pull/2974))

- Add a brief release note for your PR here.

#### Protect local storage calls ([#3043](https://github.com/tldraw/tldraw/pull/3043))

- Fixes a bug that could cause crashes in React Native webviews.

#### [fix] Missing element crash (rare) on video shapes. ([#3037](https://github.com/tldraw/tldraw/pull/3037))

- Fixed a rare crash with video shapes.

#### Show a broken image for files without assets ([#2990](https://github.com/tldraw/tldraw/pull/2990))

- Better handling of broken images / videos.

---

#### 💥 Breaking Change

- React-powered SVG exports [#3117](https://github.com/tldraw/tldraw/pull/3117) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Component-based toolbar customisation API [#3067](https://github.com/tldraw/tldraw/pull/3067) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Menu updates / fix flip / add export / remove Shape menu [#3115](https://github.com/tldraw/tldraw/pull/3115) ([@steveruizok](https://github.com/steveruizok))
- Performance improvements [#2977](https://github.com/tldraw/tldraw/pull/2977) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- textfields [1 of 3]: add text into speech bubble; also add rich text example [#3050](https://github.com/tldraw/tldraw/pull/3050) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🐛 Bug Fix

- quick fixes [#3128](https://github.com/tldraw/tldraw/pull/3128) ([@steveruizok](https://github.com/steveruizok))

#### 📚 SDK Changes

- Fix collaborator size with zoom [#3563](https://github.com/tldraw/tldraw/pull/3563) ([@steveruizok](https://github.com/steveruizok))
- Make note handles show only one when zoomed out [#3562](https://github.com/tldraw/tldraw/pull/3562) ([@steveruizok](https://github.com/steveruizok))
- Fix transparent colors in the minimap [#3561](https://github.com/tldraw/tldraw/pull/3561) ([@steveruizok](https://github.com/steveruizok))
- Expose `usePreloadAssets` [#3545](https://github.com/tldraw/tldraw/pull/3545) ([@SomeHats](https://github.com/SomeHats))
- Perf: minor drawing speedup [#3464](https://github.com/tldraw/tldraw/pull/3464) ([@steveruizok](https://github.com/steveruizok))
- Prevent default on native clipboard events [#3536](https://github.com/tldraw/tldraw/pull/3536) ([@steveruizok](https://github.com/steveruizok))
- WebGL Minimap [#3510](https://github.com/tldraw/tldraw/pull/3510) ([@ds300](https://github.com/ds300))
- Improve back to content [#3532](https://github.com/tldraw/tldraw/pull/3532) ([@steveruizok](https://github.com/steveruizok))
- [fix] allow loading files [#3517](https://github.com/tldraw/tldraw/pull/3517) ([@ds300](https://github.com/ds300))
- arrows: fix bound arrow labels going over text shape [#3512](https://github.com/tldraw/tldraw/pull/3512) ([@mimecuvalo](https://github.com/mimecuvalo))
- textfields: fix Safari cursor rendering bug, take 2 [#3513](https://github.com/tldraw/tldraw/pull/3513) ([@mimecuvalo](https://github.com/mimecuvalo))
- geo: fix double unique id on DOM [#3514](https://github.com/tldraw/tldraw/pull/3514) ([@mimecuvalo](https://github.com/mimecuvalo))
- arrows: still use Dist instead of Dist2 [#3511](https://github.com/tldraw/tldraw/pull/3511) ([@mimecuvalo](https://github.com/mimecuvalo))
- textfields: nix disableTab option; make TextShapes have custom Tab behavior as intended [#3506](https://github.com/tldraw/tldraw/pull/3506) ([@mimecuvalo](https://github.com/mimecuvalo))
- "Soft preload" icons [#3507](https://github.com/tldraw/tldraw/pull/3507) ([@steveruizok](https://github.com/steveruizok))
- textfields: on mobile edit->edit, allow going to empty geo [#3469](https://github.com/tldraw/tldraw/pull/3469) ([@mimecuvalo](https://github.com/mimecuvalo))
- textfields: wait a tick before selecting all to fix iOS [#3501](https://github.com/tldraw/tldraw/pull/3501) ([@mimecuvalo](https://github.com/mimecuvalo))
- textfields: fix dragging selected shape behind another [#3498](https://github.com/tldraw/tldraw/pull/3498) ([@mimecuvalo](https://github.com/mimecuvalo))
- stickies: a bit of fuzziness when calculating certain text [#3493](https://github.com/tldraw/tldraw/pull/3493) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix alt-duplicating shapes sometimes not working [#3488](https://github.com/tldraw/tldraw/pull/3488) ([@TodePond](https://github.com/TodePond))
- stickies: dont remove selection ranges when edit->edit [#3484](https://github.com/tldraw/tldraw/pull/3484) ([@mimecuvalo](https://github.com/mimecuvalo))
- stickies: hide clone handles on mobile [#3478](https://github.com/tldraw/tldraw/pull/3478) ([@mimecuvalo](https://github.com/mimecuvalo))
- New migrations again [#3220](https://github.com/tldraw/tldraw/pull/3220) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Stickies: release candidate [#3249](https://github.com/tldraw/tldraw/pull/3249) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo) [@TodePond](https://github.com/TodePond) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Don't show edit link for locked shapes. [#3457](https://github.com/tldraw/tldraw/pull/3457) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Faster selection / erasing [#3454](https://github.com/tldraw/tldraw/pull/3454) ([@steveruizok](https://github.com/steveruizok))
- Performance measurement tool (for unit tests) [#3447](https://github.com/tldraw/tldraw/pull/3447) ([@steveruizok](https://github.com/steveruizok))
- Fix SVG exports in Next.js [#3446](https://github.com/tldraw/tldraw/pull/3446) ([@SomeHats](https://github.com/SomeHats))
- Remove minimap throttling [#3438](https://github.com/tldraw/tldraw/pull/3438) ([@steveruizok](https://github.com/steveruizok))
- Make minimap display sharp rectangles. [#3434](https://github.com/tldraw/tldraw/pull/3434) ([@steveruizok](https://github.com/steveruizok))
- Improve hand dragging with long press [#3432](https://github.com/tldraw/tldraw/pull/3432) ([@steveruizok](https://github.com/steveruizok))
- Perf: Incremental culled shapes calculation. [#3411](https://github.com/tldraw/tldraw/pull/3411) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Fix some tests [#3403](https://github.com/tldraw/tldraw/pull/3403) ([@steveruizok](https://github.com/steveruizok))
- Perf: throttle `updateHoveredId` [#3419](https://github.com/tldraw/tldraw/pull/3419) ([@steveruizok](https://github.com/steveruizok))
- Perf: (slightly) faster min dist checks [#3401](https://github.com/tldraw/tldraw/pull/3401) ([@steveruizok](https://github.com/steveruizok))
- Add long press event [#3275](https://github.com/tldraw/tldraw/pull/3275) ([@steveruizok](https://github.com/steveruizok))
- Fix blur bug in editable text [#3343](https://github.com/tldraw/tldraw/pull/3343) ([@steveruizok](https://github.com/steveruizok))
- textfields: fix regression with Text shape and resizing [#3333](https://github.com/tldraw/tldraw/pull/3333) ([@mimecuvalo](https://github.com/mimecuvalo))
- Revert "Fix text resizing bug (#3327)" [#3332](https://github.com/tldraw/tldraw/pull/3332) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix text resizing bug [#3327](https://github.com/tldraw/tldraw/pull/3327) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Input buffering [#3223](https://github.com/tldraw/tldraw/pull/3223) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Add white [#3321](https://github.com/tldraw/tldraw/pull/3321) ([@steveruizok](https://github.com/steveruizok))
- Fix count shapes and nodes [#3318](https://github.com/tldraw/tldraw/pull/3318) ([@steveruizok](https://github.com/steveruizok))
- Decrease the number of rendered dom nodes for geo shape and arrows [#3283](https://github.com/tldraw/tldraw/pull/3283) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- styling: make dotcom and examples site have consistent font styling [#3271](https://github.com/tldraw/tldraw/pull/3271) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Allow hiding debug panel. [#3261](https://github.com/tldraw/tldraw/pull/3261) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- toolbar: fix missing title attributes [#3244](https://github.com/tldraw/tldraw/pull/3244) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Add image annotator example [#3147](https://github.com/tldraw/tldraw/pull/3147) ([@SomeHats](https://github.com/SomeHats))
- use native structuredClone on node, cloudflare workers, and in tests [#3166](https://github.com/tldraw/tldraw/pull/3166) ([@si14](https://github.com/si14))
- Fix lag while panning + translating at the same time [#3186](https://github.com/tldraw/tldraw/pull/3186) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Fix jpg export and tests [#3198](https://github.com/tldraw/tldraw/pull/3198) ([@SomeHats](https://github.com/SomeHats))
- [fix] Batch tick events [#3181](https://github.com/tldraw/tldraw/pull/3181) ([@steveruizok](https://github.com/steveruizok))
- [tinyish] Simplify / skip some work in Shape [#3176](https://github.com/tldraw/tldraw/pull/3176) ([@steveruizok](https://github.com/steveruizok))
- [tiny] lift theme in style panel [#3170](https://github.com/tldraw/tldraw/pull/3170) ([@steveruizok](https://github.com/steveruizok))
- fixup file helpers [#3130](https://github.com/tldraw/tldraw/pull/3130) ([@SomeHats](https://github.com/SomeHats))

#### 📖 Documentation changes

- docs: fix missing API entries [#3111](https://github.com/tldraw/tldraw/pull/3111) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Fix culling. [#3504](https://github.com/tldraw/tldraw/pull/3504) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Revert "RBush again? (#3439)" [#3481](https://github.com/tldraw/tldraw/pull/3481) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- RBush again? [#3439](https://github.com/tldraw/tldraw/pull/3439) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [culling] Improve setting of display none. [#3376](https://github.com/tldraw/tldraw/pull/3376) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Display none for culled shapes [#3291](https://github.com/tldraw/tldraw/pull/3291) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Revert perf changes [#3217](https://github.com/tldraw/tldraw/pull/3217) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fixes

- ui: make toasts look more toasty [#2988](https://github.com/tldraw/tldraw/pull/2988) ([@mimecuvalo](https://github.com/mimecuvalo))
- chore: cleanup multiple uses of FileReader [#3110](https://github.com/tldraw/tldraw/pull/3110) ([@mimecuvalo](https://github.com/mimecuvalo))
- [fix] Rotated crop handle [#3093](https://github.com/tldraw/tldraw/pull/3093) ([@steveruizok](https://github.com/steveruizok))
- Fix validation errors for `duplicateProps` [#3065](https://github.com/tldraw/tldraw/pull/3065) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix an issue where the video size was not drawn correctly [#3047](https://github.com/tldraw/tldraw/pull/3047) ([@bubweiser](https://github.com/bubweiser) [@steveruizok](https://github.com/steveruizok))
- Wrap local/session storage calls in try/catch (take 2) [#3066](https://github.com/tldraw/tldraw/pull/3066) ([@SomeHats](https://github.com/SomeHats))
- Revert "Protect local storage calls (#3043)" [#3063](https://github.com/tldraw/tldraw/pull/3063) ([@SomeHats](https://github.com/SomeHats))
- children: any -> children: ReactNode [#3061](https://github.com/tldraw/tldraw/pull/3061) ([@SomeHats](https://github.com/SomeHats))
- [fix] Input tags [#3038](https://github.com/tldraw/tldraw/pull/3038) ([@steveruizok](https://github.com/steveruizok))
- [terrible] Firefox: Allow scrolling on keyboard shortcuts dialog [#2974](https://github.com/tldraw/tldraw/pull/2974) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Protect local storage calls [#3043](https://github.com/tldraw/tldraw/pull/3043) ([@steveruizok](https://github.com/steveruizok))
- [fix] Missing element crash (rare) on video shapes. [#3037](https://github.com/tldraw/tldraw/pull/3037) ([@steveruizok](https://github.com/steveruizok))
- Show a broken image for files without assets [#2990](https://github.com/tldraw/tldraw/pull/2990) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 10

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- hirano ([@bubweiser](https://github.com/bubweiser))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- updatereadmes ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.9 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- fix refresh-assets cache inputs ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.8 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- use glob to pick up version files? ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.7 (Thu Feb 29 2024)

### Release Notes

#### Fix publish script one more time ([#3010](https://github.com/tldraw/tldraw/pull/3010))

- Add a brief release note for your PR here.

---

#### 🏠 Internal

- Fix publish script one more time [#3010](https://github.com/tldraw/tldraw/pull/3010) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.6 (Thu Feb 29 2024)

### Release Notes

#### Fix publishing scripts ([#3008](https://github.com/tldraw/tldraw/pull/3008))

- Add a brief release note for your PR here.

---

#### 🏠 Internal

- Fix publishing scripts [#3008](https://github.com/tldraw/tldraw/pull/3008) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.5 (Thu Feb 29 2024)

### Release Notes

#### tldraw_final_v6_final(old version).docx.pdf ([#2998](https://github.com/tldraw/tldraw/pull/2998))

- The `@tldraw/tldraw` package has been renamed to `tldraw`. You can keep using the old version if you want though!

#### Adding a single E2E test per menu ([#2954](https://github.com/tldraw/tldraw/pull/2954))

- Add a brief release note for your PR here.

#### [feature] wrap mode ([#2938](https://github.com/tldraw/tldraw/pull/2938))

- Added `isWrapMode` to user preferences.
- Added Wrap Mode toggle to user preferences menu.

#### Make exportToBlob public ([#2983](https://github.com/tldraw/tldraw/pull/2983))

- Exposes the exportToBlob function for library users

#### export default ui items ([#2973](https://github.com/tldraw/tldraw/pull/2973))

- Components within default menu content components are now exported.

#### Show toast on upload error ([#2959](https://github.com/tldraw/tldraw/pull/2959))

- Adds a quick toast to show when image uploads fail.

#### Fix transparency toggle ([#2964](https://github.com/tldraw/tldraw/pull/2964))

- Fixes the Transparent toggle. The condition was accidentally flipped.

#### menu: rework File menu / ensure Export menu is present ([#2783](https://github.com/tldraw/tldraw/pull/2783))

- Composable UI: makes File items be more granularly accessible / usable
- Menu: show Export under the File menu.

#### ui events: prevent sending 2nd event unnecessarily ([#2921](https://github.com/tldraw/tldraw/pull/2921))

- Some cleanup on duplicate UI events being sent.

#### [fix] fit to content shown on groups ([#2946](https://github.com/tldraw/tldraw/pull/2946))

- Fix bug where "fit frame to content" would be shown when a group is selected.

#### fix structured clone reference in drawing ([#2945](https://github.com/tldraw/tldraw/pull/2945))

- Fixes a reference to structuredClone that caused a crash on older browsers.

#### Fix keyboard shortcuts bugs ([#2936](https://github.com/tldraw/tldraw/pull/2936))

- [Fix] Keyboard shortcut focus bug

#### Fix undo/redo for Opacity Slider + Style dropdowns. ([#2933](https://github.com/tldraw/tldraw/pull/2933))

- Fixed issues where undo/redo entries were not being set up correctly for the opacity slider or the style dropdown menus.

#### Add custom static assets example, extract preloadFont ([#2932](https://github.com/tldraw/tldraw/pull/2932))

- Docs, added custom static assets example.

#### Fix frames not preserving shape order ([#2928](https://github.com/tldraw/tldraw/pull/2928))

- Fix an issue when framing shapes did not preserve the original order of the shapes.
- You can now frame shapes inside of the frame.

#### Improve dialog appearance on small components ([#2884](https://github.com/tldraw/tldraw/pull/2884))

- Dev: Made default dialogs work better when used in small components.

---

#### 🚀 Enhancement

- [feature] wrap mode [#2938](https://github.com/tldraw/tldraw/pull/2938) ([@steveruizok](https://github.com/steveruizok))
- Make exportToBlob public [#2983](https://github.com/tldraw/tldraw/pull/2983) ([@ds300](https://github.com/ds300))
- export default ui items [#2973](https://github.com/tldraw/tldraw/pull/2973) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix keyboard shortcuts bugs [#2936](https://github.com/tldraw/tldraw/pull/2936) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- Add custom static assets example, extract preloadFont [#2932](https://github.com/tldraw/tldraw/pull/2932) ([@steveruizok](https://github.com/steveruizok))
- Export history hooks [#2926](https://github.com/tldraw/tldraw/pull/2926) ([@steveruizok](https://github.com/steveruizok))
- Improve dialog appearance on small components [#2884](https://github.com/tldraw/tldraw/pull/2884) ([@TodePond](https://github.com/TodePond))

#### 🐛 Bug Fix

- textfields: make them consistent [#2984](https://github.com/tldraw/tldraw/pull/2984) ([@mimecuvalo](https://github.com/mimecuvalo))
- Show toast on upload error [#2959](https://github.com/tldraw/tldraw/pull/2959) ([@ds300](https://github.com/ds300))
- menu: export followup with different semantics for file menu [#2968](https://github.com/tldraw/tldraw/pull/2968) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix transparency toggle [#2964](https://github.com/tldraw/tldraw/pull/2964) ([@ds300](https://github.com/ds300))
- Prevent iframe embedding for dotcom (except on tldraw.com) [#2947](https://github.com/tldraw/tldraw/pull/2947) ([@steveruizok](https://github.com/steveruizok))
- menu: rework File menu / ensure Export menu is present [#2783](https://github.com/tldraw/tldraw/pull/2783) ([@mimecuvalo](https://github.com/mimecuvalo))
- ui events: prevent sending 2nd event unnecessarily [#2921](https://github.com/tldraw/tldraw/pull/2921) ([@mimecuvalo](https://github.com/mimecuvalo))
- [fix] fit to content shown on groups [#2946](https://github.com/tldraw/tldraw/pull/2946) ([@steveruizok](https://github.com/steveruizok))
- Expand props [#2948](https://github.com/tldraw/tldraw/pull/2948) ([@steveruizok](https://github.com/steveruizok))
- fix structured clone reference in drawing [#2945](https://github.com/tldraw/tldraw/pull/2945) ([@steveruizok](https://github.com/steveruizok))
- Fix undo/redo for Opacity Slider + Style dropdowns. [#2933](https://github.com/tldraw/tldraw/pull/2933) ([@ds300](https://github.com/ds300))
- Fix frames not preserving shape order [#2928](https://github.com/tldraw/tldraw/pull/2928) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🏠 Internal

- tldraw_final_v6_final(old version).docx.pdf [#2998](https://github.com/tldraw/tldraw/pull/2998) ([@SomeHats](https://github.com/SomeHats))
- license: make them not be scrubbed out in code munging [#2976](https://github.com/tldraw/tldraw/pull/2976) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 📝 Documentation

- [docs] design shuffle [#2951](https://github.com/tldraw/tldraw/pull/2951) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- Adding a single E2E test per menu [#2954](https://github.com/tldraw/tldraw/pull/2954) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- bump typescript / api-extractor [#2949](https://github.com/tldraw/tldraw/pull/2949) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 7

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.4 (Wed Feb 21 2024)

### Release Notes

#### menu fixes: add company links in general; add tracking to lang menu ([#2902](https://github.com/tldraw/tldraw/pull/2902))

- Add company menu links back in and make sure the Language menu is updated on change.

#### Fix some menu issues on mobile ([#2906](https://github.com/tldraw/tldraw/pull/2906))

- Add a brief release note for your PR here.

#### [experiment] paste: show little puff when pasting to denote something happened ([#2787](https://github.com/tldraw/tldraw/pull/2787))

- UI: add a little 'puff' when something is pasted to tell that something has happened.

#### Fix custom keyboard shortcut dialog example ([#2876](https://github.com/tldraw/tldraw/pull/2876))

- Docs: Fixed custom keyboard shortcut dialog example.

#### Fix 'style panel doesn't always disappear if you switch to the hand/laser tools' ([#2886](https://github.com/tldraw/tldraw/pull/2886))

- Fixes an bug causing the opacity slider to show up in the move tool and laser pointer tool.

#### Faster validations + record reference stability at the same time ([#2848](https://github.com/tldraw/tldraw/pull/2848))

- Add a brief release note for your PR here.

#### [Snapping 6/6] Self-snapping API ([#2869](https://github.com/tldraw/tldraw/pull/2869))

- Line handles now snap to other handles on the same line when holding command

#### Fix dialog title styles ([#2873](https://github.com/tldraw/tldraw/pull/2873))

- Unreleased bug: Fixed dialog titles appearance.

#### Fix some incorrect translation keys ([#2870](https://github.com/tldraw/tldraw/pull/2870))

- Unreleased issue. Fixed some translation keys being wrong.

#### Allow users to set document name and use it for exporting / saving ([#2685](https://github.com/tldraw/tldraw/pull/2685))

- Allow users to name their documents.

#### [fix] grid, other insets ([#2858](https://github.com/tldraw/tldraw/pull/2858))

- Fixes a bug with the grid not appearing.

#### E2e tests for the toolbar ([#2709](https://github.com/tldraw/tldraw/pull/2709))

- Add e2e tests for the toolbar

#### fix frame style panel ([#2851](https://github.com/tldraw/tldraw/pull/2851))

- Fixes an issue with the opacity slider getting squished.

#### Add component for viewing an image of a snapshot ([#2804](https://github.com/tldraw/tldraw/pull/2804))

- Dev: Added the `TldrawImage` component.

#### ui: refactor breakpoints to fit in an enum ([#2843](https://github.com/tldraw/tldraw/pull/2843))

- Refactor breakpoints into an enum.

#### [Snapping 5/5] Better handle snapping for geo shapes ([#2845](https://github.com/tldraw/tldraw/pull/2845))

- You can now snap the handles of lines to the corners of rectangles, stars, triangles, etc.

#### [Snapping 4/5] Add handle-point snapping ([#2841](https://github.com/tldraw/tldraw/pull/2841))

- Line handles

#### [Snapping 3/5] Custom snapping API ([#2793](https://github.com/tldraw/tldraw/pull/2793))

- Add `ShapeUtil.getSnapInfo` for customising shape snaps.

#### [Snapping 2/5] Fix line-handle mid-point snapping ([#2831](https://github.com/tldraw/tldraw/pull/2831))

- Simplify the contents of `TLLineShape.props.handles`

#### emojis! 🧑‍🎨 🎨 ✏️ ([#2814](https://github.com/tldraw/tldraw/pull/2814))

- Adds emoji picker to text fields.

---

#### 💥 Breaking Change

- Add line IDs & fractional indexes [#2890](https://github.com/tldraw/tldraw/pull/2890) ([@SomeHats](https://github.com/SomeHats))
- Allow users to set document name and use it for exporting / saving [#2685](https://github.com/tldraw/tldraw/pull/2685) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- UI components round two [#2847](https://github.com/tldraw/tldraw/pull/2847) ([@steveruizok](https://github.com/steveruizok))
- [Snapping 2/5] Fix line-handle mid-point snapping [#2831](https://github.com/tldraw/tldraw/pull/2831) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- [Snapping 6/6] Self-snapping API [#2869](https://github.com/tldraw/tldraw/pull/2869) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- [handles] Line shape handles -> points [#2856](https://github.com/tldraw/tldraw/pull/2856) ([@steveruizok](https://github.com/steveruizok))
- Add component for viewing an image of a snapshot [#2804](https://github.com/tldraw/tldraw/pull/2804) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [Snapping 5/5] Better handle snapping for geo shapes [#2845](https://github.com/tldraw/tldraw/pull/2845) ([@SomeHats](https://github.com/SomeHats))
- [Snapping 4/5] Add handle-point snapping [#2841](https://github.com/tldraw/tldraw/pull/2841) ([@SomeHats](https://github.com/SomeHats))
- [Snapping 3/5] Custom snapping API [#2793](https://github.com/tldraw/tldraw/pull/2793) ([@SomeHats](https://github.com/SomeHats))
- Remove pointer check for arrow labels [#2824](https://github.com/tldraw/tldraw/pull/2824) ([@steveruizok](https://github.com/steveruizok))
- emojis! 🧑‍🎨 🎨 ✏️ [#2814](https://github.com/tldraw/tldraw/pull/2814) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🐛 Bug Fix

- menu fixes: add company links in general; add tracking to lang menu [#2902](https://github.com/tldraw/tldraw/pull/2902) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix some menu issues on mobile [#2906](https://github.com/tldraw/tldraw/pull/2906) ([@TodePond](https://github.com/TodePond))
- [experiment] paste: show little puff when pasting to denote something happened [#2787](https://github.com/tldraw/tldraw/pull/2787) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Fix 'style panel doesn't always disappear if you switch to the hand/laser tools' [#2886](https://github.com/tldraw/tldraw/pull/2886) ([@ds300](https://github.com/ds300))
- remove stray 'console' [#2881](https://github.com/tldraw/tldraw/pull/2881) ([@ds300](https://github.com/ds300))
- Faster validations + record reference stability at the same time [#2848](https://github.com/tldraw/tldraw/pull/2848) ([@ds300](https://github.com/ds300))
- Fix dialog title styles [#2873](https://github.com/tldraw/tldraw/pull/2873) ([@TodePond](https://github.com/TodePond))
- Fix some incorrect translation keys [#2870](https://github.com/tldraw/tldraw/pull/2870) ([@TodePond](https://github.com/TodePond))
- Roundup fixes [#2862](https://github.com/tldraw/tldraw/pull/2862) ([@steveruizok](https://github.com/steveruizok))
- [fix] grid, other insets [#2858](https://github.com/tldraw/tldraw/pull/2858) ([@steveruizok](https://github.com/steveruizok))
- fix frame style panel [#2851](https://github.com/tldraw/tldraw/pull/2851) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- ui: refactor breakpoints to fit in an enum [#2843](https://github.com/tldraw/tldraw/pull/2843) ([@mimecuvalo](https://github.com/mimecuvalo))
- [Snapping 1/5] Validation & strict types for fractional indexes [#2827](https://github.com/tldraw/tldraw/pull/2827) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- Check tsconfig "references" arrays [#2891](https://github.com/tldraw/tldraw/pull/2891) ([@ds300](https://github.com/ds300))
- Fix custom keyboard shortcut dialog example [#2876](https://github.com/tldraw/tldraw/pull/2876) ([@TodePond](https://github.com/TodePond))
- dev: swap yarn test and test-dev for better dx [#2773](https://github.com/tldraw/tldraw/pull/2773) ([@mimecuvalo](https://github.com/mimecuvalo))
- Revert "emojis! 🧑‍🎨 🎨 ✏️ (#2814)" [#2822](https://github.com/tldraw/tldraw/pull/2822) ([@si14](https://github.com/si14))

#### 🧪 Tests

- E2e tests for the toolbar [#2709](https://github.com/tldraw/tldraw/pull/2709) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### Authors: 8

- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.3 (Tue Feb 13 2024)

### Release Notes

#### Use canvas bounds for viewport bounds ([#2798](https://github.com/tldraw/tldraw/pull/2798))

- Changes the source of truth for the viewport page bounds to be the canvas instead.

#### Style UI based on component size instead of window size ([#2758](https://github.com/tldraw/tldraw/pull/2758))

- Dev: Fixed the default tldraw UI not matching the size of the component.

#### examples: clean up Canvas/Store events and make UiEvents have code snippets ([#2770](https://github.com/tldraw/tldraw/pull/2770))

- Examples: add an interactive example that shows code snippets for the SDK.

#### Fixed actions menu opening in wrong direction on mobile (and add an inline layout example) ([#2730](https://github.com/tldraw/tldraw/pull/2730))

- Dev: Fixed the actions menu opening in the wrong direction.

#### error reporting: rm ids from msgs for better Sentry grouping ([#2738](https://github.com/tldraw/tldraw/pull/2738))

- Error reporting: improve grouping for Sentry.

#### rearrange export / import from tldraw to help builds ([#2739](https://github.com/tldraw/tldraw/pull/2739))

- Build: Help with import/export error on some builds.

#### arrows: account for another NaN ([#2753](https://github.com/tldraw/tldraw/pull/2753))

- Fixes zero-width arrow NaN computation when moving the label.

#### Split snap manager into ShapeBoundsSnaps and HandleSnaps ([#2747](https://github.com/tldraw/tldraw/pull/2747))

- `SnapLine`s are now called `SnapIndicator`s
- Snapping methods moved from `editor.snaps` to `editor.snaps.shapeBounds` and `editor.snaps.handles` depending on the type of snapping you're trying to do.

#### arrows: update cursor only when in Select mode ([#2742](https://github.com/tldraw/tldraw/pull/2742))

- Cursor tweak for arrow labels.

#### [fix] VSCode keyboard shortcuts while editing text ([#2721](https://github.com/tldraw/tldraw/pull/2721))

- Fixed a bug in the VS Code that prevented keyboard shortcuts from working in text labels.

#### [Fix] Camera coordinate issues ([#2719](https://github.com/tldraw/tldraw/pull/2719))

- Fixed bugs with `getViewportScreenCenter` that could effect zooming and pinching on editors that aren't full screen

#### reactive context menu overrides ([#2697](https://github.com/tldraw/tldraw/pull/2697))

- Context Menu overrides will now update reactively

#### [Fix] Note shape border radius ([#2696](https://github.com/tldraw/tldraw/pull/2696))

- Fixes a bad border radius

#### arrows: separate out handle behavior from labels ([#2621](https://github.com/tldraw/tldraw/pull/2621))

- Arrow labels: provide more polish on label placement

#### Fix svg exporting for images with not fully qualified url (`/tldraw.png` or `./tldraw.png`) ([#2676](https://github.com/tldraw/tldraw/pull/2676))

- Fix the svg export for images that have a local url.

#### dev: add test-dev command for easier testing of packages ([#2627](https://github.com/tldraw/tldraw/pull/2627))

- Adds easier testing command for individual packages.

#### debug: start adding more tooling for debugging when interacting with shapes ([#2560](https://github.com/tldraw/tldraw/pull/2560))

- Adds more information in the debug view about what shape is selected and coordinates.

#### [Fix] Overlapping non-adjacent handles ([#2663](https://github.com/tldraw/tldraw/pull/2663))

- Fixed a bug with virtual / create handle visibility.

#### Improved duplication ([#2480](https://github.com/tldraw/tldraw/pull/2480))

- Add a brief release note for your PR here.

#### Positional keyboard shortcuts for toolbar ([#2409](https://github.com/tldraw/tldraw/pull/2409))

- You can now use the number keys to select the corresponding tool from the toolbar

#### [draft] Keep editor focus after losing focus of an action button ([#2630](https://github.com/tldraw/tldraw/pull/2630))

- Fixed a bug where keyboard shortcuts could stop working after using an action button.

#### Fix nudge bug ([#2634](https://github.com/tldraw/tldraw/pull/2634))

- Fixes a bug with keyboard nudging.

#### menus: address several little big things about menu styling ([#2624](https://github.com/tldraw/tldraw/pull/2624))

- Fixes nits on styling on our Radix menus.

#### style: fix missing titles on vertical align menu ([#2623](https://github.com/tldraw/tldraw/pull/2623))

- Adds missing titles to vertical align menu.

#### Only actions on selected shapes if we are in select tool. ([#2617](https://github.com/tldraw/tldraw/pull/2617))

- Disable actions that work on selections when we are not in select tool as it makes it not obvious what the target for these actions.

#### debug: add FPS counter ([#2558](https://github.com/tldraw/tldraw/pull/2558))

- Adds FPS counter to debug panel.

#### Fix ios export crash ([#2615](https://github.com/tldraw/tldraw/pull/2615))

- iOS Safari: Fixed a crash when exporting large images.

#### arrows: add ability to change label placement ([#2557](https://github.com/tldraw/tldraw/pull/2557))

- Adds ability to change label position on arrows.

#### [improvement] better comma control for pointer ([#2568](https://github.com/tldraw/tldraw/pull/2568))

- Improve comma key as a replacement for pointer down / pointer up.

#### Allow snapping of shapes to the frame when dragging inside the frame. ([#2520](https://github.com/tldraw/tldraw/pull/2520))

- Adds snapping to frames when dragging shapes inside a frame.

#### Allow dismissing dialogs by clicking backdrop ([#2497](https://github.com/tldraw/tldraw/pull/2497))

- Allows dismissing dialogs by clicking the backdrop.

#### Fix the first run of dev script. ([#2484](https://github.com/tldraw/tldraw/pull/2484))

- Fix first `yarn dev` experience.

#### Maintain bindings whilst translating arrows ([#2424](https://github.com/tldraw/tldraw/pull/2424))

- You can now move arrows without them becoming unattached the shapes they're pointing to

#### [improvement] update dark mode ([#2468](https://github.com/tldraw/tldraw/pull/2468))

- Updated dark mode colors.

#### [fix] disable vertical edge resizing for text on mobile ([#2456](https://github.com/tldraw/tldraw/pull/2456))

- Add a brief release note for your PR here.

#### Don't bother measuring canvas max size for small images ([#2442](https://github.com/tldraw/tldraw/pull/2442))

- Android: Sped up exporting and importing images.

#### [improvement] account for coarse pointers / insets in edge scrolling ([#2401](https://github.com/tldraw/tldraw/pull/2401))

- Add `instanceState.insets` to track which edges of the component are inset from the edges of the document body.
- Improve behavior around edge scrolling

---

#### 💥 Breaking Change

- Use canvas bounds for viewport bounds [#2798](https://github.com/tldraw/tldraw/pull/2798) ([@steveruizok](https://github.com/steveruizok))
- Remove Geometry2d.isSnappable [#2768](https://github.com/tldraw/tldraw/pull/2768) ([@SomeHats](https://github.com/SomeHats))
- Split snap manager into ShapeBoundsSnaps and HandleSnaps [#2747](https://github.com/tldraw/tldraw/pull/2747) ([@SomeHats](https://github.com/SomeHats))
- [Fix] Camera coordinate issues [#2719](https://github.com/tldraw/tldraw/pull/2719) ([@steveruizok](https://github.com/steveruizok))
- faster image processing in default asset handler [#2441](https://github.com/tldraw/tldraw/pull/2441) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- [dx] use Biome instead of Prettier, part 2 [#2731](https://github.com/tldraw/tldraw/pull/2731) ([@si14](https://github.com/si14))
- debug: start adding more tooling for debugging when interacting with shapes [#2560](https://github.com/tldraw/tldraw/pull/2560) ([@mimecuvalo](https://github.com/mimecuvalo))
- Improved duplication [#2480](https://github.com/tldraw/tldraw/pull/2480) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Positional keyboard shortcuts for toolbar [#2409](https://github.com/tldraw/tldraw/pull/2409) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- debug: add FPS counter [#2558](https://github.com/tldraw/tldraw/pull/2558) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- arrows: add ability to change label placement [#2557](https://github.com/tldraw/tldraw/pull/2557) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
- [improvement] better comma control for pointer [#2568](https://github.com/tldraw/tldraw/pull/2568) ([@steveruizok](https://github.com/steveruizok))
- Allow snapping of shapes to the frame when dragging inside the frame. [#2520](https://github.com/tldraw/tldraw/pull/2520) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Maintain bindings whilst translating arrows [#2424](https://github.com/tldraw/tldraw/pull/2424) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- [improvement] update dark mode [#2468](https://github.com/tldraw/tldraw/pull/2468) ([@steveruizok](https://github.com/steveruizok))
- [improvement] account for coarse pointers / insets in edge scrolling [#2401](https://github.com/tldraw/tldraw/pull/2401) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Style UI based on component size instead of window size [#2758](https://github.com/tldraw/tldraw/pull/2758) ([@TodePond](https://github.com/TodePond))
- Fixed actions menu opening in wrong direction on mobile (and add an inline layout example) [#2730](https://github.com/tldraw/tldraw/pull/2730) ([@TodePond](https://github.com/TodePond))
- error reporting: rm ids from msgs for better Sentry grouping [#2738](https://github.com/tldraw/tldraw/pull/2738) ([@mimecuvalo](https://github.com/mimecuvalo))
- rearrange export / import from tldraw to help builds [#2739](https://github.com/tldraw/tldraw/pull/2739) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix infinite cursor chat issue by partially reverting "reactive context menu overrides (#2697)" [#2775](https://github.com/tldraw/tldraw/pull/2775) ([@SomeHats](https://github.com/SomeHats))
- arrows: account for another NaN [#2753](https://github.com/tldraw/tldraw/pull/2753) ([@mimecuvalo](https://github.com/mimecuvalo))
- arrows: update cursor only when in Select mode [#2742](https://github.com/tldraw/tldraw/pull/2742) ([@mimecuvalo](https://github.com/mimecuvalo))
- [fix] VSCode keyboard shortcuts while editing text [#2721](https://github.com/tldraw/tldraw/pull/2721) ([@steveruizok](https://github.com/steveruizok))
- [fix] Debug panel text overflow [#2715](https://github.com/tldraw/tldraw/pull/2715) ([@steveruizok](https://github.com/steveruizok))
- reactive context menu overrides [#2697](https://github.com/tldraw/tldraw/pull/2697) ([@SomeHats](https://github.com/SomeHats))
- [Fix] Note shape border radius [#2696](https://github.com/tldraw/tldraw/pull/2696) ([@steveruizok](https://github.com/steveruizok))
- arrows: separate out handle behavior from labels [#2621](https://github.com/tldraw/tldraw/pull/2621) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Fix svg exporting for images with not fully qualified url (`/tldraw.png` or `./tldraw.png`) [#2676](https://github.com/tldraw/tldraw/pull/2676) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [Fix] Overlapping non-adjacent handles [#2663](https://github.com/tldraw/tldraw/pull/2663) ([@steveruizok](https://github.com/steveruizok))
- [draft] Keep editor focus after losing focus of an action button [#2630](https://github.com/tldraw/tldraw/pull/2630) ([@TodePond](https://github.com/TodePond))
- Fix nudge bug [#2634](https://github.com/tldraw/tldraw/pull/2634) ([@steveruizok](https://github.com/steveruizok))
- menus: address several little big things about menu styling [#2624](https://github.com/tldraw/tldraw/pull/2624) ([@mimecuvalo](https://github.com/mimecuvalo))
- style: fix missing titles on vertical align menu [#2623](https://github.com/tldraw/tldraw/pull/2623) ([@mimecuvalo](https://github.com/mimecuvalo))
- Only actions on selected shapes if we are in select tool. [#2617](https://github.com/tldraw/tldraw/pull/2617) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix ios export crash [#2615](https://github.com/tldraw/tldraw/pull/2615) ([@TodePond](https://github.com/TodePond))
- Allow dismissing dialogs by clicking backdrop [#2497](https://github.com/tldraw/tldraw/pull/2497) ([@ds300](https://github.com/ds300))
- Fix the first run of dev script. [#2484](https://github.com/tldraw/tldraw/pull/2484) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [tweak] dark mode colors [#2469](https://github.com/tldraw/tldraw/pull/2469) ([@steveruizok](https://github.com/steveruizok))
- [fix] disable vertical edge resizing for text on mobile [#2456](https://github.com/tldraw/tldraw/pull/2456) ([@mimecuvalo](https://github.com/mimecuvalo))
- Don't bother measuring canvas max size for small images [#2442](https://github.com/tldraw/tldraw/pull/2442) ([@TodePond](https://github.com/TodePond))
- Fix main. [#2439](https://github.com/tldraw/tldraw/pull/2439) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🏠 Internal

- examples: clean up Canvas/Store events and make UiEvents have code snippets [#2770](https://github.com/tldraw/tldraw/pull/2770) ([@mimecuvalo](https://github.com/mimecuvalo))
- Unbiome [#2776](https://github.com/tldraw/tldraw/pull/2776) ([@si14](https://github.com/si14))
- Update the project to Node 20 [#2691](https://github.com/tldraw/tldraw/pull/2691) ([@si14](https://github.com/si14))
- dev: add test-dev command for easier testing of packages [#2627](https://github.com/tldraw/tldraw/pull/2627) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add docs [#2470](https://github.com/tldraw/tldraw/pull/2470) ([@steveruizok](https://github.com/steveruizok))
- delete unused duplicated DraggingHandle.ts [#2463](https://github.com/tldraw/tldraw/pull/2463) ([@ds300](https://github.com/ds300))

#### 📝 Documentation

- Examples tweaks [#2681](https://github.com/tldraw/tldraw/pull/2681) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- Bump jest to fix weird prettier bug [#2716](https://github.com/tldraw/tldraw/pull/2716) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Bump Yarn to 4.0.2 and add version constraints [#2481](https://github.com/tldraw/tldraw/pull/2481) ([@si14](https://github.com/si14))

#### Authors: 8

- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.2 (Wed Jan 10 2024)

### Release Notes

#### refactor copy/export, fix safari copy-as-image being broken ([#2411](https://github.com/tldraw/tldraw/pull/2411))

- Fix a bug preventing copying as an image on iOS

#### Add url validation ([#2428](https://github.com/tldraw/tldraw/pull/2428))

- Add validation to urls.

#### [fix] edge scrolling when component is inside of screen ([#2398](https://github.com/tldraw/tldraw/pull/2398))

- Add a brief release note for your PR here.

#### [tech debt] Primitives renaming party / cleanup ([#2396](https://github.com/tldraw/tldraw/pull/2396))

- renames Vec2d to Vec
- renames Vec2dModel to VecModel
- renames Box2d to Box
- renames Box2dModel to BoxModel
- renames Matrix2d to Mat
- renames Matrix2dModel to MatModel
- removes unused primitive helpers

#### Fix trademark links ([#2380](https://github.com/tldraw/tldraw/pull/2380))

- Fixes broken links in a number of docs files.

#### [fix] polygon bounds ([#2378](https://github.com/tldraw/tldraw/pull/2378))

- Fixed a bug with the bounds calculation for polygons.

---

#### 💥 Breaking Change

- [tech debt] Primitives renaming party / cleanup [#2396](https://github.com/tldraw/tldraw/pull/2396) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- refactor copy/export, fix safari copy-as-image being broken [#2411](https://github.com/tldraw/tldraw/pull/2411) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Add url validation [#2428](https://github.com/tldraw/tldraw/pull/2428) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
- [fix] edge scrolling when component is inside of screen [#2398](https://github.com/tldraw/tldraw/pull/2398) ([@steveruizok](https://github.com/steveruizok))
- [fix] Asset versions [#2389](https://github.com/tldraw/tldraw/pull/2389) ([@steveruizok](https://github.com/steveruizok))
- [fix] polygon bounds [#2378](https://github.com/tldraw/tldraw/pull/2378) ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- [example] Changing the default tldraw colors [#2402](https://github.com/tldraw/tldraw/pull/2402) ([@steveruizok](https://github.com/steveruizok))
- add descriptions to examples [#2375](https://github.com/tldraw/tldraw/pull/2375) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Fix trademark links [#2380](https://github.com/tldraw/tldraw/pull/2380) ([@nonparibus](https://github.com/nonparibus))
- Another typo fix. [#2366](https://github.com/tldraw/tldraw/pull/2366) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 5

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David @ HASH ([@nonparibus](https://github.com/nonparibus))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.1 (Wed Dec 20 2023)

### Release Notes

#### Fix clicking off the context menu ([#2355](https://github.com/tldraw/tldraw/pull/2355))

- Fix not being able to close the context menu by clicking on the UI or your selected shape.

#### fix read only page menu ([#2356](https://github.com/tldraw/tldraw/pull/2356))

- Add a brief release note for your PR here.

#### focus on container before deleting to avoid losing focus ([#2354](https://github.com/tldraw/tldraw/pull/2354))

- Prevents losing focus when clicking the trash button

#### Use custom font ([#2343](https://github.com/tldraw/tldraw/pull/2343))

- Add a brief release note for your PR here.

#### Only allow side resizing when we have some shapes that are not aspect ratio locked ([#2347](https://github.com/tldraw/tldraw/pull/2347))

- Don't allow edges resizing on mobile. The only exception is a single text shape.

#### Fix iconleft padding ([#2345](https://github.com/tldraw/tldraw/pull/2345))

- Fixes the icon padding in back to content / pen mode buttons.

#### Allow dragging on top of locked shapes. ([#2337](https://github.com/tldraw/tldraw/pull/2337))

- Allow translating of shapes on top of a locked shape by clicking inside of selection and moving the mouse.

#### Prevent diff mutation ([#2336](https://github.com/tldraw/tldraw/pull/2336))

- Fix `squashRecordDiffs` to prevent a bug where it mutates the 'updated' entires

#### Fix indicator radius for bookmarks. ([#2335](https://github.com/tldraw/tldraw/pull/2335))

- Fix the indicator for the bookmark shape. The radius now matches the shape's radius.

#### Start scrolling if we are dragging close to the window edges. ([#2299](https://github.com/tldraw/tldraw/pull/2299))

- Adds the logic to change the camera position when you get close to the edges of the window. This allows you to drag, resize, brush select past the edges of the current viewport.

#### Fix downscaling ([#2325](https://github.com/tldraw/tldraw/pull/2325))

- Decrease the size of uploaded assets.

---

#### 💥 Breaking Change

- bump to beta [#2364](https://github.com/tldraw/tldraw/pull/2364) ([@steveruizok](https://github.com/steveruizok))
- Use custom font [#2343](https://github.com/tldraw/tldraw/pull/2343) ([@ds300](https://github.com/ds300) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Change licenses to tldraw [#2167](https://github.com/tldraw/tldraw/pull/2167) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- Start scrolling if we are dragging close to the window edges. [#2299](https://github.com/tldraw/tldraw/pull/2299) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix clicking off the context menu [#2355](https://github.com/tldraw/tldraw/pull/2355) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- fix read only page menu [#2356](https://github.com/tldraw/tldraw/pull/2356) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@TodePond](https://github.com/TodePond))
- focus on container before deleting to avoid losing focus [#2354](https://github.com/tldraw/tldraw/pull/2354) ([@ds300](https://github.com/ds300))
- Only allow side resizing when we have some shapes that are not aspect ratio locked [#2347](https://github.com/tldraw/tldraw/pull/2347) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Drop edge scrolling adjustment for mobile [#2346](https://github.com/tldraw/tldraw/pull/2346) ([@steveruizok](https://github.com/steveruizok))
- Fix iconleft padding [#2345](https://github.com/tldraw/tldraw/pull/2345) ([@steveruizok](https://github.com/steveruizok))
- Allow dragging on top of locked shapes. [#2337](https://github.com/tldraw/tldraw/pull/2337) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Prevent diff mutation [#2336](https://github.com/tldraw/tldraw/pull/2336) ([@ds300](https://github.com/ds300))
- Fix indicator radius for bookmarks. [#2335](https://github.com/tldraw/tldraw/pull/2335) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix downscaling [#2325](https://github.com/tldraw/tldraw/pull/2325) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### Authors: 6

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.19 (Tue Dec 12 2023)

### Release Notes

#### zoom to affected shapes after undo/redo ([#2293](https://github.com/tldraw/tldraw/pull/2293))

- Make sure affected shapes are visible after undo/redo

#### Add fit to content for frames. ([#2275](https://github.com/tldraw/tldraw/pull/2275))

- Add Fit to content option to the context menu for frames. This resizes the frames to correctly fit all their content.

#### fix new page naming ([#2292](https://github.com/tldraw/tldraw/pull/2292))

- Fix naming of pages created by the "move to page" action

#### Fix exporting of cropped images. ([#2268](https://github.com/tldraw/tldraw/pull/2268))

- Fix exporting of cropped images.

#### [improvements] arrows x enclosing shapes x precision. ([#2265](https://github.com/tldraw/tldraw/pull/2265))

- Improves the logic about when to draw "precise" arrows between the center of bound shapes.

#### fix vite HMR issue ([#2279](https://github.com/tldraw/tldraw/pull/2279))

- Fixes a bug that could cause crashes due to a re-render loop with HMR #1989

#### Removing frames and adding elements to frames ([#2219](https://github.com/tldraw/tldraw/pull/2219))

- Allow users to remove the frame, but keep it's children. Allow the users to add shapes to the frame directly when creating a frame.

#### Fix missing padding-right in toast ([#2251](https://github.com/tldraw/tldraw/pull/2251))

- Fox padding-right in toast content.

#### Also export `TLUiEventMap` ([#2234](https://github.com/tldraw/tldraw/pull/2234))

- Export `TLUiEventMap` type.

#### Fix the tool lock button. ([#2225](https://github.com/tldraw/tldraw/pull/2225))

- Adds the missing tool lock button.

#### Custom Tools DX + screenshot example ([#2198](https://github.com/tldraw/tldraw/pull/2198))

- adds ScreenshotTool custom tool example
- improvements and new exports related to copying and exporting images / files
- loosens up types around icons and translations
- moving `StateNode.isActive` into an atom
- adding `Editor.path`

#### StateNode atoms ([#2213](https://github.com/tldraw/tldraw/pull/2213))

- adds computed `StateNode.getPath`
- adds computed StateNode.getCurrent`
- adds computed StateNode.getIsActive`
- adds computed `Editor.getPath()`
- makes transition's second property optional

#### don't overwrite bookmark position if it changed before metadata arrives ([#2215](https://github.com/tldraw/tldraw/pull/2215))

- Fixes issue when creating new bookmark shape where the position would be reset if you moved it before the bookmark metadata was fetched.

#### [fix] huge images, use downscale for image scaling ([#2207](https://github.com/tldraw/tldraw/pull/2207))

- Improved image rescaling.

#### Fix an issue with not being able to group a shape an an arrow. ([#2205](https://github.com/tldraw/tldraw/pull/2205))

- Add a brief release note for your PR here.

#### feat: add new prop to force mobile mode layout ([#1734](https://github.com/tldraw/tldraw/pull/1734))

- add new prop to force mobile mode layout

---

#### 💥 Breaking Change

- No impure getters pt 1 [#2189](https://github.com/tldraw/tldraw/pull/2189) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- Add fit to content for frames. [#2275](https://github.com/tldraw/tldraw/pull/2275) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [improvements] arrows x enclosing shapes x precision. [#2265](https://github.com/tldraw/tldraw/pull/2265) ([@steveruizok](https://github.com/steveruizok))
- Removing frames and adding elements to frames [#2219](https://github.com/tldraw/tldraw/pull/2219) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Add `getSvgAsImage` to exports. [#2229](https://github.com/tldraw/tldraw/pull/2229) ([@steveruizok](https://github.com/steveruizok))
- Custom Tools DX + screenshot example [#2198](https://github.com/tldraw/tldraw/pull/2198) ([@steveruizok](https://github.com/steveruizok))
- StateNode atoms [#2213](https://github.com/tldraw/tldraw/pull/2213) ([@steveruizok](https://github.com/steveruizok))
- [fix] huge images, use downscale for image scaling [#2207](https://github.com/tldraw/tldraw/pull/2207) ([@steveruizok](https://github.com/steveruizok))
- feat: add new prop to force mobile mode layout [#1734](https://github.com/tldraw/tldraw/pull/1734) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Revert "zoom to affected shapes after undo/redo" [#2310](https://github.com/tldraw/tldraw/pull/2310) ([@ds300](https://github.com/ds300))
- zoom to affected shapes after undo/redo [#2293](https://github.com/tldraw/tldraw/pull/2293) ([@ds300](https://github.com/ds300))
- fix new page naming [#2292](https://github.com/tldraw/tldraw/pull/2292) ([@SomeHats](https://github.com/SomeHats))
- Fix exporting of cropped images. [#2268](https://github.com/tldraw/tldraw/pull/2268) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- fix vite HMR issue [#2279](https://github.com/tldraw/tldraw/pull/2279) ([@SomeHats](https://github.com/SomeHats))
- Hot elbows [#2258](https://github.com/tldraw/tldraw/pull/2258) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Fix missing padding-right in toast [#2251](https://github.com/tldraw/tldraw/pull/2251) ([@ByMykel](https://github.com/ByMykel) [@steveruizok](https://github.com/steveruizok))
- Also export `TLUiEventMap` [#2234](https://github.com/tldraw/tldraw/pull/2234) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- no impure getters pt 11 [#2236](https://github.com/tldraw/tldraw/pull/2236) ([@ds300](https://github.com/ds300))
- No impure getters pt10 [#2235](https://github.com/tldraw/tldraw/pull/2235) ([@ds300](https://github.com/ds300))
- Fix the tool lock button. [#2225](https://github.com/tldraw/tldraw/pull/2225) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- No impure getters pt9 [#2222](https://github.com/tldraw/tldraw/pull/2222) ([@ds300](https://github.com/ds300))
- No impure getters pt8 [#2221](https://github.com/tldraw/tldraw/pull/2221) ([@ds300](https://github.com/ds300))
- No impure getters pt7 [#2220](https://github.com/tldraw/tldraw/pull/2220) ([@ds300](https://github.com/ds300))
- No impure getters pt6 [#2218](https://github.com/tldraw/tldraw/pull/2218) ([@ds300](https://github.com/ds300))
- don't overwrite bookmark position if it changed before metadata arrives [#2215](https://github.com/tldraw/tldraw/pull/2215) ([@ds300](https://github.com/ds300))
- No impure getters pt5 [#2208](https://github.com/tldraw/tldraw/pull/2208) ([@ds300](https://github.com/ds300))
- Fix an issue with not being able to group a shape an an arrow. [#2205](https://github.com/tldraw/tldraw/pull/2205) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- No impure getters pt4 [#2206](https://github.com/tldraw/tldraw/pull/2206) ([@ds300](https://github.com/ds300))
- No impure getters pt3 [#2203](https://github.com/tldraw/tldraw/pull/2203) ([@ds300](https://github.com/ds300))
- No impure getters pt2 [#2202](https://github.com/tldraw/tldraw/pull/2202) ([@ds300](https://github.com/ds300))

#### 🧪 Tests

- fix export snapshot race condition [#2280](https://github.com/tldraw/tldraw/pull/2280) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 7

- [@ByMykel](https://github.com/ByMykel)
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.18 (Fri Nov 10 2023)

### Release Notes

#### Fix an error when using context menu. ([#2186](https://github.com/tldraw/tldraw/pull/2186))

- Fixes the console error when opening the context menu for the first time.

#### [fix] actions menu freezing ui ([#2187](https://github.com/tldraw/tldraw/pull/2187))

- Fix actions menu not closing when clicking the canvas after grouping items via the actions menu.

#### Fix an issue with edit link. ([#2184](https://github.com/tldraw/tldraw/pull/2184))

- Fixes an issue with using the Edit link dialog.

#### Only use the hack if we are in safari. ([#2185](https://github.com/tldraw/tldraw/pull/2185))

- Improve the speed of exporting to png for non Safari browsers.

#### Fix keyboard shortcuts for vscode. ([#2181](https://github.com/tldraw/tldraw/pull/2181))

- Fixes keyboard shortcuts for VS Code extension.

#### Fix printing. ([#2177](https://github.com/tldraw/tldraw/pull/2177))

- Fixes printing of shapes.

#### [fix] Frame label not following staying aligned correctly on rotation ([#2172](https://github.com/tldraw/tldraw/pull/2172))

- Frame labels immediately update their position on rotation.

#### Don't show scrollbars. ([#2171](https://github.com/tldraw/tldraw/pull/2171))

- Hide the horizontal scrollbar in the vertical alignment for Firefox.

#### instant bookmarks ([#2176](https://github.com/tldraw/tldraw/pull/2176))

- Improves ux around pasting bookmarks

#### Fix arrow dropdown localizations. ([#2174](https://github.com/tldraw/tldraw/pull/2174))

- Fix arrow headstyle dropdown translations.

#### Fix crash with zero length arrow ([#2173](https://github.com/tldraw/tldraw/pull/2173))

- Fix a hyper niche arrow crash with zero length arrows.

#### Allow users to select shapes when drag starts on top of a locked shape. ([#2169](https://github.com/tldraw/tldraw/pull/2169))

- Allows brush selecting when you start it on top of a locked shape.

#### Fix the problem with text not being correctly aligned in small geo shapes. ([#2168](https://github.com/tldraw/tldraw/pull/2168))

- Fixes position of Text labels in geo shapes.

#### Zooming improvement ([#2149](https://github.com/tldraw/tldraw/pull/2149))

- Improves zooming for inactive windows.

#### [feature] Things on the canvas ([#2150](https://github.com/tldraw/tldraw/pull/2150))

- [editor] Adds two new components, `OnTheCanvas` and `InFrontOfTheCanvas`.

#### Fix cleanupText ([#2138](https://github.com/tldraw/tldraw/pull/2138))

- Fixes a minor bug where cleaning up text would fail.

#### [android] Fix text labels and link button getting misaligned ([#2132](https://github.com/tldraw/tldraw/pull/2132))

- Fixed a bug where labels and links could lose alignment on android.

#### [feature] multi-scribbles ([#2125](https://github.com/tldraw/tldraw/pull/2125))

- [feature] multi scribbles

#### Tighten up editor ui ([#2102](https://github.com/tldraw/tldraw/pull/2102))

- Small adjustment to editor ui.

#### Remove indicator for autosize text shapes while editing ([#2120](https://github.com/tldraw/tldraw/pull/2120))

- Removed the indicator from autosize text shapes.

#### Taha/initial shape in handle change ([#2117](https://github.com/tldraw/tldraw/pull/2117))

- Add a brief release note for your PR here.

#### fix selection fg transform ([#2113](https://github.com/tldraw/tldraw/pull/2113))

- Fixes a small issue causing the selection foreground to be offset when the browser is at particular zoom levels.

#### Remove (optional) from jsdocs ([#2109](https://github.com/tldraw/tldraw/pull/2109))

- dev: Removed duplicate/inconsistent `(optional)`s from docs

#### [fix] mobile style panel switching open / closed ([#2101](https://github.com/tldraw/tldraw/pull/2101))

- Fix bug with style panel

---

#### 🚀 Enhancement

- instant bookmarks [#2176](https://github.com/tldraw/tldraw/pull/2176) ([@ds300](https://github.com/ds300))
- [feature] Things on the canvas [#2150](https://github.com/tldraw/tldraw/pull/2150) ([@steveruizok](https://github.com/steveruizok))
- [feature] multi-scribbles [#2125](https://github.com/tldraw/tldraw/pull/2125) ([@steveruizok](https://github.com/steveruizok))
- Tighten up editor ui [#2102](https://github.com/tldraw/tldraw/pull/2102) ([@steveruizok](https://github.com/steveruizok))
- Remove indicator for autosize text shapes while editing [#2120](https://github.com/tldraw/tldraw/pull/2120) ([@TodePond](https://github.com/TodePond))

#### 🐛 Bug Fix

- Add tldraw component exports [#2188](https://github.com/tldraw/tldraw/pull/2188) ([@steveruizok](https://github.com/steveruizok))
- Fix an error when using context menu. [#2186](https://github.com/tldraw/tldraw/pull/2186) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] actions menu freezing ui [#2187](https://github.com/tldraw/tldraw/pull/2187) ([@steveruizok](https://github.com/steveruizok))
- Fix an issue with edit link. [#2184](https://github.com/tldraw/tldraw/pull/2184) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Only use the hack if we are in safari. [#2185](https://github.com/tldraw/tldraw/pull/2185) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix keyboard shortcuts for vscode. [#2181](https://github.com/tldraw/tldraw/pull/2181) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix printing. [#2177](https://github.com/tldraw/tldraw/pull/2177) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] Frame label not following staying aligned correctly on rotation [#2172](https://github.com/tldraw/tldraw/pull/2172) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Don't show scrollbars. [#2171](https://github.com/tldraw/tldraw/pull/2171) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix arrow dropdown localizations. [#2174](https://github.com/tldraw/tldraw/pull/2174) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix crash with zero length arrow [#2173](https://github.com/tldraw/tldraw/pull/2173) ([@TodePond](https://github.com/TodePond))
- Allow users to select shapes when drag starts on top of a locked shape. [#2169](https://github.com/tldraw/tldraw/pull/2169) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix the problem with text not being correctly aligned in small geo shapes. [#2168](https://github.com/tldraw/tldraw/pull/2168) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Zooming improvement [#2149](https://github.com/tldraw/tldraw/pull/2149) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix cleanupText [#2138](https://github.com/tldraw/tldraw/pull/2138) ([@ds300](https://github.com/ds300))
- [android] Fix text labels and link button getting misaligned [#2132](https://github.com/tldraw/tldraw/pull/2132) ([@TodePond](https://github.com/TodePond))
- [fix] button gaps [#2130](https://github.com/tldraw/tldraw/pull/2130) ([@steveruizok](https://github.com/steveruizok))
- [fix] Move to page button / toasts styling [#2126](https://github.com/tldraw/tldraw/pull/2126) ([@steveruizok](https://github.com/steveruizok))
- [fix] css for editing page title [#2124](https://github.com/tldraw/tldraw/pull/2124) ([@steveruizok](https://github.com/steveruizok))
- fix selection fg transform [#2113](https://github.com/tldraw/tldraw/pull/2113) ([@ds300](https://github.com/ds300))
- [fix] mobile style panel switching open / closed [#2101](https://github.com/tldraw/tldraw/pull/2101) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Revert "bump prerelease from alpha to beta" [#2192](https://github.com/tldraw/tldraw/pull/2192) ([@ds300](https://github.com/ds300))
- bump prerelease from alpha to beta [#2148](https://github.com/tldraw/tldraw/pull/2148) ([@ds300](https://github.com/ds300))
- Taha/initial shape in handle change [#2117](https://github.com/tldraw/tldraw/pull/2117) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### 📝 Documentation

- Remove (optional) from jsdocs [#2109](https://github.com/tldraw/tldraw/pull/2109) ([@TodePond](https://github.com/TodePond))

#### Authors: 5

- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.17 (Tue Oct 17 2023)

### Release Notes

#### Firefox, Touch: Fix not being able to open style dropdowns ([#2092](https://github.com/tldraw/tldraw/pull/2092))

- Firefox Mobile: Fixed a bug where you couldn't open some style dropdown options.

#### Add timestamp to file names ([#2096](https://github.com/tldraw/tldraw/pull/2096))

- Add timestamp to exported image file names

#### [fix] Context menu + menus not closing correctly ([#2086](https://github.com/tldraw/tldraw/pull/2086))

- [fix] bug with menus

#### Fix not being able to upload massive images ([#2095](https://github.com/tldraw/tldraw/pull/2095))

- Fixed big images being too big to get added to the canvas.

#### fix cropped image size ([#2097](https://github.com/tldraw/tldraw/pull/2097))

- Fixes a rendering issue where cropped images were sometimes bleeding outside their bounds.

#### Add offline indicator (also to top zone example) ([#2083](https://github.com/tldraw/tldraw/pull/2083))

- [@tldraw/tldraw] add offline indicator to ui components

#### [fix] reparenting locked shapes ([#2070](https://github.com/tldraw/tldraw/pull/2070))

- Fix a bug where grouped locked shapes would be deleted when ungrouped.

#### [fix] Don't select locked shapes on pointer up ([#2069](https://github.com/tldraw/tldraw/pull/2069))

- Fix bug where locked shape could be selected by clicking on its label

#### [fix] locked shape of opacity problem with eraser.pointing ([#2073](https://github.com/tldraw/tldraw/pull/2073))

- locked shape of opacity problem with eraser.pointing
Before/after:
![A](https://github.com/tldraw/tldraw/assets/59823089/7483506c-72ac-45cc-93aa-f2a794ea8ff0) ![B](https://github.com/tldraw/tldraw/assets/59823089/ef0f988c-83f5-46a2-b891-0a391bca2f87)

---

#### 🚀 Enhancement

- Add offline indicator (also to top zone example) [#2083](https://github.com/tldraw/tldraw/pull/2083) ([@steveruizok](https://github.com/steveruizok))
- Add data breakpoint to layout css [#2076](https://github.com/tldraw/tldraw/pull/2076) ([@steveruizok](https://github.com/steveruizok))
- Same first page id for all editors [#2071](https://github.com/tldraw/tldraw/pull/2071) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Firefox, Touch: Fix not being able to open style dropdowns [#2092](https://github.com/tldraw/tldraw/pull/2092) ([@TodePond](https://github.com/TodePond))
- Add timestamp to file names [#2096](https://github.com/tldraw/tldraw/pull/2096) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- move imports [#2099](https://github.com/tldraw/tldraw/pull/2099) ([@SomeHats](https://github.com/SomeHats))
- [fix] Context menu + menus not closing correctly [#2086](https://github.com/tldraw/tldraw/pull/2086) ([@steveruizok](https://github.com/steveruizok))
- Fix not being able to upload massive images [#2095](https://github.com/tldraw/tldraw/pull/2095) ([@TodePond](https://github.com/TodePond))
- fix cropped image size [#2097](https://github.com/tldraw/tldraw/pull/2097) ([@ds300](https://github.com/ds300))
- Fixed a bug checking translated string keys [#2082](https://github.com/tldraw/tldraw/pull/2082) ([@kewell-tsao](https://github.com/kewell-tsao))
- [fix] reparenting locked shapes [#2070](https://github.com/tldraw/tldraw/pull/2070) ([@steveruizok](https://github.com/steveruizok))
- [fix] Don't select locked shapes on pointer up [#2069](https://github.com/tldraw/tldraw/pull/2069) ([@steveruizok](https://github.com/steveruizok))
- [fix] locked shape of opacity problem with eraser.pointing [#2073](https://github.com/tldraw/tldraw/pull/2073) ([@momenthana](https://github.com/momenthana))

#### Authors: 7

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Hana ([@momenthana](https://github.com/momenthana))
- Kewell ([@kewell-tsao](https://github.com/kewell-tsao))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.16 (Wed Oct 11 2023)

### Release Notes

#### [fix] Hit testing against zero width / height lines ([#2060](https://github.com/tldraw/tldraw/pull/2060))

- [fix] Bug where arrows would not bind to straight lines

#### Fix opacity lowering on shapes that cannot be deleted ([#2061](https://github.com/tldraw/tldraw/pull/2061))

- Locked shapes don't change opacity when scribble erasing.

Before/after:

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/763a93eb-ffaa-405c-9255-e68ba88ed9a2" />

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/dc9d3f77-c1c5-40f2-a9fe-10c723b6a21c" />

#### fix: proper label for opacity tooltip on hover ([#2044](https://github.com/tldraw/tldraw/pull/2044))

- Add a brief release note for your PR here.

#### Fix alt + shift keyboard shortcuts ([#2053](https://github.com/tldraw/tldraw/pull/2053))

- Fixes keyboard shortcuts that use `alt` and `shift` modifiers.

#### [improvement] Scope `getShapeAtPoint` to rendering shapes only ([#2043](https://github.com/tldraw/tldraw/pull/2043))

- Improve perf for hovering shapes / shape hit tests

#### Remove topBar prop from <TldrawUi /> ([#2018](https://github.com/tldraw/tldraw/pull/2018))

- [BREAKING] removed topBar prop

---

#### 🚀 Enhancement

- [improvement] Scope `getShapeAtPoint` to rendering shapes only [#2043](https://github.com/tldraw/tldraw/pull/2043) ([@steveruizok](https://github.com/steveruizok))
- Remove dot com ui styles [1/2] [#2039](https://github.com/tldraw/tldraw/pull/2039) ([@steveruizok](https://github.com/steveruizok))
- Remove topBar prop from <TldrawUi /> [#2018](https://github.com/tldraw/tldraw/pull/2018) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fix

- [fix] Hit testing against zero width / height lines [#2060](https://github.com/tldraw/tldraw/pull/2060) ([@steveruizok](https://github.com/steveruizok))
- Fix opacity lowering on shapes that cannot be deleted [#2061](https://github.com/tldraw/tldraw/pull/2061) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- fix: proper label for opacity tooltip on hover [#2044](https://github.com/tldraw/tldraw/pull/2044) ([@Prince-Mendiratta](https://github.com/Prince-Mendiratta))
- Fix newlines in text geo shapes [#2059](https://github.com/tldraw/tldraw/pull/2059) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok))
- Fix alt + shift keyboard shortcuts [#2053](https://github.com/tldraw/tldraw/pull/2053) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Restore background [#2037](https://github.com/tldraw/tldraw/pull/2037) ([@steveruizok](https://github.com/steveruizok))
- [fix] Stylepanel default spacing [#2036](https://github.com/tldraw/tldraw/pull/2036) ([@steveruizok](https://github.com/steveruizok))
- Export tools [#2035](https://github.com/tldraw/tldraw/pull/2035) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Publish api.json [#2034](https://github.com/tldraw/tldraw/pull/2034) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 6

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Prince Mendiratta ([@Prince-Mendiratta](https://github.com/Prince-Mendiratta))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.15 (Fri Oct 06 2023)

### Release Notes

#### frame label fix ([#2016](https://github.com/tldraw/tldraw/pull/2016))

- Add a brief release note for your PR here.

#### fix cloud rendering ([#2008](https://github.com/tldraw/tldraw/pull/2008))

- Improves cloud shape rendering

#### [improvement] prevent editing in readonly ([#1990](https://github.com/tldraw/tldraw/pull/1990))

- Prevent editing text shapes in readonly mode.

#### Fix style panel opening when disabled ([#1983](https://github.com/tldraw/tldraw/pull/1983))

- When select tool is active, the style menu shouldn't be openable unless a shape is also selected.

Before/After

<img width="300" src="https://github.com/tldraw/tldraw/assets/98838967/91ea55c8-0fcc-4f73-b61e-565829a5f25e" />
<img width="300" src="https://github.com/tldraw/tldraw/assets/98838967/ee4070fe-e236-4818-8fb4-43520210102b" />

#### Fix text-wrapping on Safari ([#1980](https://github.com/tldraw/tldraw/pull/1980))

- Fix text wrapping differently on Safari and Chrome/Firefox

Before/After

<image width="350" src="https://github.com/tldraw/tldraw/assets/98838967/320171b4-61e0-4a41-b8d3-830bd90bea65">
<image width="350" src="https://github.com/tldraw/tldraw/assets/98838967/b42d7156-0ce9-4894-9692-9338dc931b79">

#### Remove focus management ([#1953](https://github.com/tldraw/tldraw/pull/1953))

- [editor] Make autofocus default, remove automatic blur / focus events.

#### [fix] Drawing tool touch for first pen mark ([#1977](https://github.com/tldraw/tldraw/pull/1977))

- [fix] Accidental palm inputs when using iPad pencil

#### Remove targeted editing from text ([#1962](https://github.com/tldraw/tldraw/pull/1962))

- Fixed some cases where text would get selected in the wrong place.
- Changed the behaviour of text selection. Removed 'deep editing'.

#### fix line bugs ([#1936](https://github.com/tldraw/tldraw/pull/1936))

- This PR patches a couple of bugs which led to straight draw lines and beziered dash lines not rendering on the canvas

Before & After:

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/e0ca7d54-506f-4014-b65a-6b61a98e3665" />
<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/90c9fa12-1bcb-430d-80c7-97e1faacea16" />

#### Allow right clicking selection backgrounds ([#1968](https://github.com/tldraw/tldraw/pull/1968))

- Improved right click behaviour.

#### Mark an undo before toggling lock ([#1969](https://github.com/tldraw/tldraw/pull/1969))

- Mark an undo before toggling locked.

#### Stop editing frame headers when clicking inside a frame. ([#1955](https://github.com/tldraw/tldraw/pull/1955))

- Stop editing frame headers when clicking inside of a frame.

#### [feature] Include `sources` in `TLExternalContent` ([#1925](https://github.com/tldraw/tldraw/pull/1925))

- [editor / tldraw] add `sources` to `TLExternalContent`

#### [improvement] quick actions ([#1922](https://github.com/tldraw/tldraw/pull/1922))

- Improve the menu / kbds behavior when select tool is not active

#### Firefox: Fix dropdowns not opening with touch ([#1923](https://github.com/tldraw/tldraw/pull/1923))

- Firefox: Fixed dropdown menus not opening with touch.

#### Fix lines being draggable via their background ([#1920](https://github.com/tldraw/tldraw/pull/1920))

- None - unreleased bug

#### Fix first handle of line snapping to itself ([#1912](https://github.com/tldraw/tldraw/pull/1912))

- Fixed a bug where the first handle of a line shape could snap to itself.

#### [fix] Moving group items inside of a frame (dropping) ([#1886](https://github.com/tldraw/tldraw/pull/1886))

- Fix bug: ungroup when moving a shape in a group in a frame.

#### [fix] id properties of undefined (#1730) ([#1919](https://github.com/tldraw/tldraw/pull/1919))

- Fixed a bug similar #1730

#### :recycle: fix: editing is not terminated after the conversion is confirmed. ([#1885](https://github.com/tldraw/tldraw/pull/1885))

-  fix: editing is not terminated after the conversion is confirmed.

#### Fix selecting one shape from selection group ([#1905](https://github.com/tldraw/tldraw/pull/1905))

- Fix bug when selecting a single shape from a selection group

Before

https://github.com/tldraw/tldraw/assets/98838967/1412f9c6-d466-42b3-af94-d08cbc1656be

After
![Kapture 2023-09-18 at 14 15 10](https://github.com/tldraw/tldraw/assets/98838967/70a7336d-7905-4b4c-b684-d5d62f2383b3)

#### Fix highlighter dots not being clickable ([#1903](https://github.com/tldraw/tldraw/pull/1903))

- None - unreleased bug

#### Fix video shape controls ([#1909](https://github.com/tldraw/tldraw/pull/1909))

- Fixes pointer events for editing video shapes.

#### Fix line handles ([#1904](https://github.com/tldraw/tldraw/pull/1904))

- Fixes an issue where line handles were slightly offset from the indicator line.

#### Fix pinch start with toolbar open ([#1895](https://github.com/tldraw/tldraw/pull/1895))

- Fixes a bug that could trigger undo by accident when closing the style toolbar via a pinch gesture on mobile.

#### Migrate snapshot ([#1843](https://github.com/tldraw/tldraw/pull/1843))

- [editor] add `Store.migrateSnapshot`

#### [fix] zero width / height bounds ([#1840](https://github.com/tldraw/tldraw/pull/1840))

- Fix bug with straight lines / arrows

#### clamp x-box and check-box lines to stay within box at small scales ([#1860](https://github.com/tldraw/tldraw/pull/1860))

- Fixes a regression introduced by the geometry refactor related to x-box and checkbox resizing.

#### Fix paste transform ([#1859](https://github.com/tldraw/tldraw/pull/1859))

- Fixes a bug affecting the position of pasted content inside frames.

#### [feature] Asset props ([#1824](https://github.com/tldraw/tldraw/pull/1824))

- [@tldraw/tldraw] add asset props

#### [fix] editing video shapes ([#1821](https://github.com/tldraw/tldraw/pull/1821))

- Fix bug with editing video shapes.

#### [feature] unlock all action ([#1820](https://github.com/tldraw/tldraw/pull/1820))

- Adds the unlock all feature.

#### Fix text editing in page menu popover ([#1790](https://github.com/tldraw/tldraw/pull/1790))

- (fix) page menu editing

#### [fix] embeds switching / tldraw embed ([#1792](https://github.com/tldraw/tldraw/pull/1792))

- [fix] tldraw embeds

#### Custom rendering margin / don't cull selected shapes ([#1788](https://github.com/tldraw/tldraw/pull/1788))

- [editor] add `Editor.renderingBoundsMargin`

#### Camera APIs ([#1786](https://github.com/tldraw/tldraw/pull/1786))

- (editor) improve camera commands

#### environment manager ([#1784](https://github.com/tldraw/tldraw/pull/1784))

- [editor] Move environment flags to environment manager

#### Editor commands API / effects ([#1778](https://github.com/tldraw/tldraw/pull/1778))

- tbd

#### export `UiEventsProvider` ([#1774](https://github.com/tldraw/tldraw/pull/1774))

- [@tldraw/tldraw] export ui events, so that UI hooks can work without context

#### remove useForceSolid effect for geo / line shapes ([#1769](https://github.com/tldraw/tldraw/pull/1769))

- Remove the force solid switching for geo / line shapes

#### remove `selectionPageCenter` ([#1766](https://github.com/tldraw/tldraw/pull/1766))

- [dev] Removes `Editor.selectionPageCenter`

#### rename selection page bounds ([#1763](https://github.com/tldraw/tldraw/pull/1763))

- [editor] rename `selectedPageBounds` to `selectionPageBounds`

#### `ShapeUtil.getGeometry`, selection rewrite ([#1751](https://github.com/tldraw/tldraw/pull/1751))

- [editor] Remove `ShapeUtil.getBounds`, `ShapeUtil.getOutline`, `ShapeUtil.hitTestPoint`, `ShapeUtil.hitTestLineSegment`
- [editor] Add `ShapeUtil.getGeometry`
- [editor] Add `Editor.getShapeGeometry`

#### Fix asset urls ([#1758](https://github.com/tldraw/tldraw/pull/1758))

- Fixed asset urls

#### [fix] arrow snapping bug ([#1756](https://github.com/tldraw/tldraw/pull/1756))

- [fix] arrow snapping

#### [fix] dark mode ([#1754](https://github.com/tldraw/tldraw/pull/1754))

- [fix] dark mode colors not updating

#### Remove helpers / extraneous API methods. ([#1745](https://github.com/tldraw/tldraw/pull/1745))

- [tldraw] rename `useReadonly` to `useReadOnly`
- [editor] remove `Editor.isDarkMode`
- [editor] remove `Editor.isChangingStyle`
- [editor] remove `Editor.isCoarsePointer`
- [editor] remove `Editor.isDarkMode`
- [editor] remove `Editor.isFocused`
- [editor] remove `Editor.isGridMode`
- [editor] remove `Editor.isPenMode`
- [editor] remove `Editor.isReadOnly`
- [editor] remove `Editor.isSnapMode`
- [editor] remove `Editor.isToolLocked`
- [editor] remove `Editor.locale`
- [editor] rename `Editor.pageState` to `Editor.currentPageState`
- [editor] add `Editor.pageStates`
- [editor] add `Editor.setErasingIds`
- [editor] add `Editor.setEditingId`
- [editor] add several new component overrides

#### fix: escape eraser tool on escape ([#1732](https://github.com/tldraw/tldraw/pull/1732))

- escape eraser tool on escape

#### fix: arrow label dark mode color ([#1733](https://github.com/tldraw/tldraw/pull/1733))

- fixed arrow label dark mode color

#### tldraw zero - package shuffle ([#1710](https://github.com/tldraw/tldraw/pull/1710))

- [@tldraw/editor] lots, wip
- [@tldraw/ui] gone, merged to tldraw/tldraw
- [@tldraw/polyfills] gone, merged to tldraw/editor
- [@tldraw/primitives] gone, merged to tldraw/editor / tldraw/tldraw
- [@tldraw/indices] gone, merged to tldraw/editor
- [@tldraw/file-format] gone, merged to tldraw/tldraw

---

#### 💥 Breaking Change

- [improvement] prevent editing in readonly [#1990](https://github.com/tldraw/tldraw/pull/1990) ([@steveruizok](https://github.com/steveruizok))
- Remove focus management [#1953](https://github.com/tldraw/tldraw/pull/1953) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- Remove targeted editing from text [#1962](https://github.com/tldraw/tldraw/pull/1962) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Make user preferences optional [#1963](https://github.com/tldraw/tldraw/pull/1963) ([@ds300](https://github.com/ds300))
- [improvement] quick actions [#1922](https://github.com/tldraw/tldraw/pull/1922) ([@steveruizok](https://github.com/steveruizok))
- [fix] style changes [#1814](https://github.com/tldraw/tldraw/pull/1814) ([@steveruizok](https://github.com/steveruizok))
- Cleanup page state commands [#1800](https://github.com/tldraw/tldraw/pull/1800) ([@steveruizok](https://github.com/steveruizok))
- Rendering / cropping side-effects [#1799](https://github.com/tldraw/tldraw/pull/1799) ([@steveruizok](https://github.com/steveruizok))
- history options / markId / createPage [#1796](https://github.com/tldraw/tldraw/pull/1796) ([@steveruizok](https://github.com/steveruizok))
- Update setter names, `setXXShapeId` rather than `setXXId` [#1789](https://github.com/tldraw/tldraw/pull/1789) ([@steveruizok](https://github.com/steveruizok))
- Rename shapes apis [#1787](https://github.com/tldraw/tldraw/pull/1787) ([@steveruizok](https://github.com/steveruizok))
- Camera APIs [#1786](https://github.com/tldraw/tldraw/pull/1786) ([@steveruizok](https://github.com/steveruizok))
- environment manager [#1784](https://github.com/tldraw/tldraw/pull/1784) ([@steveruizok](https://github.com/steveruizok))
- Revert "Editor commands API / effects" [#1783](https://github.com/tldraw/tldraw/pull/1783) ([@steveruizok](https://github.com/steveruizok))
- Editor commands API / effects [#1778](https://github.com/tldraw/tldraw/pull/1778) ([@steveruizok](https://github.com/steveruizok))
- remove `selectionPageCenter` [#1766](https://github.com/tldraw/tldraw/pull/1766) ([@steveruizok](https://github.com/steveruizok))
- rename selection page bounds [#1763](https://github.com/tldraw/tldraw/pull/1763) ([@steveruizok](https://github.com/steveruizok))
- `ShapeUtil.getGeometry`, selection rewrite [#1751](https://github.com/tldraw/tldraw/pull/1751) ([@steveruizok](https://github.com/steveruizok))
- More cleanup, focus bug fixes [#1749](https://github.com/tldraw/tldraw/pull/1749) ([@steveruizok](https://github.com/steveruizok))
- move some utils into tldraw/utils [#1750](https://github.com/tldraw/tldraw/pull/1750) ([@steveruizok](https://github.com/steveruizok))
- Remove helpers / extraneous API methods. [#1745](https://github.com/tldraw/tldraw/pull/1745) ([@steveruizok](https://github.com/steveruizok))
- tldraw zero - package shuffle [#1710](https://github.com/tldraw/tldraw/pull/1710) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- Debugging cleanup / misc cleanup [#2025](https://github.com/tldraw/tldraw/pull/2025) ([@steveruizok](https://github.com/steveruizok))
- [feature] Include `sources` in `TLExternalContent` [#1925](https://github.com/tldraw/tldraw/pull/1925) ([@steveruizok](https://github.com/steveruizok))
- Fix arrow handle snapping, snapping to text labels, selection of text labels [#1910](https://github.com/tldraw/tldraw/pull/1910) ([@steveruizok](https://github.com/steveruizok))
- Migrate snapshot [#1843](https://github.com/tldraw/tldraw/pull/1843) ([@steveruizok](https://github.com/steveruizok))
- Add snapshot prop, examples [#1856](https://github.com/tldraw/tldraw/pull/1856) ([@steveruizok](https://github.com/steveruizok))
- export asset stuff [#1829](https://github.com/tldraw/tldraw/pull/1829) ([@steveruizok](https://github.com/steveruizok))
- [feature] Asset props [#1824](https://github.com/tldraw/tldraw/pull/1824) ([@steveruizok](https://github.com/steveruizok))
- [feature] unlock all action [#1820](https://github.com/tldraw/tldraw/pull/1820) ([@steveruizok](https://github.com/steveruizok))
- [improvement] More selection logic [#1806](https://github.com/tldraw/tldraw/pull/1806) ([@steveruizok](https://github.com/steveruizok))
- Add shapes to exports [#1776](https://github.com/tldraw/tldraw/pull/1776) ([@steveruizok](https://github.com/steveruizok))
- export `UiEventsProvider` [#1774](https://github.com/tldraw/tldraw/pull/1774) ([@steveruizok](https://github.com/steveruizok))
- [fix] arrow snapping bug [#1756](https://github.com/tldraw/tldraw/pull/1756) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Update readme [#2027](https://github.com/tldraw/tldraw/pull/2027) ([@steveruizok](https://github.com/steveruizok))
- frame label fix [#2016](https://github.com/tldraw/tldraw/pull/2016) ([@ds300](https://github.com/ds300))
- [fix] Focus events (actually) [#2015](https://github.com/tldraw/tldraw/pull/2015) ([@steveruizok](https://github.com/steveruizok))
- [fix] Minimap interactions [#2012](https://github.com/tldraw/tldraw/pull/2012) ([@steveruizok](https://github.com/steveruizok))
- Contain all the things [#1999](https://github.com/tldraw/tldraw/pull/1999) ([@steveruizok](https://github.com/steveruizok))
- [fix] Image size [#2002](https://github.com/tldraw/tldraw/pull/2002) ([@steveruizok](https://github.com/steveruizok))
- fix text in geo shapes not causing its container to grow [#2003](https://github.com/tldraw/tldraw/pull/2003) ([@SomeHats](https://github.com/SomeHats))
- [fix] tool lock button in toolbar [#2009](https://github.com/tldraw/tldraw/pull/2009) ([@steveruizok](https://github.com/steveruizok))
- Fix an issue with arrow creation. [#2004](https://github.com/tldraw/tldraw/pull/2004) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- fix cloud rendering [#2008](https://github.com/tldraw/tldraw/pull/2008) ([@ds300](https://github.com/ds300))
- Fix hooks error. [#2000](https://github.com/tldraw/tldraw/pull/2000) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix style panel opening when disabled [#1983](https://github.com/tldraw/tldraw/pull/1983) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Fix text-wrapping on Safari [#1980](https://github.com/tldraw/tldraw/pull/1980) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- [fix] text shape outline [#1974](https://github.com/tldraw/tldraw/pull/1974) ([@steveruizok](https://github.com/steveruizok))
- [fix] Drawing tool touch for first pen mark [#1977](https://github.com/tldraw/tldraw/pull/1977) ([@steveruizok](https://github.com/steveruizok))
- [fix] Screen bounds offset after editing text [#1976](https://github.com/tldraw/tldraw/pull/1976) ([@steveruizok](https://github.com/steveruizok))
- fix line bugs [#1936](https://github.com/tldraw/tldraw/pull/1936) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Allow right clicking selection backgrounds [#1968](https://github.com/tldraw/tldraw/pull/1968) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Mark an undo before toggling lock [#1969](https://github.com/tldraw/tldraw/pull/1969) ([@steveruizok](https://github.com/steveruizok))
- Stop editing frame headers when clicking inside a frame. [#1955](https://github.com/tldraw/tldraw/pull/1955) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@TodePond](https://github.com/TodePond))
- [fix] geo shape text label placement [#1927](https://github.com/tldraw/tldraw/pull/1927) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- expanded highlighter geometry [#1929](https://github.com/tldraw/tldraw/pull/1929) ([@SomeHats](https://github.com/SomeHats))
- Firefox: Fix dropdowns not opening with touch [#1923](https://github.com/tldraw/tldraw/pull/1923) ([@TodePond](https://github.com/TodePond))
- Fix lines being draggable via their background [#1920](https://github.com/tldraw/tldraw/pull/1920) ([@TodePond](https://github.com/TodePond))
- Fix first handle of line snapping to itself [#1912](https://github.com/tldraw/tldraw/pull/1912) ([@TodePond](https://github.com/TodePond))
- [fix] Moving group items inside of a frame (dropping) [#1886](https://github.com/tldraw/tldraw/pull/1886) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
- [fix] id properties of undefined (#1730) [#1919](https://github.com/tldraw/tldraw/pull/1919) ([@momenthana](https://github.com/momenthana))
- :recycle: fix: editing is not terminated after the conversion is confirmed. [#1885](https://github.com/tldraw/tldraw/pull/1885) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
- Fix selecting one shape from selection group [#1905](https://github.com/tldraw/tldraw/pull/1905) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- [fix] help menu css [#1888](https://github.com/tldraw/tldraw/pull/1888) ([@steveruizok](https://github.com/steveruizok))
- Fix highlighter dots not being clickable [#1903](https://github.com/tldraw/tldraw/pull/1903) ([@TodePond](https://github.com/TodePond))
- Fix video shape controls [#1909](https://github.com/tldraw/tldraw/pull/1909) ([@ds300](https://github.com/ds300))
- Fix line handles [#1904](https://github.com/tldraw/tldraw/pull/1904) ([@ds300](https://github.com/ds300))
- Fix pinch start with toolbar open [#1895](https://github.com/tldraw/tldraw/pull/1895) ([@ds300](https://github.com/ds300))
- [fix] iframe losing focus on pointer down [#1848](https://github.com/tldraw/tldraw/pull/1848) ([@steveruizok](https://github.com/steveruizok))
- [fix] zero width / height bounds [#1840](https://github.com/tldraw/tldraw/pull/1840) ([@steveruizok](https://github.com/steveruizok))
- clamp x-box and check-box lines to stay within box at small scales [#1860](https://github.com/tldraw/tldraw/pull/1860) ([@ds300](https://github.com/ds300))
- avoid pixel rounding / transformation miscalc for overlay items [#1858](https://github.com/tldraw/tldraw/pull/1858) ([@BrianHung](https://github.com/BrianHung) [@ds300](https://github.com/ds300))
- Fix paste transform [#1859](https://github.com/tldraw/tldraw/pull/1859) ([@ds300](https://github.com/ds300))
- [fix] exit penmode [#1847](https://github.com/tldraw/tldraw/pull/1847) ([@steveruizok](https://github.com/steveruizok))
- [fix] assets and content handlers [#1846](https://github.com/tldraw/tldraw/pull/1846) ([@steveruizok](https://github.com/steveruizok))
- [fix] line tool bug with tool locked [#1841](https://github.com/tldraw/tldraw/pull/1841) ([@steveruizok](https://github.com/steveruizok))
- [fix] arrows bind to locked shapes [#1833](https://github.com/tldraw/tldraw/pull/1833) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] text editing outline when scaled [#1826](https://github.com/tldraw/tldraw/pull/1826) ([@steveruizok](https://github.com/steveruizok))
- [fix] Line shape rendering [#1825](https://github.com/tldraw/tldraw/pull/1825) ([@steveruizok](https://github.com/steveruizok))
- [fix] remove CSS radius calculations [#1823](https://github.com/tldraw/tldraw/pull/1823) ([@steveruizok](https://github.com/steveruizok))
- [fix] editing video shapes [#1821](https://github.com/tldraw/tldraw/pull/1821) ([@steveruizok](https://github.com/steveruizok))
- [fix] Sticky text content / hovered shapes [#1808](https://github.com/tldraw/tldraw/pull/1808) ([@steveruizok](https://github.com/steveruizok))
- [fix] Collaborator scribble on tldraw [#1804](https://github.com/tldraw/tldraw/pull/1804) ([@steveruizok](https://github.com/steveruizok))
- [fix] page to screen [#1797](https://github.com/tldraw/tldraw/pull/1797) ([@steveruizok](https://github.com/steveruizok))
- [fix] Don't make arrows shapes to arrows [#1793](https://github.com/tldraw/tldraw/pull/1793) ([@steveruizok](https://github.com/steveruizok))
- Fix text editing in page menu popover [#1790](https://github.com/tldraw/tldraw/pull/1790) ([@steveruizok](https://github.com/steveruizok))
- [fix] embeds switching / tldraw embed [#1792](https://github.com/tldraw/tldraw/pull/1792) ([@steveruizok](https://github.com/steveruizok))
- Custom rendering margin / don't cull selected shapes [#1788](https://github.com/tldraw/tldraw/pull/1788) ([@steveruizok](https://github.com/steveruizok))
- Fix outlines on text shapes [#1781](https://github.com/tldraw/tldraw/pull/1781) ([@steveruizok](https://github.com/steveruizok))
- remove useForceSolid effect for geo / line shapes [#1769](https://github.com/tldraw/tldraw/pull/1769) ([@steveruizok](https://github.com/steveruizok))
- [fix] minimap, common page bounds [#1770](https://github.com/tldraw/tldraw/pull/1770) ([@steveruizok](https://github.com/steveruizok))
- [fix] arrow rendering safari [#1767](https://github.com/tldraw/tldraw/pull/1767) ([@steveruizok](https://github.com/steveruizok))
- [fix] restore bg option, fix calculations [#1765](https://github.com/tldraw/tldraw/pull/1765) ([@steveruizok](https://github.com/steveruizok))
- [fix] revert legacy changes to buildFromV1Document.ts [#1761](https://github.com/tldraw/tldraw/pull/1761) ([@steveruizok](https://github.com/steveruizok))
- Fix asset urls [#1758](https://github.com/tldraw/tldraw/pull/1758) ([@lakesare](https://github.com/lakesare))
- [fix] dark mode [#1754](https://github.com/tldraw/tldraw/pull/1754) ([@steveruizok](https://github.com/steveruizok))
- [fix]: Fix typo in shapeType declaration [#1747](https://github.com/tldraw/tldraw/pull/1747) ([@ricardo-crespo](https://github.com/ricardo-crespo) [@steveruizok](https://github.com/steveruizok))
- fix: escape eraser tool on escape [#1732](https://github.com/tldraw/tldraw/pull/1732) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))
- fix: arrow label dark mode color [#1733](https://github.com/tldraw/tldraw/pull/1733) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- [fix] CSS reload in dev [#1791](https://github.com/tldraw/tldraw/pull/1791) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- [fix] Right click groups [#1975](https://github.com/tldraw/tldraw/pull/1975) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))

#### Authors: 12

- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Evgenia Karunus ([@lakesare](https://github.com/lakesare))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Hana ([@momenthana](https://github.com/momenthana))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Ricardo Crespo ([@ricardo-crespo](https://github.com/ricardo-crespo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Takuto Mori Gump ([@mr04vv](https://github.com/mr04vv))

---

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
