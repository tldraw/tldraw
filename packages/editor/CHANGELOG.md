# v2.1.0 (Tue Apr 23 2024)

### Release Notes

#### WebGL Minimap ([#3510](https://github.com/tldraw/tldraw/pull/3510))

- Add a brief release note for your PR here.

#### Fix culling. ([#3504](https://github.com/tldraw/tldraw/pull/3504))

- Fix culling.

#### Color tweaks (light and dark mode) ([#3486](https://github.com/tldraw/tldraw/pull/3486))

- Adjusts colors

#### Add slides example ([#3467](https://github.com/tldraw/tldraw/pull/3467))

- Docs: Added a slideshow example

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

#### Cancel pointer velocity while pinching ([#3462](https://github.com/tldraw/tldraw/pull/3462))

- Fixed a bug that could occur while pinching with the hand tool selected.

#### Faster selection / erasing ([#3454](https://github.com/tldraw/tldraw/pull/3454))

- Improve performance of minimum distance checks.

#### Perf: Improve text outline performance ([#3429](https://github.com/tldraw/tldraw/pull/3429))

- Improves performance of text shapes on iOS / Safari.

#### Perf: block hit tests while moving camera ([#3418](https://github.com/tldraw/tldraw/pull/3418))

- Improves performance of canvas while the camera is moving.

#### Perf: (slightly) faster min dist checks ([#3401](https://github.com/tldraw/tldraw/pull/3401))

- Performance: small improvements to hit testing.

#### Add long press event ([#3275](https://github.com/tldraw/tldraw/pull/3275))

- Add support for long pressing on desktop.

#### Input buffering ([#3223](https://github.com/tldraw/tldraw/pull/3223))

- Add a brief release note for your PR here.

#### Don't trigger pointer move on zoom ([#3305](https://github.com/tldraw/tldraw/pull/3305))

- Improve performance of zooming.

#### Improve performance of culling ([#3272](https://github.com/tldraw/tldraw/pull/3272))

- Improve performance of the canvas when many shapes are present.

#### ui: make toasts look more toasty ([#2988](https://github.com/tldraw/tldraw/pull/2988))

- UI: Add severity to toasts.

#### textfields [1 of 3]: add text into speech bubble; also add rich text example ([#3050](https://github.com/tldraw/tldraw/pull/3050))

- Refactor textfields be composable/swappable.

#### Fix lag while panning + translating at the same time ([#3186](https://github.com/tldraw/tldraw/pull/3186))

- Add a brief release note for your PR here.

#### [fix] Batch tick events ([#3181](https://github.com/tldraw/tldraw/pull/3181))

- Fix a performance issue effecting resizing multiple shapes.

#### [tinyish] Simplify / skip some work in Shape ([#3176](https://github.com/tldraw/tldraw/pull/3176))

- SDK: minor improvements to the Shape component

#### [tiny] Slightly more efficient selection rotated page bounds / page bounds ([#3178](https://github.com/tldraw/tldraw/pull/3178))

- SDK, slightly more performant selection bounds calculations.

#### [fix] Handles extra renders ([#3172](https://github.com/tldraw/tldraw/pull/3172))

- SDK: Fixed a minor rendering issue related to handles.

#### [fix] Cleanup text measures ([#3169](https://github.com/tldraw/tldraw/pull/3169))

- Fixed a bug that could cause multiple text measurement divs in development mode.

#### [perf] Reinstate render throttling ([#3160](https://github.com/tldraw/tldraw/pull/3160))

- Add a brief release note for your PR here.

#### Fix validation errors for `duplicateProps` ([#3065](https://github.com/tldraw/tldraw/pull/3065))

- Add a brief release note for your PR here.

#### Protect local storage calls ([#3043](https://github.com/tldraw/tldraw/pull/3043))

- Fixes a bug that could cause crashes in React Native webviews.

#### Expose `getStyleForNextShape` ([#3039](https://github.com/tldraw/tldraw/pull/3039))

- Expose the API for `Editor.getStyleForNextShape`, previously marked as internal.

#### Show a broken image for files without assets ([#2990](https://github.com/tldraw/tldraw/pull/2990))

- Better handling of broken images / videos.

#### Selection UI example (plus fixes to pageToScreen) ([#3015](https://github.com/tldraw/tldraw/pull/3015))

- Adds selection UI example.
- Adds `Editor.getSelectionRotatedScreenBounds` method
- Fixes a bug with `pageToScreen`.

#### [bugfix] Avoid randomness at init time to allow running on cloudflare. ([#3016](https://github.com/tldraw/tldraw/pull/3016))

- Prevent using randomness API at init time, to allow importing the tldraw package in a cloudflare worker.

---

#### 💥 Breaking Change

- React-powered SVG exports [#3117](https://github.com/tldraw/tldraw/pull/3117) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Component-based toolbar customisation API [#3067](https://github.com/tldraw/tldraw/pull/3067) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- textfields [1 of 3]: add text into speech bubble; also add rich text example [#3050](https://github.com/tldraw/tldraw/pull/3050) ([@mimecuvalo](https://github.com/mimecuvalo))
- Selection UI example (plus fixes to pageToScreen) [#3015](https://github.com/tldraw/tldraw/pull/3015) ([@steveruizok](https://github.com/steveruizok))

#### 📚 SDK Changes

- WebGL Minimap [#3510](https://github.com/tldraw/tldraw/pull/3510) ([@ds300](https://github.com/ds300))
- textfields: on mobile edit->edit, allow going to empty geo [#3469](https://github.com/tldraw/tldraw/pull/3469) ([@mimecuvalo](https://github.com/mimecuvalo))
- Color tweaks (light and dark mode) [#3486](https://github.com/tldraw/tldraw/pull/3486) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Stickies: fix sticky note clipping [#3503](https://github.com/tldraw/tldraw/pull/3503) ([@steveruizok](https://github.com/steveruizok))
- css more shapes that need transparent behavior [#3497](https://github.com/tldraw/tldraw/pull/3497) ([@mimecuvalo](https://github.com/mimecuvalo))
- [fix] use page point for pointer [#3476](https://github.com/tldraw/tldraw/pull/3476) ([@ds300](https://github.com/ds300))
- perf: calculate hypoteneuse manually instead of using hypot [#3468](https://github.com/tldraw/tldraw/pull/3468) ([@mimecuvalo](https://github.com/mimecuvalo))
- New migrations again [#3220](https://github.com/tldraw/tldraw/pull/3220) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Stickies: release candidate [#3249](https://github.com/tldraw/tldraw/pull/3249) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo) [@TodePond](https://github.com/TodePond) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Cancel pointer velocity while pinching [#3462](https://github.com/tldraw/tldraw/pull/3462) ([@steveruizok](https://github.com/steveruizok))
- Perf: Use a computed cache for masked shape page bounds [#3460](https://github.com/tldraw/tldraw/pull/3460) ([@steveruizok](https://github.com/steveruizok))
- Faster selection / erasing [#3454](https://github.com/tldraw/tldraw/pull/3454) ([@steveruizok](https://github.com/steveruizok))
- Remove docs for Editor.batch [#3451](https://github.com/tldraw/tldraw/pull/3451) ([@steveruizok](https://github.com/steveruizok))
- Fix panning. [#3445](https://github.com/tldraw/tldraw/pull/3445) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix SVG exports in Next.js [#3446](https://github.com/tldraw/tldraw/pull/3446) ([@SomeHats](https://github.com/SomeHats))
- Improve hand dragging with long press [#3432](https://github.com/tldraw/tldraw/pull/3432) ([@steveruizok](https://github.com/steveruizok))
- Perf: Incremental culled shapes calculation. [#3411](https://github.com/tldraw/tldraw/pull/3411) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Perf: Improve text outline performance [#3429](https://github.com/tldraw/tldraw/pull/3429) ([@steveruizok](https://github.com/steveruizok))
- Fix some tests [#3403](https://github.com/tldraw/tldraw/pull/3403) ([@steveruizok](https://github.com/steveruizok))
- Fix text bug on iOS [#3423](https://github.com/tldraw/tldraw/pull/3423) ([@steveruizok](https://github.com/steveruizok))
- Perf: block hit tests while moving camera [#3418](https://github.com/tldraw/tldraw/pull/3418) ([@steveruizok](https://github.com/steveruizok))
- Perf: slightly faster `getShapeAtPoint` [#3416](https://github.com/tldraw/tldraw/pull/3416) ([@steveruizok](https://github.com/steveruizok))
- Perf: (slightly) faster min dist checks [#3401](https://github.com/tldraw/tldraw/pull/3401) ([@steveruizok](https://github.com/steveruizok))
- Fix an issue with layers when moving shapes. [#3380](https://github.com/tldraw/tldraw/pull/3380) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [culling] minimal culled diff with webgl [#3377](https://github.com/tldraw/tldraw/pull/3377) ([@steveruizok](https://github.com/steveruizok))
- put `getCurrentPageId` into a computed [#3378](https://github.com/tldraw/tldraw/pull/3378) ([@steveruizok](https://github.com/steveruizok))
- Add long press event [#3275](https://github.com/tldraw/tldraw/pull/3275) ([@steveruizok](https://github.com/steveruizok))
- Fix blur bug in editable text [#3343](https://github.com/tldraw/tldraw/pull/3343) ([@steveruizok](https://github.com/steveruizok))
- textfields: fix regression with Text shape and resizing [#3333](https://github.com/tldraw/tldraw/pull/3333) ([@mimecuvalo](https://github.com/mimecuvalo))
- Input buffering [#3223](https://github.com/tldraw/tldraw/pull/3223) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Don't trigger pointer move on zoom [#3305](https://github.com/tldraw/tldraw/pull/3305) ([@steveruizok](https://github.com/steveruizok))
- Improve performance of culling [#3272](https://github.com/tldraw/tldraw/pull/3272) ([@steveruizok](https://github.com/steveruizok))
- Add image annotator example [#3147](https://github.com/tldraw/tldraw/pull/3147) ([@SomeHats](https://github.com/SomeHats))
- use native structuredClone on node, cloudflare workers, and in tests [#3166](https://github.com/tldraw/tldraw/pull/3166) ([@si14](https://github.com/si14))
- Fix lag while panning + translating at the same time [#3186](https://github.com/tldraw/tldraw/pull/3186) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- [fix] Batch tick events [#3181](https://github.com/tldraw/tldraw/pull/3181) ([@steveruizok](https://github.com/steveruizok))
- Skip the random ID for regular history entries [#3183](https://github.com/tldraw/tldraw/pull/3183) ([@steveruizok](https://github.com/steveruizok))
- [tinyish] Simplify / skip some work in Shape [#3176](https://github.com/tldraw/tldraw/pull/3176) ([@steveruizok](https://github.com/steveruizok))
- [tiny] Slightly more efficient selection rotated page bounds / page bounds [#3178](https://github.com/tldraw/tldraw/pull/3178) ([@steveruizok](https://github.com/steveruizok))
- [fix] handles [#3177](https://github.com/tldraw/tldraw/pull/3177) ([@steveruizok](https://github.com/steveruizok))
- [fix] Handles extra renders [#3172](https://github.com/tldraw/tldraw/pull/3172) ([@steveruizok](https://github.com/steveruizok))
- [tiny] remove unused shape indicator equality checker [#3171](https://github.com/tldraw/tldraw/pull/3171) ([@steveruizok](https://github.com/steveruizok))
- [fix] Cleanup text measures [#3169](https://github.com/tldraw/tldraw/pull/3169) ([@steveruizok](https://github.com/steveruizok))
- [perf] Reinstate render throttling [#3160](https://github.com/tldraw/tldraw/pull/3160) ([@ds300](https://github.com/ds300))

#### 🖥️ tldraw.com Changes

- Enable document name [#3150](https://github.com/tldraw/tldraw/pull/3150) ([@ds300](https://github.com/ds300))

#### 📖 Documentation changes

- Add slides example [#3467](https://github.com/tldraw/tldraw/pull/3467) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@TodePond](https://github.com/TodePond))
- side effects reference docs & examples [#3258](https://github.com/tldraw/tldraw/pull/3258) ([@SomeHats](https://github.com/SomeHats))
- fix docs not building due to typo [#3259](https://github.com/tldraw/tldraw/pull/3259) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- Use computed cache for getting the parent child relationships [#3508](https://github.com/tldraw/tldraw/pull/3508) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix culling. [#3504](https://github.com/tldraw/tldraw/pull/3504) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Revert "RBush again? (#3439)" [#3481](https://github.com/tldraw/tldraw/pull/3481) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- RBush again? [#3439](https://github.com/tldraw/tldraw/pull/3439) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Perf: Improve perf of `getCurrentPageShapesSorted` [#3453](https://github.com/tldraw/tldraw/pull/3453) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Only run when shapes change. [#3456](https://github.com/tldraw/tldraw/pull/3456) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Reorder dom elements. [#3431](https://github.com/tldraw/tldraw/pull/3431) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [culling] Improve setting of display none. [#3376](https://github.com/tldraw/tldraw/pull/3376) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Display none for culled shapes [#3291](https://github.com/tldraw/tldraw/pull/3291) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- fix export preview size [#3264](https://github.com/tldraw/tldraw/pull/3264) ([@SomeHats](https://github.com/SomeHats))
- Revert perf changes [#3217](https://github.com/tldraw/tldraw/pull/3217) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- A few more async routes [#3023](https://github.com/tldraw/tldraw/pull/3023) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fixes

- ui: make toasts look more toasty [#2988](https://github.com/tldraw/tldraw/pull/2988) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix validation errors for `duplicateProps` [#3065](https://github.com/tldraw/tldraw/pull/3065) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Wrap local/session storage calls in try/catch (take 2) [#3066](https://github.com/tldraw/tldraw/pull/3066) ([@SomeHats](https://github.com/SomeHats))
- Revert "Protect local storage calls (#3043)" [#3063](https://github.com/tldraw/tldraw/pull/3063) ([@SomeHats](https://github.com/SomeHats))
- children: any -> children: ReactNode [#3061](https://github.com/tldraw/tldraw/pull/3061) ([@SomeHats](https://github.com/SomeHats))
- Protect local storage calls [#3043](https://github.com/tldraw/tldraw/pull/3043) ([@steveruizok](https://github.com/steveruizok))
- Expose `getStyleForNextShape` [#3039](https://github.com/tldraw/tldraw/pull/3039) ([@steveruizok](https://github.com/steveruizok))
- Show a broken image for files without assets [#2990](https://github.com/tldraw/tldraw/pull/2990) ([@steveruizok](https://github.com/steveruizok))
- [bugfix] Avoid randomness at init time to allow running on cloudflare. [#3016](https://github.com/tldraw/tldraw/pull/3016) ([@ds300](https://github.com/ds300))

#### 🧪 Tests

- Add tests for Vec.Average [#3071](https://github.com/tldraw/tldraw/pull/3071) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] Routes check on e2e tests [#3022](https://github.com/tldraw/tldraw/pull/3022) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 8

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
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

#### Don't add editor / app to window. ([#2995](https://github.com/tldraw/tldraw/pull/2995))

- Remove `window.editor` and `window.app` references to editor.

#### [feature] wrap mode ([#2938](https://github.com/tldraw/tldraw/pull/2938))

- Added `isWrapMode` to user preferences.
- Added Wrap Mode toggle to user preferences menu.

#### Don't allow edge scrolling when camera is frozen. ([#2992](https://github.com/tldraw/tldraw/pull/2992))

- Don't allow edge scrolling when camera is frozen.

#### Setup papercuts ([#2987](https://github.com/tldraw/tldraw/pull/2987))

- Add a brief release note for your PR here.

#### [fix] Corejs imports ([#2940](https://github.com/tldraw/tldraw/pull/2940))

- Fixes a bug effecting some users related to corejs imports.

#### Fix undo/redo for Opacity Slider + Style dropdowns. ([#2933](https://github.com/tldraw/tldraw/pull/2933))

- Fixed issues where undo/redo entries were not being set up correctly for the opacity slider or the style dropdown menus.

---

#### 💥 Breaking Change

- Don't add editor / app to window. [#2995](https://github.com/tldraw/tldraw/pull/2995) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- [feature] wrap mode [#2938](https://github.com/tldraw/tldraw/pull/2938) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Don't allow edge scrolling when camera is frozen. [#2992](https://github.com/tldraw/tldraw/pull/2992) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Setup papercuts [#2987](https://github.com/tldraw/tldraw/pull/2987) ([@ds300](https://github.com/ds300))
- migrate shapes / assets as a store on `putContent` [#2971](https://github.com/tldraw/tldraw/pull/2971) ([@steveruizok](https://github.com/steveruizok))
- [fix] double spinner [#2963](https://github.com/tldraw/tldraw/pull/2963) ([@steveruizok](https://github.com/steveruizok))
- Prevent iframe embedding for dotcom (except on tldraw.com) [#2947](https://github.com/tldraw/tldraw/pull/2947) ([@steveruizok](https://github.com/steveruizok))
- Expand props [#2948](https://github.com/tldraw/tldraw/pull/2948) ([@steveruizok](https://github.com/steveruizok))
- [fix] Corejs imports [#2940](https://github.com/tldraw/tldraw/pull/2940) ([@steveruizok](https://github.com/steveruizok))
- Fix undo/redo for Opacity Slider + Style dropdowns. [#2933](https://github.com/tldraw/tldraw/pull/2933) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- tldraw_final_v6_final(old version).docx.pdf [#2998](https://github.com/tldraw/tldraw/pull/2998) ([@SomeHats](https://github.com/SomeHats))

#### 🔩 Dependency Updates

- bump typescript / api-extractor [#2949](https://github.com/tldraw/tldraw/pull/2949) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.4 (Wed Feb 21 2024)

### Release Notes

#### [experiment] paste: show little puff when pasting to denote something happened ([#2787](https://github.com/tldraw/tldraw/pull/2787))

- UI: add a little 'puff' when something is pasted to tell that something has happened.

#### Fix 'style panel doesn't always disappear if you switch to the hand/laser tools' ([#2886](https://github.com/tldraw/tldraw/pull/2886))

- Fixes an bug causing the opacity slider to show up in the move tool and laser pointer tool.

#### Faster validations + record reference stability at the same time ([#2848](https://github.com/tldraw/tldraw/pull/2848))

- Add a brief release note for your PR here.

#### [Snapping 6/6] Self-snapping API ([#2869](https://github.com/tldraw/tldraw/pull/2869))

- Line handles now snap to other handles on the same line when holding command

#### Allow users to set document name and use it for exporting / saving ([#2685](https://github.com/tldraw/tldraw/pull/2685))

- Allow users to name their documents.

#### [fix] grid, other insets ([#2858](https://github.com/tldraw/tldraw/pull/2858))

- Fixes a bug with the grid not appearing.

#### Add component for viewing an image of a snapshot ([#2804](https://github.com/tldraw/tldraw/pull/2804))

- Dev: Added the `TldrawImage` component.

#### [Snapping 4/5] Add handle-point snapping ([#2841](https://github.com/tldraw/tldraw/pull/2841))

- Line handles

#### [Snapping 3/5] Custom snapping API ([#2793](https://github.com/tldraw/tldraw/pull/2793))

- Add `ShapeUtil.getSnapInfo` for customising shape snaps.

#### errors: improve msg in dialog when error happens ([#2844](https://github.com/tldraw/tldraw/pull/2844))

- Improves error dialog messaging.

#### [Snapping 2/5] Fix line-handle mid-point snapping ([#2831](https://github.com/tldraw/tldraw/pull/2831))

- Simplify the contents of `TLLineShape.props.handles`

#### emojis! 🧑‍🎨 🎨 ✏️ ([#2814](https://github.com/tldraw/tldraw/pull/2814))

- Adds emoji picker to text fields.

---

#### 💥 Breaking Change

- Allow users to set document name and use it for exporting / saving [#2685](https://github.com/tldraw/tldraw/pull/2685) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [Snapping 2/5] Fix line-handle mid-point snapping [#2831](https://github.com/tldraw/tldraw/pull/2831) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- [Snapping 6/6] Self-snapping API [#2869](https://github.com/tldraw/tldraw/pull/2869) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Add component for viewing an image of a snapshot [#2804](https://github.com/tldraw/tldraw/pull/2804) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [Snapping 4/5] Add handle-point snapping [#2841](https://github.com/tldraw/tldraw/pull/2841) ([@SomeHats](https://github.com/SomeHats))
- [Snapping 3/5] Custom snapping API [#2793](https://github.com/tldraw/tldraw/pull/2793) ([@SomeHats](https://github.com/SomeHats))
- Lokalise: Translations update [#2830](https://github.com/tldraw/tldraw/pull/2830) ([@TodePond](https://github.com/TodePond) [@MitjaBezensek](https://github.com/MitjaBezensek))
- emojis! 🧑‍🎨 🎨 ✏️ [#2814](https://github.com/tldraw/tldraw/pull/2814) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🐛 Bug Fix

- [experiment] paste: show little puff when pasting to denote something happened [#2787](https://github.com/tldraw/tldraw/pull/2787) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Fix 'style panel doesn't always disappear if you switch to the hand/laser tools' [#2886](https://github.com/tldraw/tldraw/pull/2886) ([@ds300](https://github.com/ds300))
- Faster validations + record reference stability at the same time [#2848](https://github.com/tldraw/tldraw/pull/2848) ([@ds300](https://github.com/ds300))
- Roundup fixes [#2862](https://github.com/tldraw/tldraw/pull/2862) ([@steveruizok](https://github.com/steveruizok))
- [fix] grid, other insets [#2858](https://github.com/tldraw/tldraw/pull/2858) ([@steveruizok](https://github.com/steveruizok))
- [fix] pointer capture logging when debug flag is off [#2850](https://github.com/tldraw/tldraw/pull/2850) ([@steveruizok](https://github.com/steveruizok))
- errors: improve msg in dialog when error happens [#2844](https://github.com/tldraw/tldraw/pull/2844) ([@mimecuvalo](https://github.com/mimecuvalo))
- seo: take 2 [#2817](https://github.com/tldraw/tldraw/pull/2817) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- [Snapping 1/5] Validation & strict types for fractional indexes [#2827](https://github.com/tldraw/tldraw/pull/2827) ([@SomeHats](https://github.com/SomeHats))
- [fix] sticky note bug [#2836](https://github.com/tldraw/tldraw/pull/2836) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Check tsconfig "references" arrays [#2891](https://github.com/tldraw/tldraw/pull/2891) ([@ds300](https://github.com/ds300))
- dev: swap yarn test and test-dev for better dx [#2773](https://github.com/tldraw/tldraw/pull/2773) ([@mimecuvalo](https://github.com/mimecuvalo))
- Revert "emojis! 🧑‍🎨 🎨 ✏️ (#2814)" [#2822](https://github.com/tldraw/tldraw/pull/2822) ([@si14](https://github.com/si14))

#### Authors: 7

- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.3 (Tue Feb 13 2024)

### Release Notes

#### Fix camera. ([#2818](https://github.com/tldraw/tldraw/pull/2818))

- Fixes an issue with the camera and zooming.

#### Use canvas bounds for viewport bounds ([#2798](https://github.com/tldraw/tldraw/pull/2798))

- Changes the source of truth for the viewport page bounds to be the canvas instead.

#### error reporting: rm ids from msgs for better Sentry grouping ([#2738](https://github.com/tldraw/tldraw/pull/2738))

- Error reporting: improve grouping for Sentry.

#### i18n: add HR 🇭🇷 ([#2778](https://github.com/tldraw/tldraw/pull/2778))

- i18n: add Croatian / Hrvatski.

#### arrows: account for another NaN ([#2753](https://github.com/tldraw/tldraw/pull/2753))

- Fixes zero-width arrow NaN computation when moving the label.

#### Split snap manager into ShapeBoundsSnaps and HandleSnaps ([#2747](https://github.com/tldraw/tldraw/pull/2747))

- `SnapLine`s are now called `SnapIndicator`s
- Snapping methods moved from `editor.snaps` to `editor.snaps.shapeBounds` and `editor.snaps.handles` depending on the type of snapping you're trying to do.

#### arrows: update cursor only when in Select mode ([#2742](https://github.com/tldraw/tldraw/pull/2742))

- Cursor tweak for arrow labels.

#### Fix pinch zooming ([#2748](https://github.com/tldraw/tldraw/pull/2748))

- None: Fixes an unreleased bug.

#### [Fix] Camera coordinate issues ([#2719](https://github.com/tldraw/tldraw/pull/2719))

- Fixed bugs with `getViewportScreenCenter` that could effect zooming and pinching on editors that aren't full screen

#### arrows: separate out handle behavior from labels ([#2621](https://github.com/tldraw/tldraw/pull/2621))

- Arrow labels: provide more polish on label placement

#### dev: add test-dev command for easier testing of packages ([#2627](https://github.com/tldraw/tldraw/pull/2627))

- Adds easier testing command for individual packages.

#### [Fix] Overlapping non-adjacent handles ([#2663](https://github.com/tldraw/tldraw/pull/2663))

- Fixed a bug with virtual / create handle visibility.

#### [Fix] Missing bend handles on curved arrows ([#2661](https://github.com/tldraw/tldraw/pull/2661))

- Fixed a bug where the bend handle on arrows with a large curve could sometimes be hidden.

#### [Fix] Wheel bug ([#2657](https://github.com/tldraw/tldraw/pull/2657))

- Fixed a bug with the mouse wheel effecting the pointer location when the editor was not full screen

#### Fix nudge bug ([#2634](https://github.com/tldraw/tldraw/pull/2634))

- Fixes a bug with keyboard nudging.

#### debug: add FPS counter ([#2558](https://github.com/tldraw/tldraw/pull/2558))

- Adds FPS counter to debug panel.

#### arrows: add ability to change label placement ([#2557](https://github.com/tldraw/tldraw/pull/2557))

- Adds ability to change label position on arrows.

#### Export TLCommandHistoryOptions type ([#2598](https://github.com/tldraw/tldraw/pull/2598))

- Added TLCommandHistoryOptions to the exported types.

#### [improvement] better comma control for pointer ([#2568](https://github.com/tldraw/tldraw/pull/2568))

- Improve comma key as a replacement for pointer down / pointer up.

#### Allow snapping of shapes to the frame when dragging inside the frame. ([#2520](https://github.com/tldraw/tldraw/pull/2520))

- Adds snapping to frames when dragging shapes inside a frame.

#### Prevent overlay content disappearing at some browser zoom levels ([#2483](https://github.com/tldraw/tldraw/pull/2483))

- removes the internal `useDprMultiple` hook

#### fix typo in hideRotateHandle method ([#2473](https://github.com/tldraw/tldraw/pull/2473))

- fix typo in hideRotateHandle method

#### Maintain bindings whilst translating arrows ([#2424](https://github.com/tldraw/tldraw/pull/2424))

- You can now move arrows without them becoming unattached the shapes they're pointing to

#### [improvement] update dark mode ([#2468](https://github.com/tldraw/tldraw/pull/2468))

- Updated dark mode colors.

#### [improvement] account for coarse pointers / insets in edge scrolling ([#2401](https://github.com/tldraw/tldraw/pull/2401))

- Add `instanceState.insets` to track which edges of the component are inset from the edges of the document body.
- Improve behavior around edge scrolling

---

#### 💥 Breaking Change

- Use canvas bounds for viewport bounds [#2798](https://github.com/tldraw/tldraw/pull/2798) ([@steveruizok](https://github.com/steveruizok))
- Remove Geometry2d.isSnappable [#2768](https://github.com/tldraw/tldraw/pull/2768) ([@SomeHats](https://github.com/SomeHats))
- Split snap manager into ShapeBoundsSnaps and HandleSnaps [#2747](https://github.com/tldraw/tldraw/pull/2747) ([@SomeHats](https://github.com/SomeHats))
- [Fix] Camera coordinate issues [#2719](https://github.com/tldraw/tldraw/pull/2719) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- [dx] use Biome instead of Prettier, part 2 [#2731](https://github.com/tldraw/tldraw/pull/2731) ([@si14](https://github.com/si14))
- debug: add FPS counter [#2558](https://github.com/tldraw/tldraw/pull/2558) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- arrows: add ability to change label placement [#2557](https://github.com/tldraw/tldraw/pull/2557) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
- [improvement] better comma control for pointer [#2568](https://github.com/tldraw/tldraw/pull/2568) ([@steveruizok](https://github.com/steveruizok))
- Allow snapping of shapes to the frame when dragging inside the frame. [#2520](https://github.com/tldraw/tldraw/pull/2520) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Maintain bindings whilst translating arrows [#2424](https://github.com/tldraw/tldraw/pull/2424) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- [improvement] update dark mode [#2468](https://github.com/tldraw/tldraw/pull/2468) ([@steveruizok](https://github.com/steveruizok))
- [improvement] account for coarse pointers / insets in edge scrolling [#2401](https://github.com/tldraw/tldraw/pull/2401) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix camera. [#2818](https://github.com/tldraw/tldraw/pull/2818) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] overlays, custom brush example [#2806](https://github.com/tldraw/tldraw/pull/2806) ([@steveruizok](https://github.com/steveruizok))
- error reporting: rm ids from msgs for better Sentry grouping [#2738](https://github.com/tldraw/tldraw/pull/2738) ([@mimecuvalo](https://github.com/mimecuvalo))
- i18n: add HR 🇭🇷 [#2778](https://github.com/tldraw/tldraw/pull/2778) ([@mimecuvalo](https://github.com/mimecuvalo))
- arrows: account for another NaN [#2753](https://github.com/tldraw/tldraw/pull/2753) ([@mimecuvalo](https://github.com/mimecuvalo))
- arrows: update cursor only when in Select mode [#2742](https://github.com/tldraw/tldraw/pull/2742) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix pinch zooming [#2748](https://github.com/tldraw/tldraw/pull/2748) ([@TodePond](https://github.com/TodePond))
- arrows: separate out handle behavior from labels [#2621](https://github.com/tldraw/tldraw/pull/2621) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- [Improvement] Text measurement tweaks [#2670](https://github.com/tldraw/tldraw/pull/2670) ([@steveruizok](https://github.com/steveruizok))
- [Fix] Overlapping non-adjacent handles [#2663](https://github.com/tldraw/tldraw/pull/2663) ([@steveruizok](https://github.com/steveruizok))
- [Fix] Missing bend handles on curved arrows [#2661](https://github.com/tldraw/tldraw/pull/2661) ([@steveruizok](https://github.com/steveruizok))
- [Fix] Wheel bug [#2657](https://github.com/tldraw/tldraw/pull/2657) ([@steveruizok](https://github.com/steveruizok))
- Fix nudge bug [#2634](https://github.com/tldraw/tldraw/pull/2634) ([@steveruizok](https://github.com/steveruizok))
- Export TLCommandHistoryOptions type [#2598](https://github.com/tldraw/tldraw/pull/2598) ([@steveruizok](https://github.com/steveruizok))
- Make sure correct dark mode colours get used in exports [#2492](https://github.com/tldraw/tldraw/pull/2492) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Prevent overlay content disappearing at some browser zoom levels [#2483](https://github.com/tldraw/tldraw/pull/2483) ([@ds300](https://github.com/ds300))
- [tweak] dark mode colors [#2469](https://github.com/tldraw/tldraw/pull/2469) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Unbiome [#2776](https://github.com/tldraw/tldraw/pull/2776) ([@si14](https://github.com/si14))
- Update the project to Node 20 [#2691](https://github.com/tldraw/tldraw/pull/2691) ([@si14](https://github.com/si14))
- dev: add test-dev command for easier testing of packages [#2627](https://github.com/tldraw/tldraw/pull/2627) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add docs [#2470](https://github.com/tldraw/tldraw/pull/2470) ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- fix typo in hideRotateHandle method [#2473](https://github.com/tldraw/tldraw/pull/2473) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### 🧪 Tests

- Bump jest to fix weird prettier bug [#2716](https://github.com/tldraw/tldraw/pull/2716) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Bump Yarn to 4.0.2 and add version constraints [#2481](https://github.com/tldraw/tldraw/pull/2481) ([@si14](https://github.com/si14))

#### Authors: 9

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
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

#### [fix] next selected shapes comment ([#2427](https://github.com/tldraw/tldraw/pull/2427))

- Fix error in setStyleForNextSelectedShapes comment

#### Fix issues with clip paths for frames ([#2406](https://github.com/tldraw/tldraw/pull/2406))

- Add a brief release note for your PR here.

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

- Fix issues with clip paths for frames [#2406](https://github.com/tldraw/tldraw/pull/2406) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] edge scrolling when component is inside of screen [#2398](https://github.com/tldraw/tldraw/pull/2398) ([@steveruizok](https://github.com/steveruizok))
- [fix] polygon bounds [#2378](https://github.com/tldraw/tldraw/pull/2378) ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- [fix] next selected shapes comment [#2427](https://github.com/tldraw/tldraw/pull/2427) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix trademark links [#2380](https://github.com/tldraw/tldraw/pull/2380) ([@nonparibus](https://github.com/nonparibus))
- Another typo fix. [#2366](https://github.com/tldraw/tldraw/pull/2366) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- David @ HASH ([@nonparibus](https://github.com/nonparibus))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.1 (Wed Dec 20 2023)

### Release Notes

#### Fix clicking off the context menu ([#2355](https://github.com/tldraw/tldraw/pull/2355))

- Fix not being able to close the context menu by clicking on the UI or your selected shape.

#### refactor: Keep hook function convention the same ([#2358](https://github.com/tldraw/tldraw/pull/2358))

- Add a brief release note for your PR here.

#### Stop shape text labels being hoverable when context menu is open ([#2352](https://github.com/tldraw/tldraw/pull/2352))

- Add a brief release note for your PR here.

#### [bug] Fix for issue #2329 ([#2330](https://github.com/tldraw/tldraw/pull/2330))

- Fix for `Matrix2d.Scale` function

#### Remove deprecated getters ([#2333](https://github.com/tldraw/tldraw/pull/2333))

- (Breaking) Removed deprecated getters.

#### Lokalise: Translations update ([#2342](https://github.com/tldraw/tldraw/pull/2342))

Added Czech translations.
Updated translations for German, Korean, Russian, Ukrainian, Traditional Chinese.

#### Start scrolling if we are dragging close to the window edges. ([#2299](https://github.com/tldraw/tldraw/pull/2299))

- Adds the logic to change the camera position when you get close to the edges of the window. This allows you to drag, resize, brush select past the edges of the current viewport.

---

#### 💥 Breaking Change

- bump to beta [#2364](https://github.com/tldraw/tldraw/pull/2364) ([@steveruizok](https://github.com/steveruizok))
- Change licenses to tldraw [#2167](https://github.com/tldraw/tldraw/pull/2167) ([@steveruizok](https://github.com/steveruizok))
- Remove deprecated getters [#2333](https://github.com/tldraw/tldraw/pull/2333) ([@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- Start scrolling if we are dragging close to the window edges. [#2299](https://github.com/tldraw/tldraw/pull/2299) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix clicking off the context menu [#2355](https://github.com/tldraw/tldraw/pull/2355) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Stop shape text labels being hoverable when context menu is open [#2352](https://github.com/tldraw/tldraw/pull/2352) ([@TodePond](https://github.com/TodePond))
- Drop edge scrolling adjustment for mobile [#2346](https://github.com/tldraw/tldraw/pull/2346) ([@steveruizok](https://github.com/steveruizok))
- [bug] Fix for issue #2329 [#2330](https://github.com/tldraw/tldraw/pull/2330) ([@zfedoran](https://github.com/zfedoran))
- Lokalise: Translations update [#2342](https://github.com/tldraw/tldraw/pull/2342) ([@TodePond](https://github.com/TodePond))

#### 🏠 Internal

- refactor: Keep hook function convention the same [#2358](https://github.com/tldraw/tldraw/pull/2358) ([@Lennon57](https://github.com/Lennon57))

#### Authors: 6

- [@zfedoran](https://github.com/zfedoran)
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- MinhoPark ([@Lennon57](https://github.com/Lennon57))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.19 (Tue Dec 12 2023)

### Release Notes

#### zoom to affected shapes after undo/redo ([#2293](https://github.com/tldraw/tldraw/pull/2293))

- Make sure affected shapes are visible after undo/redo

#### Add fit to content for frames. ([#2275](https://github.com/tldraw/tldraw/pull/2275))

- Add Fit to content option to the context menu for frames. This resizes the frames to correctly fit all their content.

#### Fix an issue with a stale editor reference in shape utils ([#2295](https://github.com/tldraw/tldraw/pull/2295))

- Fix an issue where the shape utils could have a stale reference to the editor.

#### fix new page naming ([#2292](https://github.com/tldraw/tldraw/pull/2292))

- Fix naming of pages created by the "move to page" action

#### [improvements] arrows x enclosing shapes x precision. ([#2265](https://github.com/tldraw/tldraw/pull/2265))

- Improves the logic about when to draw "precise" arrows between the center of bound shapes.

#### fix vite HMR issue ([#2279](https://github.com/tldraw/tldraw/pull/2279))

- Fixes a bug that could cause crashes due to a re-render loop with HMR #1989

#### Add connecting screen override. ([#2273](https://github.com/tldraw/tldraw/pull/2273))

- Allow users to customize the connecting screen.

#### Removing frames and adding elements to frames ([#2219](https://github.com/tldraw/tldraw/pull/2219))

- Allow users to remove the frame, but keep it's children. Allow the users to add shapes to the frame directly when creating a frame.

#### fix typo in useFixSafariDoubleTapZoomPencilEvents.ts ([#2242](https://github.com/tldraw/tldraw/pull/2242))

- Add a brief release note for your PR here.

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

#### Revert back to the previous color. ([#2210](https://github.com/tldraw/tldraw/pull/2210))

- Fixes the color of culled shapes when using dark mode.

#### Fix an issue with not being able to group a shape an an arrow. ([#2205](https://github.com/tldraw/tldraw/pull/2205))

- Add a brief release note for your PR here.

#### [fix] masked bounds calculation ([#2197](https://github.com/tldraw/tldraw/pull/2197))

- Fix bug with getmaskedpagebounds calculation for identical parent / child sizes

---

#### 💥 Breaking Change

- No impure getters pt 1 [#2189](https://github.com/tldraw/tldraw/pull/2189) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- Add fit to content for frames. [#2275](https://github.com/tldraw/tldraw/pull/2275) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [improvements] arrows x enclosing shapes x precision. [#2265](https://github.com/tldraw/tldraw/pull/2265) ([@steveruizok](https://github.com/steveruizok))
- Add connecting screen override. [#2273](https://github.com/tldraw/tldraw/pull/2273) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Removing frames and adding elements to frames [#2219](https://github.com/tldraw/tldraw/pull/2219) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Custom Tools DX + screenshot example [#2198](https://github.com/tldraw/tldraw/pull/2198) ([@steveruizok](https://github.com/steveruizok))
- StateNode atoms [#2213](https://github.com/tldraw/tldraw/pull/2213) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Revert "zoom to affected shapes after undo/redo" [#2310](https://github.com/tldraw/tldraw/pull/2310) ([@ds300](https://github.com/ds300))
- zoom to affected shapes after undo/redo [#2293](https://github.com/tldraw/tldraw/pull/2293) ([@ds300](https://github.com/ds300))
- Fix an issue with a stale editor reference in shape utils [#2295](https://github.com/tldraw/tldraw/pull/2295) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix the cleanup of event handlers [#2298](https://github.com/tldraw/tldraw/pull/2298) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- fix new page naming [#2292](https://github.com/tldraw/tldraw/pull/2292) ([@SomeHats](https://github.com/SomeHats))
- fix vite HMR issue [#2279](https://github.com/tldraw/tldraw/pull/2279) ([@SomeHats](https://github.com/SomeHats))
- no impure getters pt 11 [#2236](https://github.com/tldraw/tldraw/pull/2236) ([@ds300](https://github.com/ds300))
- No impure getters pt10 [#2235](https://github.com/tldraw/tldraw/pull/2235) ([@ds300](https://github.com/ds300))
- No impure getters pt9 [#2222](https://github.com/tldraw/tldraw/pull/2222) ([@ds300](https://github.com/ds300))
- No impure getters pt8 [#2221](https://github.com/tldraw/tldraw/pull/2221) ([@ds300](https://github.com/ds300))
- No impure getters pt7 [#2220](https://github.com/tldraw/tldraw/pull/2220) ([@ds300](https://github.com/ds300))
- No impure getters pt6 [#2218](https://github.com/tldraw/tldraw/pull/2218) ([@ds300](https://github.com/ds300))
- No impure getters pt5 [#2208](https://github.com/tldraw/tldraw/pull/2208) ([@ds300](https://github.com/ds300))
- Revert back to the previous color. [#2210](https://github.com/tldraw/tldraw/pull/2210) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix an issue with not being able to group a shape an an arrow. [#2205](https://github.com/tldraw/tldraw/pull/2205) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- No impure getters pt4 [#2206](https://github.com/tldraw/tldraw/pull/2206) ([@ds300](https://github.com/ds300))
- No impure getters pt3 [#2203](https://github.com/tldraw/tldraw/pull/2203) ([@ds300](https://github.com/ds300))
- No impure getters pt2 [#2202](https://github.com/tldraw/tldraw/pull/2202) ([@ds300](https://github.com/ds300))
- [fix] masked bounds calculation [#2197](https://github.com/tldraw/tldraw/pull/2197) ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- Replace getters in examples [#2261](https://github.com/tldraw/tldraw/pull/2261) ([@ds300](https://github.com/ds300))
- fix typo in useFixSafariDoubleTapZoomPencilEvents.ts [#2242](https://github.com/tldraw/tldraw/pull/2242) ([@eltociear](https://github.com/eltociear))

#### Authors: 6

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Ikko Eltociear Ashimine ([@eltociear](https://github.com/eltociear))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.18 (Fri Nov 10 2023)

### Release Notes

#### [fix] actions menu freezing ui ([#2187](https://github.com/tldraw/tldraw/pull/2187))

- Fix actions menu not closing when clicking the canvas after grouping items via the actions menu.

#### add missing semicolon ([#2182](https://github.com/tldraw/tldraw/pull/2182))

- Fix typo in CSS file

#### Fix crash with zero length arrow ([#2173](https://github.com/tldraw/tldraw/pull/2173))

- Fix a hyper niche arrow crash with zero length arrows.

#### Zooming improvement ([#2149](https://github.com/tldraw/tldraw/pull/2149))

- Improves zooming for inactive windows.

#### [feature] Things on the canvas ([#2150](https://github.com/tldraw/tldraw/pull/2150))

- [editor] Adds two new components, `OnTheCanvas` and `InFrontOfTheCanvas`.

#### [feature] multi-scribbles ([#2125](https://github.com/tldraw/tldraw/pull/2125))

- [feature] multi scribbles

#### Tighten up editor ui ([#2102](https://github.com/tldraw/tldraw/pull/2102))

- Small adjustment to editor ui.

#### Taha/initial shape in handle change ([#2117](https://github.com/tldraw/tldraw/pull/2117))

- Add a brief release note for your PR here.

#### Fix an issue with `addEventListener` in old Safari (pre v14) ([#2114](https://github.com/tldraw/tldraw/pull/2114))

- Fixes an issue with `addEventListener` on MediaQueryList object in old versions of Safari.

#### Remove (optional) from jsdocs ([#2109](https://github.com/tldraw/tldraw/pull/2109))

- dev: Removed duplicate/inconsistent `(optional)`s from docs

---

#### 🚀 Enhancement

- [feature] Things on the canvas [#2150](https://github.com/tldraw/tldraw/pull/2150) ([@steveruizok](https://github.com/steveruizok))
- [feature] multi-scribbles [#2125](https://github.com/tldraw/tldraw/pull/2125) ([@steveruizok](https://github.com/steveruizok))
- Tighten up editor ui [#2102](https://github.com/tldraw/tldraw/pull/2102) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- [fix] actions menu freezing ui [#2187](https://github.com/tldraw/tldraw/pull/2187) ([@steveruizok](https://github.com/steveruizok))
- add missing semicolon [#2182](https://github.com/tldraw/tldraw/pull/2182) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- fix scroll event coords [#2180](https://github.com/tldraw/tldraw/pull/2180) ([@ds300](https://github.com/ds300))
- Fix crash with zero length arrow [#2173](https://github.com/tldraw/tldraw/pull/2173) ([@TodePond](https://github.com/TodePond))
- Zooming improvement [#2149](https://github.com/tldraw/tldraw/pull/2149) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix an issue with `addEventListener` in old Safari (pre v14) [#2114](https://github.com/tldraw/tldraw/pull/2114) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🏠 Internal

- Revert "bump prerelease from alpha to beta" [#2192](https://github.com/tldraw/tldraw/pull/2192) ([@ds300](https://github.com/ds300))
- bump prerelease from alpha to beta [#2148](https://github.com/tldraw/tldraw/pull/2148) ([@ds300](https://github.com/ds300))
- Taha/initial shape in handle change [#2117](https://github.com/tldraw/tldraw/pull/2117) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### 📝 Documentation

- Add meta example [#2122](https://github.com/tldraw/tldraw/pull/2122) ([@steveruizok](https://github.com/steveruizok))
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

#### [fix] Context menu + menus not closing correctly ([#2086](https://github.com/tldraw/tldraw/pull/2086))

- [fix] bug with menus

#### [fix] missing border on group shape when unlocked ([#2075](https://github.com/tldraw/tldraw/pull/2075))

- Fix case where indicator was not shown when unlocking groups

#### [fix] reparenting locked shapes ([#2070](https://github.com/tldraw/tldraw/pull/2070))

- Fix a bug where grouped locked shapes would be deleted when ungrouped.

---

#### 🐛 Bug Fix

- [fix] Context menu + menus not closing correctly [#2086](https://github.com/tldraw/tldraw/pull/2086) ([@steveruizok](https://github.com/steveruizok))
- [fix] remove findLast calls [#2081](https://github.com/tldraw/tldraw/pull/2081) ([@steveruizok](https://github.com/steveruizok))
- [fix] missing border on group shape when unlocked [#2075](https://github.com/tldraw/tldraw/pull/2075) ([@steveruizok](https://github.com/steveruizok))
- Compact children when updating parents to children. [#2072](https://github.com/tldraw/tldraw/pull/2072) ([@steveruizok](https://github.com/steveruizok))
- [fix] reparenting locked shapes [#2070](https://github.com/tldraw/tldraw/pull/2070) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- bump nanoid [#2078](https://github.com/tldraw/tldraw/pull/2078) ([@ds300](https://github.com/ds300))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.16 (Wed Oct 11 2023)

### Release Notes

#### Fix shape opacity when erasing ([#2055](https://github.com/tldraw/tldraw/pull/2055))

- Fixes opacity of shapes while erasing in a group or frame.

#### [fix] Hit testing against zero width / height lines ([#2060](https://github.com/tldraw/tldraw/pull/2060))

- [fix] Bug where arrows would not bind to straight lines

#### [improvement] Scope `getShapeAtPoint` to rendering shapes only ([#2043](https://github.com/tldraw/tldraw/pull/2043))

- Improve perf for hovering shapes / shape hit tests

---

#### 🚀 Enhancement

- [improvement] Scope `getShapeAtPoint` to rendering shapes only [#2043](https://github.com/tldraw/tldraw/pull/2043) ([@steveruizok](https://github.com/steveruizok))
- prevent hover indicator from showing when pointer isn't over the canvas [#2023](https://github.com/tldraw/tldraw/pull/2023) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fix

- Fix shape opacity when erasing [#2055](https://github.com/tldraw/tldraw/pull/2055) ([@ds300](https://github.com/ds300))
- [fix] Hit testing against zero width / height lines [#2060](https://github.com/tldraw/tldraw/pull/2060) ([@steveruizok](https://github.com/steveruizok))
- Fix newlines in text geo shapes [#2059](https://github.com/tldraw/tldraw/pull/2059) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok))
- Restore background [#2037](https://github.com/tldraw/tldraw/pull/2037) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Publish api.json [#2034](https://github.com/tldraw/tldraw/pull/2034) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.15 (Fri Oct 06 2023)

### Release Notes

#### frame label fix ([#2016](https://github.com/tldraw/tldraw/pull/2016))

- Add a brief release note for your PR here.

#### [improvement] prevent editing in readonly ([#1990](https://github.com/tldraw/tldraw/pull/1990))

- Prevent editing text shapes in readonly mode.

#### [fix] Hovered indicators shown when coarse pointer ([#1985](https://github.com/tldraw/tldraw/pull/1985))

- Hide hovered indicators on mobile / coarse pointer devices.

#### [fix] pinch events ([#1979](https://github.com/tldraw/tldraw/pull/1979))

- Improve pinch gesture events.

#### Fix text-wrapping on Safari ([#1980](https://github.com/tldraw/tldraw/pull/1980))

- Fix text wrapping differently on Safari and Chrome/Firefox

Before/After

<image width="350" src="https://github.com/tldraw/tldraw/assets/98838967/320171b4-61e0-4a41-b8d3-830bd90bea65">
<image width="350" src="https://github.com/tldraw/tldraw/assets/98838967/b42d7156-0ce9-4894-9692-9338dc931b79">

#### Remove focus management ([#1953](https://github.com/tldraw/tldraw/pull/1953))

- [editor] Make autofocus default, remove automatic blur / focus events.

#### Allow right clicking selection backgrounds ([#1968](https://github.com/tldraw/tldraw/pull/1968))

- Improved right click behaviour.

#### [improvement] improve arrows (for real) ([#1957](https://github.com/tldraw/tldraw/pull/1957))

- Improve arrows.

#### [feature] Include `sources` in `TLExternalContent` ([#1925](https://github.com/tldraw/tldraw/pull/1925))

- [editor / tldraw] add `sources` to `TLExternalContent`

#### Fix shape drag perf ([#1932](https://github.com/tldraw/tldraw/pull/1932))

- Fixes a perf regression for dragging shapes around

#### Use smarter rounding for shape container div width/height ([#1930](https://github.com/tldraw/tldraw/pull/1930))

- Improves the precision of the shape dimensions rounding logic

#### [fix] Moving group items inside of a frame (dropping) ([#1886](https://github.com/tldraw/tldraw/pull/1886))

- Fix bug: ungroup when moving a shape in a group in a frame.

#### Fix line wobble ([#1915](https://github.com/tldraw/tldraw/pull/1915))

- Fixes an issue where lines would wobble as you dragged the handles around

#### [wip] Viewport focus of editing shapes ([#1873](https://github.com/tldraw/tldraw/pull/1873))

Removed a feature to reset the viewport back to a shape that is being edited.

(Before) Don't be held back by the past
![Kapture 2023-09-15 at 10 57 29](https://github.com/tldraw/tldraw/assets/98838967/d8891621-766e-46a2-b1ca-afa968b7f08c)

(After) You are free to find new avenues of exploration
![Kapture 2023-09-15 at 11 02 36](https://github.com/tldraw/tldraw/assets/98838967/82f318ab-944b-41bd-8297-a35467a15987)

#### Migrate snapshot ([#1843](https://github.com/tldraw/tldraw/pull/1843))

- [editor] add `Store.migrateSnapshot`

#### [fix] zero width / height bounds ([#1840](https://github.com/tldraw/tldraw/pull/1840))

- Fix bug with straight lines / arrows

#### Fix paste transform ([#1859](https://github.com/tldraw/tldraw/pull/1859))

- Fixes a bug affecting the position of pasted content inside frames.

#### Fix indicator transform miscalculation ([#1852](https://github.com/tldraw/tldraw/pull/1852))

- Fixes indicator transform miscalculation on android and windows

#### [fix] awful rendering issue ([#1842](https://github.com/tldraw/tldraw/pull/1842))

- [fix] iframe rendering issue

#### [fix] snapping bug ([#1819](https://github.com/tldraw/tldraw/pull/1819))

- [fix] crash that could occur when snapping

#### [fix] editing video shapes ([#1821](https://github.com/tldraw/tldraw/pull/1821))

- Fix bug with editing video shapes.

#### [fix] bug with eventemitter3 default export ([#1818](https://github.com/tldraw/tldraw/pull/1818))

- [@tldraw/editor] updates eventemitter3 import to fix issue with Astro builds.

#### Custom rendering margin / don't cull selected shapes ([#1788](https://github.com/tldraw/tldraw/pull/1788))

- [editor] add `Editor.renderingBoundsMargin`

#### Camera APIs ([#1786](https://github.com/tldraw/tldraw/pull/1786))

- (editor) improve camera commands

#### environment manager ([#1784](https://github.com/tldraw/tldraw/pull/1784))

- [editor] Move environment flags to environment manager

#### Editor commands API / effects ([#1778](https://github.com/tldraw/tldraw/pull/1778))

- tbd

#### [fix] shape indicator showing when locked shapes are hovered ([#1771](https://github.com/tldraw/tldraw/pull/1771))

- locked shapes do not show an indicator when hovered

#### remove `selectionPageCenter` ([#1766](https://github.com/tldraw/tldraw/pull/1766))

- [dev] Removes `Editor.selectionPageCenter`

#### rename selection page bounds ([#1763](https://github.com/tldraw/tldraw/pull/1763))

- [editor] rename `selectedPageBounds` to `selectionPageBounds`

#### `ShapeUtil.getGeometry`, selection rewrite ([#1751](https://github.com/tldraw/tldraw/pull/1751))

- [editor] Remove `ShapeUtil.getBounds`, `ShapeUtil.getOutline`, `ShapeUtil.hitTestPoint`, `ShapeUtil.hitTestLineSegment`
- [editor] Add `ShapeUtil.getGeometry`
- [editor] Add `Editor.getShapeGeometry`

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

#### tldraw zero - package shuffle ([#1710](https://github.com/tldraw/tldraw/pull/1710))

- [@tldraw/editor] lots, wip
- [@tldraw/ui] gone, merged to tldraw/tldraw
- [@tldraw/polyfills] gone, merged to tldraw/editor
- [@tldraw/primitives] gone, merged to tldraw/editor / tldraw/tldraw
- [@tldraw/indices] gone, merged to tldraw/editor
- [@tldraw/file-format] gone, merged to tldraw/tldraw

#### tweaks for cloud shape ([#1723](https://github.com/tldraw/tldraw/pull/1723))

- Add a brief release note for your PR here.

#### Add cloud shape ([#1708](https://github.com/tldraw/tldraw/pull/1708))

- Adds a cloud shape.

#### [refactor] reduce dependencies on shape utils in editor ([#1693](https://github.com/tldraw/tldraw/pull/1693))

- removes shape utils from the arguments of `isShapeOfType`, replacing with a generic
- removes shape utils from the arguments of `getShapeUtil`, replacing with a generic
- moves custom arrow info cache out of the util and into the editor class
- changes the a tool's `shapeType` to be a string instead of a shape util

#### Make some missing tsdocs appear on the docs site ([#1706](https://github.com/tldraw/tldraw/pull/1706))

- Docs: Fixed some missing docs for the TldrawEditor component.

#### [hot take] remove `tool` from shape definition ([#1691](https://github.com/tldraw/tldraw/pull/1691))

- [dev] Removed the `tool` property from `defineShape`

#### [refactor] reordering shapes ([#1718](https://github.com/tldraw/tldraw/pull/1718))

- [api] removes `Editor.getParentsMappedToChildren`
- [api] removes `Editor.reorderShapes`
- [api] moves reordering shapes code into its own file, outside of the editor

#### remove state checks for brush and zoom brush ([#1717](https://github.com/tldraw/tldraw/pull/1717))

- [editor] remove `editor.isIn` state checks for displaying brush and zoom brush.

#### Go back to default cursor when done resizing. ([#1700](https://github.com/tldraw/tldraw/pull/1700))

- Switch back to the default cursor after you are done inserting a new text shape.

#### Firefox: Fix coarse pointer issue ([#1701](https://github.com/tldraw/tldraw/pull/1701))

- Fixed firefox not being able to use cursor chat when using a touch screen on desktop.

---

#### 💥 Breaking Change

- [improvement] prevent editing in readonly [#1990](https://github.com/tldraw/tldraw/pull/1990) ([@steveruizok](https://github.com/steveruizok))
- Remove focus management [#1953](https://github.com/tldraw/tldraw/pull/1953) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- Make user preferences optional [#1963](https://github.com/tldraw/tldraw/pull/1963) ([@ds300](https://github.com/ds300))
- [fix] style changes [#1814](https://github.com/tldraw/tldraw/pull/1814) ([@steveruizok](https://github.com/steveruizok))
- Cleanup page state commands [#1800](https://github.com/tldraw/tldraw/pull/1800) ([@steveruizok](https://github.com/steveruizok))
- Rendering / cropping side-effects [#1799](https://github.com/tldraw/tldraw/pull/1799) ([@steveruizok](https://github.com/steveruizok))
- history options / markId / createPage [#1796](https://github.com/tldraw/tldraw/pull/1796) ([@steveruizok](https://github.com/steveruizok))
- Update setter names, `setXXShapeId` rather than `setXXId` [#1789](https://github.com/tldraw/tldraw/pull/1789) ([@steveruizok](https://github.com/steveruizok))
- Rename shapes apis [#1787](https://github.com/tldraw/tldraw/pull/1787) ([@steveruizok](https://github.com/steveruizok))
- Camera APIs [#1786](https://github.com/tldraw/tldraw/pull/1786) ([@steveruizok](https://github.com/steveruizok))
- SideEffectManager [#1785](https://github.com/tldraw/tldraw/pull/1785) ([@steveruizok](https://github.com/steveruizok))
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
- [refactor] reduce dependencies on shape utils in editor [#1693](https://github.com/tldraw/tldraw/pull/1693) ([@steveruizok](https://github.com/steveruizok))
- [hot take] remove `tool` from shape definition [#1691](https://github.com/tldraw/tldraw/pull/1691) ([@TodePond](https://github.com/TodePond))
- [refactor] reordering shapes [#1718](https://github.com/tldraw/tldraw/pull/1718) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- Debugging cleanup / misc cleanup [#2025](https://github.com/tldraw/tldraw/pull/2025) ([@steveruizok](https://github.com/steveruizok))
- [feature] Include `sources` in `TLExternalContent` [#1925](https://github.com/tldraw/tldraw/pull/1925) ([@steveruizok](https://github.com/steveruizok))
- Fix arrow handle snapping, snapping to text labels, selection of text labels [#1910](https://github.com/tldraw/tldraw/pull/1910) ([@steveruizok](https://github.com/steveruizok))
- Migrate snapshot [#1843](https://github.com/tldraw/tldraw/pull/1843) ([@steveruizok](https://github.com/steveruizok))
- Add snapshot prop, examples [#1856](https://github.com/tldraw/tldraw/pull/1856) ([@steveruizok](https://github.com/steveruizok))
- Add className as prop to Canvas [#1827](https://github.com/tldraw/tldraw/pull/1827) ([@steveruizok](https://github.com/steveruizok))
- [improvement] More selection logic [#1806](https://github.com/tldraw/tldraw/pull/1806) ([@steveruizok](https://github.com/steveruizok))
- refactor `parentsToChildrenWithIndexes` [#1764](https://github.com/tldraw/tldraw/pull/1764) ([@steveruizok](https://github.com/steveruizok))
- [fix] arrow snapping bug [#1756](https://github.com/tldraw/tldraw/pull/1756) ([@steveruizok](https://github.com/steveruizok))
- Add cloud shape [#1708](https://github.com/tldraw/tldraw/pull/1708) ([@ds300](https://github.com/ds300))
- remove state checks for brush and zoom brush [#1717](https://github.com/tldraw/tldraw/pull/1717) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- fix screen bounds not updating [#2022](https://github.com/tldraw/tldraw/pull/2022) ([@SomeHats](https://github.com/SomeHats))
- frame label fix [#2016](https://github.com/tldraw/tldraw/pull/2016) ([@ds300](https://github.com/ds300))
- [improvement] Refactor curved arrows [#2019](https://github.com/tldraw/tldraw/pull/2019) ([@steveruizok](https://github.com/steveruizok))
- [fix] Focus events (actually) [#2015](https://github.com/tldraw/tldraw/pull/2015) ([@steveruizok](https://github.com/steveruizok))
- [fix] focus events [#2013](https://github.com/tldraw/tldraw/pull/2013) ([@steveruizok](https://github.com/steveruizok))
- Re-focus on focus. [#2010](https://github.com/tldraw/tldraw/pull/2010) ([@steveruizok](https://github.com/steveruizok))
- Contain all the things [#1999](https://github.com/tldraw/tldraw/pull/1999) ([@steveruizok](https://github.com/steveruizok))
- fix text in geo shapes not causing its container to grow [#2003](https://github.com/tldraw/tldraw/pull/2003) ([@SomeHats](https://github.com/SomeHats))
- Fix an issue with arrow creation. [#2004](https://github.com/tldraw/tldraw/pull/2004) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [fix] X box shape arrow intersections [#2006](https://github.com/tldraw/tldraw/pull/2006) ([@steveruizok](https://github.com/steveruizok))
- Fix group opacity [#1997](https://github.com/tldraw/tldraw/pull/1997) ([@ds300](https://github.com/ds300))
- [fix] Escape key exiting full screen while editing shapes [#1986](https://github.com/tldraw/tldraw/pull/1986) ([@steveruizok](https://github.com/steveruizok))
- [fix] Hovered indicators shown when coarse pointer [#1985](https://github.com/tldraw/tldraw/pull/1985) ([@steveruizok](https://github.com/steveruizok))
- Sliiiightly darken muted-2 color. [#1981](https://github.com/tldraw/tldraw/pull/1981) ([@steveruizok](https://github.com/steveruizok))
- [fix] pinch events [#1979](https://github.com/tldraw/tldraw/pull/1979) ([@steveruizok](https://github.com/steveruizok))
- Fix text-wrapping on Safari [#1980](https://github.com/tldraw/tldraw/pull/1980) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- [fix] text shape outline [#1974](https://github.com/tldraw/tldraw/pull/1974) ([@steveruizok](https://github.com/steveruizok))
- Make state node methods arrow functions [#1973](https://github.com/tldraw/tldraw/pull/1973) ([@steveruizok](https://github.com/steveruizok))
- Arrows followup [#1972](https://github.com/tldraw/tldraw/pull/1972) ([@steveruizok](https://github.com/steveruizok))
- Allow right clicking selection backgrounds [#1968](https://github.com/tldraw/tldraw/pull/1968) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [improvement] improve arrows (for real) [#1957](https://github.com/tldraw/tldraw/pull/1957) ([@steveruizok](https://github.com/steveruizok))
- [fix] geo shape text label placement [#1927](https://github.com/tldraw/tldraw/pull/1927) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- fix clipping on nested non-intersecting frames [#1934](https://github.com/tldraw/tldraw/pull/1934) ([@SomeHats](https://github.com/SomeHats))
- expanded highlighter geometry [#1929](https://github.com/tldraw/tldraw/pull/1929) ([@SomeHats](https://github.com/SomeHats))
- Fix shape drag perf [#1932](https://github.com/tldraw/tldraw/pull/1932) ([@ds300](https://github.com/ds300))
- Use smarter rounding for shape container div width/height [#1930](https://github.com/tldraw/tldraw/pull/1930) ([@ds300](https://github.com/ds300))
- [fix] Moving group items inside of a frame (dropping) [#1886](https://github.com/tldraw/tldraw/pull/1886) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
- Fix line wobble [#1915](https://github.com/tldraw/tldraw/pull/1915) ([@ds300](https://github.com/ds300))
- [fix] right click [#1891](https://github.com/tldraw/tldraw/pull/1891) ([@steveruizok](https://github.com/steveruizok))
- [wip] Viewport focus of editing shapes [#1873](https://github.com/tldraw/tldraw/pull/1873) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- [fix] iframe losing focus on pointer down [#1848](https://github.com/tldraw/tldraw/pull/1848) ([@steveruizok](https://github.com/steveruizok))
- [fix] zero width / height bounds [#1840](https://github.com/tldraw/tldraw/pull/1840) ([@steveruizok](https://github.com/steveruizok))
- avoid pixel rounding / transformation miscalc for overlay items [#1858](https://github.com/tldraw/tldraw/pull/1858) ([@BrianHung](https://github.com/BrianHung) [@ds300](https://github.com/ds300))
- Fix paste transform [#1859](https://github.com/tldraw/tldraw/pull/1859) ([@ds300](https://github.com/ds300))
- Fix indicator transform miscalculation [#1852](https://github.com/tldraw/tldraw/pull/1852) ([@ds300](https://github.com/ds300))
- [fix] pointer events in shapes [#1855](https://github.com/tldraw/tldraw/pull/1855) ([@steveruizok](https://github.com/steveruizok))
- [fix] overlays stacking [#1849](https://github.com/tldraw/tldraw/pull/1849) ([@steveruizok](https://github.com/steveruizok))
- [fix] awful rendering issue [#1842](https://github.com/tldraw/tldraw/pull/1842) ([@steveruizok](https://github.com/steveruizok))
- [fix] svg overlays when browser zoom is not 100% [#1836](https://github.com/tldraw/tldraw/pull/1836) ([@steveruizok](https://github.com/steveruizok))
- Allow setting `user` as a prop [#1832](https://github.com/tldraw/tldraw/pull/1832) ([@SomeHats](https://github.com/SomeHats))
- [fix] text editing outline when scaled [#1826](https://github.com/tldraw/tldraw/pull/1826) ([@steveruizok](https://github.com/steveruizok))
- [fix] Line shape rendering [#1825](https://github.com/tldraw/tldraw/pull/1825) ([@steveruizok](https://github.com/steveruizok))
- [fix] remove CSS radius calculations [#1823](https://github.com/tldraw/tldraw/pull/1823) ([@steveruizok](https://github.com/steveruizok))
- [fix] snapping bug [#1819](https://github.com/tldraw/tldraw/pull/1819) ([@steveruizok](https://github.com/steveruizok))
- [fix] Replace `findLast` for browser compat [#1822](https://github.com/tldraw/tldraw/pull/1822) ([@steveruizok](https://github.com/steveruizok))
- [fix] editing video shapes [#1821](https://github.com/tldraw/tldraw/pull/1821) ([@steveruizok](https://github.com/steveruizok))
- [fix] bug with eventemitter3 default export [#1818](https://github.com/tldraw/tldraw/pull/1818) ([@steveruizok](https://github.com/steveruizok))
- [fix] Sticky text content / hovered shapes [#1808](https://github.com/tldraw/tldraw/pull/1808) ([@steveruizok](https://github.com/steveruizok))
- [fix] page to screen [#1797](https://github.com/tldraw/tldraw/pull/1797) ([@steveruizok](https://github.com/steveruizok))
- Custom rendering margin / don't cull selected shapes [#1788](https://github.com/tldraw/tldraw/pull/1788) ([@steveruizok](https://github.com/steveruizok))
- [fix] handles updates [#1779](https://github.com/tldraw/tldraw/pull/1779) ([@steveruizok](https://github.com/steveruizok))
- [fix] transform errors [#1772](https://github.com/tldraw/tldraw/pull/1772) ([@steveruizok](https://github.com/steveruizok))
- [fix] shape indicator showing when locked shapes are hovered [#1771](https://github.com/tldraw/tldraw/pull/1771) ([@steveruizok](https://github.com/steveruizok))
- [fix] minimap, common page bounds [#1770](https://github.com/tldraw/tldraw/pull/1770) ([@steveruizok](https://github.com/steveruizok))
- [fix] restore bg option, fix calculations [#1765](https://github.com/tldraw/tldraw/pull/1765) ([@steveruizok](https://github.com/steveruizok))
- [fix] dark mode [#1754](https://github.com/tldraw/tldraw/pull/1754) ([@steveruizok](https://github.com/steveruizok))
- tweaks for cloud shape [#1723](https://github.com/tldraw/tldraw/pull/1723) ([@ds300](https://github.com/ds300))
- Go back to default cursor when done resizing. [#1700](https://github.com/tldraw/tldraw/pull/1700) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Firefox: Fix coarse pointer issue [#1701](https://github.com/tldraw/tldraw/pull/1701) ([@TodePond](https://github.com/TodePond))

#### 📝 Documentation

- Make some missing tsdocs appear on the docs site [#1706](https://github.com/tldraw/tldraw/pull/1706) ([@TodePond](https://github.com/TodePond))

#### 🔩 Dependency Updates

- (chore) bump [#1744](https://github.com/tldraw/tldraw/pull/1744) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 8

- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Takuto Mori Gump ([@mr04vv](https://github.com/mr04vv))

---

# v2.0.0-alpha.14 (Tue Jul 04 2023)

### Release Notes

#### [fix] penmode ([#1698](https://github.com/tldraw/tldraw/pull/1698))

- [fix] pen mode

#### [improvement] More nuanced cursor state ([#1682](https://github.com/tldraw/tldraw/pull/1682))

- Improve cursor timeouts and hiding logic.

#### [fix] comma keyboard shortcuts ([#1675](https://github.com/tldraw/tldraw/pull/1675))

- [@tldraw/editor] Bug fixes on document events.

#### [improvement] add box sizing border box ([#1674](https://github.com/tldraw/tldraw/pull/1674))

- [@tldraw/editor] Add `box-sizing: border-box` to `tl-container`

#### [improvemnet] drop crc, Buffer dependency ([#1673](https://github.com/tldraw/tldraw/pull/1673))

- [@tldraw/editor] Remove peer dependency on buffer.

#### [improvement] export scribble manager ([#1671](https://github.com/tldraw/tldraw/pull/1671))

- [@tldraw/tldraw] Export `ScribbleManager`

#### [feature] add `meta` property to records ([#1627](https://github.com/tldraw/tldraw/pull/1627))

- todo

---

#### 🚀 Enhancement

- [improvement] More nuanced cursor state [#1682](https://github.com/tldraw/tldraw/pull/1682) ([@steveruizok](https://github.com/steveruizok))
- [improvement] export scribble manager [#1671](https://github.com/tldraw/tldraw/pull/1671) ([@steveruizok](https://github.com/steveruizok))
- [feature] add `meta` property to records [#1627](https://github.com/tldraw/tldraw/pull/1627) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- [fix] penmode [#1698](https://github.com/tldraw/tldraw/pull/1698) ([@steveruizok](https://github.com/steveruizok))
- [fix] indicator not updating [#1696](https://github.com/tldraw/tldraw/pull/1696) ([@steveruizok](https://github.com/steveruizok))
- [fix] comma keyboard shortcuts [#1675](https://github.com/tldraw/tldraw/pull/1675) ([@steveruizok](https://github.com/steveruizok))
- [improvement] add box sizing border box [#1674](https://github.com/tldraw/tldraw/pull/1674) ([@steveruizok](https://github.com/steveruizok))
- [improvemnet] drop crc, Buffer dependency [#1673](https://github.com/tldraw/tldraw/pull/1673) ([@steveruizok](https://github.com/steveruizok))
- [fix] Shape rendering [#1670](https://github.com/tldraw/tldraw/pull/1670) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.13 (Wed Jun 28 2023)

### Release Notes

#### Fix crash when rotating a deleted shape ([#1658](https://github.com/tldraw/tldraw/pull/1658))

- Fixed a crash when trying to rotate a deleted shape.

#### [improvement] store snapshot types ([#1657](https://github.com/tldraw/tldraw/pull/1657))

- [dev] Rename `StoreSnapshot` to `SerializedStore`
- [dev] Create new `StoreSnapshot` as type related to `getSnapshot`/`loadSnapshot`

#### [fix] pen mode touches ([#1655](https://github.com/tldraw/tldraw/pull/1655))

- Removes three touches to cancel pen mode feature.

#### Fix text shapes not having colour ([#1649](https://github.com/tldraw/tldraw/pull/1649))

- None: Fixes an unreleased bug.

#### Styles API docs ([#1641](https://github.com/tldraw/tldraw/pull/1641))

--

#### Styles API follow-ups ([#1636](https://github.com/tldraw/tldraw/pull/1636))

--

#### Fix SVG cursors not being used ([#1639](https://github.com/tldraw/tldraw/pull/1639))

- None: Fixing an unreleased bug.

#### `ShapeUtil` refactor, `Editor` cleanup ([#1611](https://github.com/tldraw/tldraw/pull/1611))

- [editor] renames `defaultProps` to `getDefaultProps`
- [editor] removes `outline`, `outlineSegments`, `handles`, `bounds`
- [editor] renames `renderBackground` to `backgroundComponent`

#### Revert "Update dependencies (#1613)" ([#1617](https://github.com/tldraw/tldraw/pull/1617))

-

#### Remove on drop override ([#1612](https://github.com/tldraw/tldraw/pull/1612))

- [editor] Remove `onDropOverride`

#### Make resizeBox a regular function ([#1610](https://github.com/tldraw/tldraw/pull/1610))

- [editor] Change `resizeBox` to be a regular function.

#### Rename `ShapeUtil.render` -> `ShapeUtil.component` ([#1609](https://github.com/tldraw/tldraw/pull/1609))

- [editor] rename `ShapeUtil.render` to `ShapeUtil.component`

#### tldraw.css ([#1607](https://github.com/tldraw/tldraw/pull/1607))

- [tldraw] Removes `editor.css` and `ui.css` exports, replaces with `tldraw.css`

#### [fix] camera culling ([#1602](https://github.com/tldraw/tldraw/pull/1602))

- [editor] Adds `Editor.cameraState`
- Adds smart culling to make panning and zooming more smooth

#### Styles API ([#1580](https://github.com/tldraw/tldraw/pull/1580))

-

#### (1/2) Timeout collaborator cursors ([#1525](https://github.com/tldraw/tldraw/pull/1525))

- Brought back cursor timeouts. Collaborator cursors now disappear after 3 seconds of inactivity.

#### (1/2) Cursor Chat - Presence ([#1487](https://github.com/tldraw/tldraw/pull/1487))

- [dev] Added support for cursor chat presence.

#### [refactor] snapping ([#1589](https://github.com/tldraw/tldraw/pull/1589))

- [editor] fix bug in snapping

#### remove `ShapeUtil.transform` ([#1590](https://github.com/tldraw/tldraw/pull/1590))

- [editor] Remove `ShapeUtil.transform`

#### Make sure loading screens use dark mode user preference. ([#1552](https://github.com/tldraw/tldraw/pull/1552))

- Make sure our loading and error screens take dark mode setting into account.

#### remove `ShapeUtil.point` ([#1591](https://github.com/tldraw/tldraw/pull/1591))

- [editor] Remove `ShapeUtil.point`

#### [fix] Remove group shape export backgrounds ([#1587](https://github.com/tldraw/tldraw/pull/1587))

- Fix image exports for groups

#### Add tsdocs to Editor methods ([#1581](https://github.com/tldraw/tldraw/pull/1581))

- [dev] Added initial documentation for the Editor class.

#### Add optional generic to `updateShapes` / `createShapes` ([#1579](https://github.com/tldraw/tldraw/pull/1579))

- [editor] adds an optional shape generic to `updateShapes` and `createShapes`

#### [improvement] Embed shape cleanup ([#1569](https://github.com/tldraw/tldraw/pull/1569))

- [editor] Remove unused props for `TLEditorShape`
- [editor] Adds `canUnmount` property to embed definitions

#### Move the loading of assets to the TldrawEditorWithReadyStore so that all code paths load the assets. ([#1561](https://github.com/tldraw/tldraw/pull/1561))

- Fix a problem where assets were not loading in some cases (snapshots).

#### shapes folder, move tools into shape defs ([#1574](https://github.com/tldraw/tldraw/pull/1574))

n/a

#### mini `defineShape` API ([#1563](https://github.com/tldraw/tldraw/pull/1563))

[dev-facing, notes to come]

#### yjs example ([#1560](https://github.com/tldraw/tldraw/pull/1560))

- [editor] Adds yjs example project

#### Misc sync fixes ([#1555](https://github.com/tldraw/tldraw/pull/1555))

- Fixes a handful of state management bugs that manifest in multiplayer rooms

#### [Docs] Change some editor properties to methods ([#1553](https://github.com/tldraw/tldraw/pull/1553))

- [docs] Fixed some methods that were incorrectly marked as properties.

#### [Docs] Change some internal methods to public ([#1554](https://github.com/tldraw/tldraw/pull/1554))

- [docs] Changed some Editor methods from internal to public.

#### Use unpkg as a default for serving assets. ([#1548](https://github.com/tldraw/tldraw/pull/1548))

- Use unpkg asset hosting as a default.

#### hoist opacity out of props ([#1526](https://github.com/tldraw/tldraw/pull/1526))

[internal only for now]

#### Fix arrows with weird bends crashing ([#1540](https://github.com/tldraw/tldraw/pull/1540))

- Fixed a rare crash that could happen when you try to curve an arrow with zero distance.

#### [feature] add vertical align to note shape ([#1539](https://github.com/tldraw/tldraw/pull/1539))

- Adds vertical align prop to note shapes

#### [fix] Shift key code / nudge ([#1537](https://github.com/tldraw/tldraw/pull/1537))

- Fix shift key nudging

#### scale exported canvases when they reach the browsers max size ([#1536](https://github.com/tldraw/tldraw/pull/1536))

- Fix a bug where sometimes exports would fail when they were too big for your browser. Now, they're scaled down to the max supported size.

#### [fix] control click on mac ([#1535](https://github.com/tldraw/tldraw/pull/1535))

- Fix control click to open menu on Mac

#### Fix being able to undo following ([#1531](https://github.com/tldraw/tldraw/pull/1531))

- Fixed a bug where you could undo viewport-following and viewport-unfollowing.

#### highlighter fixes ([#1530](https://github.com/tldraw/tldraw/pull/1530))

[aq bug fixes]

#### Simplify static cursors ([#1520](https://github.com/tldraw/tldraw/pull/1520))

- (editor) Simplifies the cursors in our CSS.

#### Renaming types, shape utils, tools ([#1513](https://github.com/tldraw/tldraw/pull/1513))

- Renaming of types, shape utils, tools

#### tlschema cleanup ([#1509](https://github.com/tldraw/tldraw/pull/1509))

- [editor] Remove `app.createShapeId`
- [tlschema] Cleans up exports

#### Rename tlstore to store ([#1507](https://github.com/tldraw/tldraw/pull/1507))

- Replace @tldraw/tlstore with @tldraw/store

#### Rename tlvalidate to validate ([#1508](https://github.com/tldraw/tldraw/pull/1508))

- Rename tlvalidate to validate

#### rename app to editor ([#1503](https://github.com/tldraw/tldraw/pull/1503))

- Rename `App` to `Editor` and many other things that reference `app` to `editor`.

#### Add support for locking shapes ([#1447](https://github.com/tldraw/tldraw/pull/1447))

- Add support for locking shapes.

#### [3/3] Highlighter styling ([#1490](https://github.com/tldraw/tldraw/pull/1490))

Highlighter pen is here! 🎉🎉🎉

#### [2/3] renderer changes to support "sandwich mode" highlighting ([#1418](https://github.com/tldraw/tldraw/pull/1418))

[not yet!]

#### [1/3] initial highlighter shape/tool ([#1401](https://github.com/tldraw/tldraw/pull/1401))

[internal only change layout ground work for highlighter]

#### [feature] reduce motion ([#1485](https://github.com/tldraw/tldraw/pull/1485))

- [editor] Add `reduceMotion` user preference
- Add reduce motion option to preferences

#### Feature flags rework ([#1474](https://github.com/tldraw/tldraw/pull/1474))

[internal only change]

#### [tiny] add isPageId ([#1482](https://github.com/tldraw/tldraw/pull/1482))

- [tlschema] Add `isPageId`

#### [refactor] update record names ([#1473](https://github.com/tldraw/tldraw/pull/1473))

- [editor] rename record types

#### [mini-feature] Following indicator ([#1468](https://github.com/tldraw/tldraw/pull/1468))

- Adds viewport following indicator

#### [chore] refactor user preferences ([#1435](https://github.com/tldraw/tldraw/pull/1435))

- Add a brief release note for your PR here.

#### update use-gesture ([#1453](https://github.com/tldraw/tldraw/pull/1453))

- Updates use-gesture to fix pinch gesture bug on iPad.

#### Add migration for horizontal alignment ([#1443](https://github.com/tldraw/tldraw/pull/1443))

- Add support for legacy alignment options.

#### Stricter ID types ([#1439](https://github.com/tldraw/tldraw/pull/1439))

[internal only, covered by #1432 changelog]

#### [refactor] restore createTLSchema ([#1444](https://github.com/tldraw/tldraw/pull/1444))

- [editor] Simplifies custom shape definition
- [tldraw] Updates props for <TldrawEditor> component to require a `TldrawEditorConfig`.

#### Fix cursor shadow getting clipped ([#1441](https://github.com/tldraw/tldraw/pull/1441))

- Fixed a bug where custom cursors could have their shadow clipped.

#### Add SVG cursors for all cursor types ([#1416](https://github.com/tldraw/tldraw/pull/1416))

- Added consistent custom cursors.

#### [refactor] remove `createTLSchema` ([#1440](https://github.com/tldraw/tldraw/pull/1440))

- [tlschema] Removes `createTLSchema` in favor of `TldrawEditorConfig`

#### [refactor] Remove `TLShapeDef`, `getShapeUtilByType`. ([#1432](https://github.com/tldraw/tldraw/pull/1432))

- [tlschema] Update props of `createTLSchema`
- [editor] Update props of `TldrawEditorConfig`
- [editor] Remove `App.getShapeUtilByType`
- [editor] Update `App.getShapeUtil` to take a type rather than a shape

#### [refactor] record migrations ([#1430](https://github.com/tldraw/tldraw/pull/1430))

- [tlschema] Improve `defineMigrations`
- [editor] Simplify migration definitions

#### Measure individual words instead of just line breaks for text exports ([#1397](https://github.com/tldraw/tldraw/pull/1397))

- Add a brief release note for your PR here.

#### Create @tldraw/indices package ([#1426](https://github.com/tldraw/tldraw/pull/1426))

- [@tldraw/editor] Remove fractional indices code into `@tldraw/indices`
- [@tldraw/indices] Create library for fractional indices code

#### [improvement] set horizontal position using text alignment ([#1419](https://github.com/tldraw/tldraw/pull/1419))

- Geo shapes and sticky notes now position their labels based on their alignment.

#### [fix] reorder handles in front of selection ([#1420](https://github.com/tldraw/tldraw/pull/1420))

- Fix a bug where handles would appear behind selection indicators.

#### [feature] add laser pointer ([#1412](https://github.com/tldraw/tldraw/pull/1412))

- Adds the laser pointer tool.

#### [firefox] Fix the pointer getting stuck down when you press the control key ([#1390](https://github.com/tldraw/tldraw/pull/1390))

- [Firefox] Fixed a bug where the pointer could get stuck down when the control key is held down.

#### Vertical text alignment for geo shapes ([#1414](https://github.com/tldraw/tldraw/pull/1414))

- This adds vertical text alignment property to geo shapes.

#### Switch to new collaborators component ([#1405](https://github.com/tldraw/tldraw/pull/1405))

- [Breaking] Removes the old version of LiveCollaborators, replacing it with the new one based on `TLInstancePresence`

#### [improvement] refactor paste to support multi-line text ([#1398](https://github.com/tldraw/tldraw/pull/1398))

- Improves clipboard logic when pasting text
- Adds support for pasting multi-line text
- Adds maximum widths when pasting single-line text
- Adds support for RTL languages when pasting multi-line or wrapped text
- Strips leading indentation when pasting text

#### remove url state, to private ([#1402](https://github.com/tldraw/tldraw/pull/1402))

- [editor] remove `useUrlState`

#### [fix] Don't synchronize isReadOnly ([#1396](https://github.com/tldraw/tldraw/pull/1396))

- Removes the isReadOnly value from the `user_document_settings` record type.

#### Delete an empty text shape when clicking on another text shape. ([#1384](https://github.com/tldraw/tldraw/pull/1384))

- Fix a problem with empty text shapes not getting deleted if you clicked on another text shape.

#### Fix setting the grid mode. ([#1386](https://github.com/tldraw/tldraw/pull/1386))

- Fix grid mode toggle.

#### Fix selection foreground being misaligned ([#1380](https://github.com/tldraw/tldraw/pull/1380))

- None (fix for a bug that hasn't released)

#### Expand selection outline for single-selected draw shape ([#1379](https://github.com/tldraw/tldraw/pull/1379))

- Improve selection outlines around horizontal or vertical draw shapes

#### [fix] pointer location not updating when moving over editing shape ([#1378](https://github.com/tldraw/tldraw/pull/1378))

- Fix a bug where the pointer location would not update when moving the pointer over an editing shape.

#### [perf] deleteShapes ([#1373](https://github.com/tldraw/tldraw/pull/1373))

- Perf improvement for deleting shapes in a document with lots of pages.

#### fix a couple of consistency assumptions ([#1365](https://github.com/tldraw/tldraw/pull/1365))

- Fixes a couple of minor consistency bugs affecting shape updating and page deletion in multiplayer contexts.

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

#### enable eslint for test files ([#1363](https://github.com/tldraw/tldraw/pull/1363))

internal-only change

#### presence-related fixes ([#1361](https://github.com/tldraw/tldraw/pull/1361))

- Fix a bug where creating a page could throw an error in some multiplayer contexts.

#### [improvement] Ui events followup ([#1354](https://github.com/tldraw/tldraw/pull/1354))

- [ui] Adds source to ui events data object
- [ui] Corrects source for toolbar events
- [ui] Corrects source for clipboard events
- [examples] Updates events example

#### [fix] various text ([#1350](https://github.com/tldraw/tldraw/pull/1350))

- Allow leading whitespace

#### [chore] Bump nanoid ([#1349](https://github.com/tldraw/tldraw/pull/1349))

- Remove unused userId and instanceId props from AppOptions

---

#### 💥 Breaking Change

- [tweak] migrate store snapshot arguments [#1659](https://github.com/tldraw/tldraw/pull/1659) ([@steveruizok](https://github.com/steveruizok))
- [improvement] store snapshot types [#1657](https://github.com/tldraw/tldraw/pull/1657) ([@steveruizok](https://github.com/steveruizok))
- [fix] react component runaways, error boundaries [#1625](https://github.com/tldraw/tldraw/pull/1625) ([@steveruizok](https://github.com/steveruizok))
- `ShapeUtil` refactor, `Editor` cleanup [#1611](https://github.com/tldraw/tldraw/pull/1611) ([@steveruizok](https://github.com/steveruizok))
- Remove on drop override [#1612](https://github.com/tldraw/tldraw/pull/1612) ([@steveruizok](https://github.com/steveruizok))
- Rename `ShapeUtil.render` -> `ShapeUtil.component` [#1609](https://github.com/tldraw/tldraw/pull/1609) ([@steveruizok](https://github.com/steveruizok))
- tldraw.css [#1607](https://github.com/tldraw/tldraw/pull/1607) ([@steveruizok](https://github.com/steveruizok))
- [fix] camera culling [#1602](https://github.com/tldraw/tldraw/pull/1602) ([@steveruizok](https://github.com/steveruizok))
- Tidy up [#1600](https://github.com/tldraw/tldraw/pull/1600) ([@steveruizok](https://github.com/steveruizok))
- Styles API [#1580](https://github.com/tldraw/tldraw/pull/1580) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- remove `ShapeUtil.transform` [#1590](https://github.com/tldraw/tldraw/pull/1590) ([@steveruizok](https://github.com/steveruizok))
- remove `ShapeUtil.point` [#1591](https://github.com/tldraw/tldraw/pull/1591) ([@steveruizok](https://github.com/steveruizok))
- mini `defineShape` API [#1563](https://github.com/tldraw/tldraw/pull/1563) ([@SomeHats](https://github.com/SomeHats))
- Use unpkg as a default for serving assets. [#1548](https://github.com/tldraw/tldraw/pull/1548) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- hoist opacity out of props [#1526](https://github.com/tldraw/tldraw/pull/1526) ([@SomeHats](https://github.com/SomeHats))
- Independent instance state persistence [#1493](https://github.com/tldraw/tldraw/pull/1493) ([@ds300](https://github.com/ds300))
- Renaming types, shape utils, tools [#1513](https://github.com/tldraw/tldraw/pull/1513) ([@steveruizok](https://github.com/steveruizok))
- tlschema cleanup [#1509](https://github.com/tldraw/tldraw/pull/1509) ([@steveruizok](https://github.com/steveruizok))
- Rename tlstore to store [#1507](https://github.com/tldraw/tldraw/pull/1507) ([@steveruizok](https://github.com/steveruizok))
- Rename tlvalidate to validate [#1508](https://github.com/tldraw/tldraw/pull/1508) ([@steveruizok](https://github.com/steveruizok))
- rename app to editor [#1503](https://github.com/tldraw/tldraw/pull/1503) ([@steveruizok](https://github.com/steveruizok))
- Add support for project names [#1340](https://github.com/tldraw/tldraw/pull/1340) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [refactor] User-facing APIs [#1478](https://github.com/tldraw/tldraw/pull/1478) ([@steveruizok](https://github.com/steveruizok))
- [refactor] update record names [#1473](https://github.com/tldraw/tldraw/pull/1473) ([@steveruizok](https://github.com/steveruizok))
- [chore] refactor user preferences [#1435](https://github.com/tldraw/tldraw/pull/1435) ([@ds300](https://github.com/ds300))
- [refactor] restore createTLSchema [#1444](https://github.com/tldraw/tldraw/pull/1444) ([@steveruizok](https://github.com/steveruizok))
- [refactor] remove `createTLSchema` [#1440](https://github.com/tldraw/tldraw/pull/1440) ([@steveruizok](https://github.com/steveruizok))
- [refactor] Remove `TLShapeDef`, `getShapeUtilByType`. [#1432](https://github.com/tldraw/tldraw/pull/1432) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
- [refactor] record migrations [#1430](https://github.com/tldraw/tldraw/pull/1430) ([@steveruizok](https://github.com/steveruizok))
- Create @tldraw/indices package [#1426](https://github.com/tldraw/tldraw/pull/1426) ([@steveruizok](https://github.com/steveruizok))
- Switch to new collaborators component [#1405](https://github.com/tldraw/tldraw/pull/1405) ([@ds300](https://github.com/ds300))
- remove url state, to private [#1402](https://github.com/tldraw/tldraw/pull/1402) ([@steveruizok](https://github.com/steveruizok))
- [fix] Don't synchronize isReadOnly [#1396](https://github.com/tldraw/tldraw/pull/1396) ([@ds300](https://github.com/ds300))
- [improvement] Ui events followup [#1354](https://github.com/tldraw/tldraw/pull/1354) ([@steveruizok](https://github.com/steveruizok))
- [feature] ui events [#1326](https://github.com/tldraw/tldraw/pull/1326) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- [chore] Bump nanoid [#1349](https://github.com/tldraw/tldraw/pull/1349) ([@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- Styles API follow-ups [#1636](https://github.com/tldraw/tldraw/pull/1636) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Make resizeBox a regular function [#1610](https://github.com/tldraw/tldraw/pull/1610) ([@steveruizok](https://github.com/steveruizok))
- [fix] yjs presence [#1603](https://github.com/tldraw/tldraw/pull/1603) ([@steveruizok](https://github.com/steveruizok))
- (1/2) Timeout collaborator cursors [#1525](https://github.com/tldraw/tldraw/pull/1525) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- (1/2) Cursor Chat - Presence [#1487](https://github.com/tldraw/tldraw/pull/1487) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Add optional generic to `updateShapes` / `createShapes` [#1579](https://github.com/tldraw/tldraw/pull/1579) ([@steveruizok](https://github.com/steveruizok))
- [feature] add vertical align to note shape [#1539](https://github.com/tldraw/tldraw/pull/1539) ([@steveruizok](https://github.com/steveruizok))
- move v1 migration code into file-format [#1499](https://github.com/tldraw/tldraw/pull/1499) ([@steveruizok](https://github.com/steveruizok))
- Add support for locking shapes [#1447](https://github.com/tldraw/tldraw/pull/1447) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [3/3] Highlighter styling [#1490](https://github.com/tldraw/tldraw/pull/1490) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- [2/3] renderer changes to support "sandwich mode" highlighting [#1418](https://github.com/tldraw/tldraw/pull/1418) ([@SomeHats](https://github.com/SomeHats))
- [1/3] initial highlighter shape/tool [#1401](https://github.com/tldraw/tldraw/pull/1401) ([@SomeHats](https://github.com/SomeHats))
- [feature] reduce motion [#1485](https://github.com/tldraw/tldraw/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- [mini-feature] Following indicator [#1468](https://github.com/tldraw/tldraw/pull/1468) ([@steveruizok](https://github.com/steveruizok))
- Add SVG cursors for all cursor types [#1416](https://github.com/tldraw/tldraw/pull/1416) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [improvement] set horizontal position using text alignment [#1419](https://github.com/tldraw/tldraw/pull/1419) ([@steveruizok](https://github.com/steveruizok))
- [feature] add laser pointer [#1412](https://github.com/tldraw/tldraw/pull/1412) ([@steveruizok](https://github.com/steveruizok))
- Vertical text alignment for geo shapes [#1414](https://github.com/tldraw/tldraw/pull/1414) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- [improvement] refactor paste to support multi-line text [#1398](https://github.com/tldraw/tldraw/pull/1398) ([@steveruizok](https://github.com/steveruizok))
- [fix] pointer location not updating when moving over editing shape [#1378](https://github.com/tldraw/tldraw/pull/1378) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix crash when rotating a deleted shape [#1658](https://github.com/tldraw/tldraw/pull/1658) ([@TodePond](https://github.com/TodePond))
- [fix] pen mode touches [#1655](https://github.com/tldraw/tldraw/pull/1655) ([@steveruizok](https://github.com/steveruizok))
- Fix text shapes not having colour [#1649](https://github.com/tldraw/tldraw/pull/1649) ([@TodePond](https://github.com/TodePond))
- Fix SVG cursors not being used [#1639](https://github.com/tldraw/tldraw/pull/1639) ([@TodePond](https://github.com/TodePond))
- 3/2 Cursor chat [#1623](https://github.com/tldraw/tldraw/pull/1623) ([@steveruizok](https://github.com/steveruizok))
- [fix] tldraw file drop [#1616](https://github.com/tldraw/tldraw/pull/1616) ([@steveruizok](https://github.com/steveruizok))
- [refactor] snapping [#1589](https://github.com/tldraw/tldraw/pull/1589) ([@steveruizok](https://github.com/steveruizok))
- Make sure loading screens use dark mode user preference. [#1552](https://github.com/tldraw/tldraw/pull/1552) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- update exports for user presence [#1583](https://github.com/tldraw/tldraw/pull/1583) ([@steveruizok](https://github.com/steveruizok))
- [fix] Remove group shape export backgrounds [#1587](https://github.com/tldraw/tldraw/pull/1587) ([@steveruizok](https://github.com/steveruizok))
- [fix] embeds [#1578](https://github.com/tldraw/tldraw/pull/1578) ([@steveruizok](https://github.com/steveruizok))
- [improvement] Embed shape cleanup [#1569](https://github.com/tldraw/tldraw/pull/1569) ([@steveruizok](https://github.com/steveruizok))
- Move the loading of assets to the TldrawEditorWithReadyStore so that all code paths load the assets. [#1561](https://github.com/tldraw/tldraw/pull/1561) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- shapes folder, move tools into shape defs [#1574](https://github.com/tldraw/tldraw/pull/1574) ([@SomeHats](https://github.com/SomeHats))
- offset drop point by editor client rect [#1564](https://github.com/tldraw/tldraw/pull/1564) ([@BrianHung](https://github.com/BrianHung))
- Asset improvements [#1557](https://github.com/tldraw/tldraw/pull/1557) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- More misc sync fixes [#1559](https://github.com/tldraw/tldraw/pull/1559) ([@ds300](https://github.com/ds300))
- Misc sync fixes [#1555](https://github.com/tldraw/tldraw/pull/1555) ([@ds300](https://github.com/ds300))
- Fix arrows with weird bends crashing [#1540](https://github.com/tldraw/tldraw/pull/1540) ([@TodePond](https://github.com/TodePond))
- [fix] Shift key code / nudge [#1537](https://github.com/tldraw/tldraw/pull/1537) ([@steveruizok](https://github.com/steveruizok))
- scale exported canvases when they reach the browsers max size [#1536](https://github.com/tldraw/tldraw/pull/1536) ([@SomeHats](https://github.com/SomeHats))
- [fix] control click on mac [#1535](https://github.com/tldraw/tldraw/pull/1535) ([@steveruizok](https://github.com/steveruizok))
- Fix being able to undo following [#1531](https://github.com/tldraw/tldraw/pull/1531) ([@TodePond](https://github.com/TodePond))
- highlighter fixes [#1530](https://github.com/tldraw/tldraw/pull/1530) ([@SomeHats](https://github.com/SomeHats))
- ensure that fixed points stay fixed [#1523](https://github.com/tldraw/tldraw/pull/1523) ([@steveruizok](https://github.com/steveruizok))
- Feature flags rework [#1474](https://github.com/tldraw/tldraw/pull/1474) ([@SomeHats](https://github.com/SomeHats))
- send user prefs data in broadcast msg [#1466](https://github.com/tldraw/tldraw/pull/1466) ([@ds300](https://github.com/ds300))
- Fix positioning of default cursor [#1458](https://github.com/tldraw/tldraw/pull/1458) ([@TodePond](https://github.com/TodePond))
- change pointer cursor to white [#1454](https://github.com/tldraw/tldraw/pull/1454) ([@TodePond](https://github.com/TodePond))
- Add migration for horizontal alignment [#1443](https://github.com/tldraw/tldraw/pull/1443) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Stricter ID types [#1439](https://github.com/tldraw/tldraw/pull/1439) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Fix cursor shadow getting clipped [#1441](https://github.com/tldraw/tldraw/pull/1441) ([@TodePond](https://github.com/TodePond))
- Fix new wobble [#1431](https://github.com/tldraw/tldraw/pull/1431) ([@TodePond](https://github.com/TodePond))
- Measure individual words instead of just line breaks for text exports [#1397](https://github.com/tldraw/tldraw/pull/1397) ([@SomeHats](https://github.com/SomeHats))
- [fix] laser pointer [#1429](https://github.com/tldraw/tldraw/pull/1429) ([@steveruizok](https://github.com/steveruizok))
- [fix] reorder handles in front of selection [#1420](https://github.com/tldraw/tldraw/pull/1420) ([@steveruizok](https://github.com/steveruizok))
- [firefox] Fix the pointer getting stuck down when you press the control key [#1390](https://github.com/tldraw/tldraw/pull/1390) ([@TodePond](https://github.com/TodePond))
- fix viewport following [#1411](https://github.com/tldraw/tldraw/pull/1411) ([@ds300](https://github.com/ds300))
- Delete an empty text shape when clicking on another text shape. [#1384](https://github.com/tldraw/tldraw/pull/1384) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix setting the grid mode. [#1386](https://github.com/tldraw/tldraw/pull/1386) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix selection foreground being misaligned [#1380](https://github.com/tldraw/tldraw/pull/1380) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Expand selection outline for single-selected draw shape [#1379](https://github.com/tldraw/tldraw/pull/1379) ([@SomeHats](https://github.com/SomeHats))
- [fix] Allow interactions with embeds in readonly mode [#1333](https://github.com/tldraw/tldraw/pull/1333) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [perf] deleteShapes [#1373](https://github.com/tldraw/tldraw/pull/1373) ([@ds300](https://github.com/ds300))
- fix a couple of consistency assumptions [#1365](https://github.com/tldraw/tldraw/pull/1365) ([@ds300](https://github.com/ds300))
- presence-related fixes [#1361](https://github.com/tldraw/tldraw/pull/1361) ([@ds300](https://github.com/ds300))
- [fix] various text [#1350](https://github.com/tldraw/tldraw/pull/1350) ([@steveruizok](https://github.com/steveruizok))
- [fix] tabs in text exports [#1323](https://github.com/tldraw/tldraw/pull/1323) ([@steveruizok](https://github.com/steveruizok))
- [chore] move schema construction to tlschema package [#1334](https://github.com/tldraw/tldraw/pull/1334) ([@ds300](https://github.com/ds300))
- [feature] `check-box` geo shape [#1330](https://github.com/tldraw/tldraw/pull/1330) ([@steveruizok](https://github.com/steveruizok))
- [fix] update useTransform.ts [#1327](https://github.com/tldraw/tldraw/pull/1327) ([@steveruizok](https://github.com/steveruizok))
- [improvement] dragging start distance on coarse pointer [#1220](https://github.com/tldraw/tldraw/pull/1220) ([@steveruizok](https://github.com/steveruizok))
- [fix] SVG export for arrows with labels but no arrowheads [#1229](https://github.com/tldraw/tldraw/pull/1229) ([@steveruizok](https://github.com/steveruizok))
- remove svg layer, html all the things, rs to tl [#1227](https://github.com/tldraw/tldraw/pull/1227) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- add docs for TLShapeUtil [#1215](https://github.com/tldraw/tldraw/pull/1215) ([@TodePond](https://github.com/TodePond))
- New vite-based examples app [#1226](https://github.com/tldraw/tldraw/pull/1226) ([@SomeHats](https://github.com/SomeHats))
- [fix] publish [#1222](https://github.com/tldraw/tldraw/pull/1222) ([@ds300](https://github.com/ds300))
- [fix] typo in isFocusingInput [#1221](https://github.com/tldraw/tldraw/pull/1221) ([@ds300](https://github.com/ds300))
- [feat] new LiveCollaborators behind feature flag [#1219](https://github.com/tldraw/tldraw/pull/1219) ([@ds300](https://github.com/ds300))
- [fix] collaborator render order [#1213](https://github.com/tldraw/tldraw/pull/1213) ([@steveruizok](https://github.com/steveruizok))
- [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
- Use `strokePathData` for `<ShapeFill/>` path to avoid bugs in the inner path algo [#1207](https://github.com/tldraw/tldraw/pull/1207) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- Added `pHYs` to import/export of png images [#1200](https://github.com/tldraw/tldraw/pull/1200) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- derived presence state [#1204](https://github.com/tldraw/tldraw/pull/1204) ([@ds300](https://github.com/ds300))
- [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
- transfer-out: transfer out [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- Explicit shape type checks [#1594](https://github.com/tldraw/tldraw/pull/1594) ([@steveruizok](https://github.com/steveruizok))
- [improvement] bookmark shape logic [#1568](https://github.com/tldraw/tldraw/pull/1568) ([@steveruizok](https://github.com/steveruizok))
- use the right TLEventHandlers [#1486](https://github.com/tldraw/tldraw/pull/1486) ([@judicaelandria](https://github.com/judicaelandria) [@steveruizok](https://github.com/steveruizok))
- yjs example [#1560](https://github.com/tldraw/tldraw/pull/1560) ([@steveruizok](https://github.com/steveruizok))
- rename app folder to editor [#1528](https://github.com/tldraw/tldraw/pull/1528) ([@steveruizok](https://github.com/steveruizok))
- Simplify static cursors [#1520](https://github.com/tldraw/tldraw/pull/1520) ([@steveruizok](https://github.com/steveruizok))
- [chore] remove benchmark [#1489](https://github.com/tldraw/tldraw/pull/1489) ([@steveruizok](https://github.com/steveruizok))
- [tiny] add isPageId [#1482](https://github.com/tldraw/tldraw/pull/1482) ([@steveruizok](https://github.com/steveruizok))
- [fix] overlay rendering issues [#1389](https://github.com/tldraw/tldraw/pull/1389) ([@steveruizok](https://github.com/steveruizok))
- Remove commented code in App [#1377](https://github.com/tldraw/tldraw/pull/1377) ([@steveruizok](https://github.com/steveruizok))
- avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))
- enable eslint for test files [#1363](https://github.com/tldraw/tldraw/pull/1363) ([@SomeHats](https://github.com/SomeHats))

#### 📝 Documentation

- [improvement] custom shapes example [#1660](https://github.com/tldraw/tldraw/pull/1660) ([@steveruizok](https://github.com/steveruizok))
- Styles API docs [#1641](https://github.com/tldraw/tldraw/pull/1641) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Add tsdocs to Editor methods [#1581](https://github.com/tldraw/tldraw/pull/1581) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [Docs] Change some editor properties to methods [#1553](https://github.com/tldraw/tldraw/pull/1553) ([@TodePond](https://github.com/TodePond))
- [Docs] Change some internal methods to public [#1554](https://github.com/tldraw/tldraw/pull/1554) ([@TodePond](https://github.com/TodePond))

#### 🧪 Tests

- update editor tests [#1547](https://github.com/tldraw/tldraw/pull/1547) ([@steveruizok](https://github.com/steveruizok))
- Add playwright tests [#1484](https://github.com/tldraw/tldraw/pull/1484) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Incorporate signia as @tldraw/state [#1620](https://github.com/tldraw/tldraw/pull/1620) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- Revert "Update dependencies (#1613)" [#1617](https://github.com/tldraw/tldraw/pull/1617) ([@SomeHats](https://github.com/SomeHats))
- Update dependencies [#1613](https://github.com/tldraw/tldraw/pull/1613) ([@steveruizok](https://github.com/steveruizok))
- update use-gesture [#1453](https://github.com/tldraw/tldraw/pull/1453) ([@ds300](https://github.com/ds300))

#### Authors: 8

- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Judicael ([@judicaelandria](https://github.com/judicaelandria))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

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
