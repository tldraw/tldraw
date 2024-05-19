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

#### Color tweaks (light and dark mode) ([#3486](https://github.com/tldraw/tldraw/pull/3486))

- Adjusts colors

#### Add slides example ([#3467](https://github.com/tldraw/tldraw/pull/3467))

- Docs: Added a slideshow example

#### Only show cursor chat button in select mode ([#3485](https://github.com/tldraw/tldraw/pull/3485))

- Fix cursor chat button appearing when not in select tool.

#### Fix alt-duplicating shapes sometimes not working ([#3488](https://github.com/tldraw/tldraw/pull/3488))

- Add a brief release note for your PR here.

#### [perf] faster signia capture (again) ([#3487](https://github.com/tldraw/tldraw/pull/3487))

- Add a brief release note for your PR here.

#### [perf] faster signia capture ([#3471](https://github.com/tldraw/tldraw/pull/3471))

- Slight performance improvement to reactivity bookkeeping.

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

#### conditionally use star-history dark theme ([#3461](https://github.com/tldraw/tldraw/pull/3461))

updates the star-history image in the README to conditionally show a dark theme image based on the user's `prefers-color-scheme`

#### Allow users to edit the document title by double clicking it even when editing a shape. ([#3459](https://github.com/tldraw/tldraw/pull/3459))

- Allow users to editing document name by double clicking even when previously editing text.

#### Don't show edit link for locked shapes. ([#3457](https://github.com/tldraw/tldraw/pull/3457))

- Hide edit link context menu option for locked shapes.

#### Faster selection / erasing ([#3454](https://github.com/tldraw/tldraw/pull/3454))

- Improve performance of minimum distance checks.

#### Make minimap display sharp rectangles. ([#3434](https://github.com/tldraw/tldraw/pull/3434))

- Improve

#### Update font import URL in quick-start.mdx ([#3430](https://github.com/tldraw/tldraw/pull/3430))

- Fixes font import link in tldraw.dev quickstart guide

#### Perf: Improve text outline performance ([#3429](https://github.com/tldraw/tldraw/pull/3429))

- Improves performance of text shapes on iOS / Safari.

#### Perf: throttle `updateHoveredId` ([#3419](https://github.com/tldraw/tldraw/pull/3419))

- Improves canvas performance by throttling the update to the editor's hovered id.

#### Perf: block hit tests while moving camera ([#3418](https://github.com/tldraw/tldraw/pull/3418))

- Improves performance of canvas while the camera is moving.

#### Perf: (slightly) faster min dist checks ([#3401](https://github.com/tldraw/tldraw/pull/3401))

- Performance: small improvements to hit testing.

#### Examples: update kbd shortcuts, add actions overrides example ([#3330](https://github.com/tldraw/tldraw/pull/3330))

- Add action overrides example, update keyboard shortcuts example

#### Add long press event ([#3275](https://github.com/tldraw/tldraw/pull/3275))

- Add support for long pressing on desktop.

#### Tool with child states ([#3074](https://github.com/tldraw/tldraw/pull/3074))

- Add an example of a tool with child states

#### Fix text resizing bug ([#3327](https://github.com/tldraw/tldraw/pull/3327))

- Fixes an issue with text shapes overflowing their bounds when resized.

#### Input buffering ([#3223](https://github.com/tldraw/tldraw/pull/3223))

- Add a brief release note for your PR here.

#### Add white ([#3321](https://github.com/tldraw/tldraw/pull/3321))

- Adds secret white color.

#### Don't trigger pointer move on zoom ([#3305](https://github.com/tldraw/tldraw/pull/3305))

- Improve performance of zooming.

#### Decrease the number of rendered dom nodes for geo shape and arrows ([#3283](https://github.com/tldraw/tldraw/pull/3283))

- Reduce the number of rendered dom nodes for geo shapes and arrows without text.

#### Improve performance of culling ([#3272](https://github.com/tldraw/tldraw/pull/3272))

- Improve performance of the canvas when many shapes are present.

#### styling: make dotcom and examples site have consistent font styling ([#3271](https://github.com/tldraw/tldraw/pull/3271))

- Add a brief release note for your PR here.

#### ui: make toasts look more toasty ([#2988](https://github.com/tldraw/tldraw/pull/2988))

- UI: Add severity to toasts.

#### textfields [1 of 3]: add text into speech bubble; also add rich text example ([#3050](https://github.com/tldraw/tldraw/pull/3050))

- Refactor textfields be composable/swappable.

#### Update romanian translations ([#3269](https://github.com/tldraw/tldraw/pull/3269))

- Update Romanian translation.

#### Allow hiding debug panel. ([#3261](https://github.com/tldraw/tldraw/pull/3261))

- Allow users to fully override the `DebugPanel`.

#### Add inline behaviour example ([#3113](https://github.com/tldraw/tldraw/pull/3113))

- Docs: Added an example for inline behaviour.

#### toolbar: fix missing title attributes ([#3244](https://github.com/tldraw/tldraw/pull/3244))

- Fix title's being missing on toolbar items.

#### Don't double squash ([#3182](https://github.com/tldraw/tldraw/pull/3182))

- Minor improvement when modifying multiple shapes at once.

#### Fix lag while panning + translating at the same time ([#3186](https://github.com/tldraw/tldraw/pull/3186))

- Add a brief release note for your PR here.

#### fix docs build ([#3201](https://github.com/tldraw/tldraw/pull/3201))

- Add a brief release note for your PR here.

#### Update the document title to include the document name. ([#3197](https://github.com/tldraw/tldraw/pull/3197))

- Use the document name in the `document.title`.

#### Remove access token logic. ([#3187](https://github.com/tldraw/tldraw/pull/3187))

- Remove some leftover logic from pro days.

#### [fix] Batch tick events ([#3181](https://github.com/tldraw/tldraw/pull/3181))

- Fix a performance issue effecting resizing multiple shapes.

#### [tinyish] Simplify / skip some work in Shape ([#3176](https://github.com/tldraw/tldraw/pull/3176))

- SDK: minor improvements to the Shape component

#### [tiny] Slightly more efficient selection rotated page bounds / page bounds ([#3178](https://github.com/tldraw/tldraw/pull/3178))

- SDK, slightly more performant selection bounds calculations.

#### [sync] allow connections from v4 clients ([#3173](https://github.com/tldraw/tldraw/pull/3173))

- Add a brief release note for your PR here.

#### [fix] Handles extra renders ([#3172](https://github.com/tldraw/tldraw/pull/3172))

- SDK: Fixed a minor rendering issue related to handles.

#### [fix] Cleanup text measures ([#3169](https://github.com/tldraw/tldraw/pull/3169))

- Fixed a bug that could cause multiple text measurement divs in development mode.

#### [perf] Reinstate render throttling ([#3160](https://github.com/tldraw/tldraw/pull/3160))

- Add a brief release note for your PR here.

#### Fix release eliding ([#3156](https://github.com/tldraw/tldraw/pull/3156))

- Add a brief release note for your PR here.

#### Updated exploded example link from installation page. ([#3138](https://github.com/tldraw/tldraw/pull/3138))

- Add a brief release note for your PR here.
Installation docs has a link to example for exploded which points to github 404. I have updated the working link.

#### Make the custom menu examples a bit clearer ([#3106](https://github.com/tldraw/tldraw/pull/3106))

- Add a brief release note for your PR here.

#### Menu updates / fix flip / add export / remove Shape menu ([#3115](https://github.com/tldraw/tldraw/pull/3115))

- Revert some changes in the menu.

#### Performance improvements ([#2977](https://github.com/tldraw/tldraw/pull/2977))

- Improves the performance of rendering.

#### [fix] Rotated crop handle ([#3093](https://github.com/tldraw/tldraw/pull/3093))

- Fixed a bug that could cause rotated cropping images to have incorrectly rotated handles.

#### Fix typo in useValue comment ([#3088](https://github.com/tldraw/tldraw/pull/3088))

- Fix typo in useValue comment.

#### Shape with Migrations ([#3078](https://github.com/tldraw/tldraw/pull/3078))

- Adds a shape with migrations example

#### Fix viewport params for pages. ([#3079](https://github.com/tldraw/tldraw/pull/3079))

- Fixes an issue with url params in the share links. The viewport params only worked on the first page in the document.

#### Fix typo ([#3069](https://github.com/tldraw/tldraw/pull/3069))

N/A

#### Add custom tool examples ([#3064](https://github.com/tldraw/tldraw/pull/3064))

- Adds a simple custom tool example

#### Fix validation errors for `duplicateProps` ([#3065](https://github.com/tldraw/tldraw/pull/3065))

- Add a brief release note for your PR here.

#### Shorten url state ([#3041](https://github.com/tldraw/tldraw/pull/3041))

- Shortens url parameters for dot com.

#### Fix an issue where the video size was not drawn correctly ([#3047](https://github.com/tldraw/tldraw/pull/3047))

- Fix an issue where the video size was not drawn correctly.

#### [fix] Input tags ([#3038](https://github.com/tldraw/tldraw/pull/3038))

- Fixed autocomplete, autocapitalize, and autocorrect tags on text inputs.

#### Lokalise: Translations update ([#3049](https://github.com/tldraw/tldraw/pull/3049))

- Updated Hungarian translations.

#### [terrible] Firefox: Allow scrolling on keyboard shortcuts dialog ([#2974](https://github.com/tldraw/tldraw/pull/2974))

- Add a brief release note for your PR here.

#### Fix cursor chat bubble position. ([#3042](https://github.com/tldraw/tldraw/pull/3042))

- Fixed a bug where cursor chat bubble position could be wrong when a sidebar was open.

#### Fix broken link for shape example ([#3046](https://github.com/tldraw/tldraw/pull/3046))

- Fix a link that was pointing to a 404 on GitHub

#### Protect local storage calls ([#3043](https://github.com/tldraw/tldraw/pull/3043))

- Fixes a bug that could cause crashes in React Native webviews.

#### Custom shape examples ([#2994](https://github.com/tldraw/tldraw/pull/2994))

- adds a simple custom shape example
- adds an interactive shape example
- updates editable shape example

#### Expose `getStyleForNextShape` ([#3039](https://github.com/tldraw/tldraw/pull/3039))

- Expose the API for `Editor.getStyleForNextShape`, previously marked as internal.

#### [fix] Missing element crash (rare) on video shapes. ([#3037](https://github.com/tldraw/tldraw/pull/3037))

- Fixed a rare crash with video shapes.

#### Example of using tldraw styles ([#3017](https://github.com/tldraw/tldraw/pull/3017))

- shape with tldraw styles example

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

- `@tldraw/editor`, `tldraw`, `@tldraw/validate`
  - React-powered SVG exports [#3117](https://github.com/tldraw/tldraw/pull/3117) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `tldraw`
  - Component-based toolbar customisation API [#3067](https://github.com/tldraw/tldraw/pull/3067) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Menu updates / fix flip / add export / remove Shape menu [#3115](https://github.com/tldraw/tldraw/pull/3115) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/utils`
  - Performance improvements [#2977](https://github.com/tldraw/tldraw/pull/2977) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- squish sync data events before sending them out [#3118](https://github.com/tldraw/tldraw/pull/3118) ([@si14](https://github.com/si14))
- `@tldraw/editor`, `tldraw`
  - textfields [1 of 3]: add text into speech bubble; also add rich text example [#3050](https://github.com/tldraw/tldraw/pull/3050) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - Selection UI example (plus fixes to pageToScreen) [#3015](https://github.com/tldraw/tldraw/pull/3015) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Revert "squish sync data events before sending them out" [#3331](https://github.com/tldraw/tldraw/pull/3331) ([@ds300](https://github.com/ds300))
- docs: fix up github link [#3108](https://github.com/tldraw/tldraw/pull/3108) ([@mimecuvalo](https://github.com/mimecuvalo))
- Bump the npm_and_yarn group across 3 directories with 3 updates [#3087](https://github.com/tldraw/tldraw/pull/3087) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@github-actions[bot]](https://github.com/github-actions[bot]) [@MitjaBezensek](https://github.com/MitjaBezensek))
- simplify fnmatch pattern ([@ds300](https://github.com/ds300))
- Bump the npm_and_yarn group group with 7 updates [#2982](https://github.com/tldraw/tldraw/pull/2982) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - quick fixes [#3128](https://github.com/tldraw/tldraw/pull/3128) ([@steveruizok](https://github.com/steveruizok))

#### 📚 SDK Changes

- Update useFileSystem.tsx [#3371](https://github.com/tldraw/tldraw/pull/3371) ([@steveruizok](https://github.com/steveruizok))
- only buffer pointer events [#3337](https://github.com/tldraw/tldraw/pull/3337) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Fix collaborator size with zoom [#3563](https://github.com/tldraw/tldraw/pull/3563) ([@steveruizok](https://github.com/steveruizok))
  - Make note handles show only one when zoomed out [#3562](https://github.com/tldraw/tldraw/pull/3562) ([@steveruizok](https://github.com/steveruizok))
  - Fix transparent colors in the minimap [#3561](https://github.com/tldraw/tldraw/pull/3561) ([@steveruizok](https://github.com/steveruizok))
  - Expose `usePreloadAssets` [#3545](https://github.com/tldraw/tldraw/pull/3545) ([@SomeHats](https://github.com/SomeHats))
  - Prevent default on native clipboard events [#3536](https://github.com/tldraw/tldraw/pull/3536) ([@steveruizok](https://github.com/steveruizok))
  - Improve back to content [#3532](https://github.com/tldraw/tldraw/pull/3532) ([@steveruizok](https://github.com/steveruizok))
  - arrows: fix bound arrow labels going over text shape [#3512](https://github.com/tldraw/tldraw/pull/3512) ([@mimecuvalo](https://github.com/mimecuvalo))
  - textfields: fix Safari cursor rendering bug, take 2 [#3513](https://github.com/tldraw/tldraw/pull/3513) ([@mimecuvalo](https://github.com/mimecuvalo))
  - geo: fix double unique id on DOM [#3514](https://github.com/tldraw/tldraw/pull/3514) ([@mimecuvalo](https://github.com/mimecuvalo))
  - arrows: still use Dist instead of Dist2 [#3511](https://github.com/tldraw/tldraw/pull/3511) ([@mimecuvalo](https://github.com/mimecuvalo))
  - textfields: nix disableTab option; make TextShapes have custom Tab behavior as intended [#3506](https://github.com/tldraw/tldraw/pull/3506) ([@mimecuvalo](https://github.com/mimecuvalo))
  - "Soft preload" icons [#3507](https://github.com/tldraw/tldraw/pull/3507) ([@steveruizok](https://github.com/steveruizok))
  - textfields: wait a tick before selecting all to fix iOS [#3501](https://github.com/tldraw/tldraw/pull/3501) ([@mimecuvalo](https://github.com/mimecuvalo))
  - textfields: fix dragging selected shape behind another [#3498](https://github.com/tldraw/tldraw/pull/3498) ([@mimecuvalo](https://github.com/mimecuvalo))
  - stickies: a bit of fuzziness when calculating certain text [#3493](https://github.com/tldraw/tldraw/pull/3493) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix alt-duplicating shapes sometimes not working [#3488](https://github.com/tldraw/tldraw/pull/3488) ([@TodePond](https://github.com/TodePond))
  - stickies: dont remove selection ranges when edit->edit [#3484](https://github.com/tldraw/tldraw/pull/3484) ([@mimecuvalo](https://github.com/mimecuvalo))
  - stickies: hide clone handles on mobile [#3478](https://github.com/tldraw/tldraw/pull/3478) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Don't show edit link for locked shapes. [#3457](https://github.com/tldraw/tldraw/pull/3457) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Performance measurement tool (for unit tests) [#3447](https://github.com/tldraw/tldraw/pull/3447) ([@steveruizok](https://github.com/steveruizok))
  - Remove minimap throttling [#3438](https://github.com/tldraw/tldraw/pull/3438) ([@steveruizok](https://github.com/steveruizok))
  - Make minimap display sharp rectangles. [#3434](https://github.com/tldraw/tldraw/pull/3434) ([@steveruizok](https://github.com/steveruizok))
  - Perf: throttle `updateHoveredId` [#3419](https://github.com/tldraw/tldraw/pull/3419) ([@steveruizok](https://github.com/steveruizok))
  - Revert "Fix text resizing bug (#3327)" [#3332](https://github.com/tldraw/tldraw/pull/3332) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix text resizing bug [#3327](https://github.com/tldraw/tldraw/pull/3327) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Fix count shapes and nodes [#3318](https://github.com/tldraw/tldraw/pull/3318) ([@steveruizok](https://github.com/steveruizok))
  - Decrease the number of rendered dom nodes for geo shape and arrows [#3283](https://github.com/tldraw/tldraw/pull/3283) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - styling: make dotcom and examples site have consistent font styling [#3271](https://github.com/tldraw/tldraw/pull/3271) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Allow hiding debug panel. [#3261](https://github.com/tldraw/tldraw/pull/3261) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - toolbar: fix missing title attributes [#3244](https://github.com/tldraw/tldraw/pull/3244) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Fix jpg export and tests [#3198](https://github.com/tldraw/tldraw/pull/3198) ([@SomeHats](https://github.com/SomeHats))
  - [tiny] lift theme in style panel [#3170](https://github.com/tldraw/tldraw/pull/3170) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`, `@tldraw/utils`
  - Perf: minor drawing speedup [#3464](https://github.com/tldraw/tldraw/pull/3464) ([@steveruizok](https://github.com/steveruizok))
  - fixup file helpers [#3130](https://github.com/tldraw/tldraw/pull/3130) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `tldraw`
  - WebGL Minimap [#3510](https://github.com/tldraw/tldraw/pull/3510) ([@ds300](https://github.com/ds300))
  - textfields: on mobile edit->edit, allow going to empty geo [#3469](https://github.com/tldraw/tldraw/pull/3469) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Faster selection / erasing [#3454](https://github.com/tldraw/tldraw/pull/3454) ([@steveruizok](https://github.com/steveruizok))
  - Fix SVG exports in Next.js [#3446](https://github.com/tldraw/tldraw/pull/3446) ([@SomeHats](https://github.com/SomeHats))
  - Perf: Incremental culled shapes calculation. [#3411](https://github.com/tldraw/tldraw/pull/3411) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Fix some tests [#3403](https://github.com/tldraw/tldraw/pull/3403) ([@steveruizok](https://github.com/steveruizok))
  - Add long press event [#3275](https://github.com/tldraw/tldraw/pull/3275) ([@steveruizok](https://github.com/steveruizok))
  - textfields: fix regression with Text shape and resizing [#3333](https://github.com/tldraw/tldraw/pull/3333) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Add image annotator example [#3147](https://github.com/tldraw/tldraw/pull/3147) ([@SomeHats](https://github.com/SomeHats))
  - [fix] Batch tick events [#3181](https://github.com/tldraw/tldraw/pull/3181) ([@steveruizok](https://github.com/steveruizok))
  - [tinyish] Simplify / skip some work in Shape [#3176](https://github.com/tldraw/tldraw/pull/3176) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`
  - [signia] Smart dirty checking of active computeds [#3516](https://github.com/tldraw/tldraw/pull/3516) ([@ds300](https://github.com/ds300))
  - [perf] faster signia capture (again) [#3487](https://github.com/tldraw/tldraw/pull/3487) ([@ds300](https://github.com/ds300))
  - [perf] faster signia capture [#3471](https://github.com/tldraw/tldraw/pull/3471) ([@ds300](https://github.com/ds300))
- `tldraw`, `@tldraw/validate`
  - [fix] allow loading files [#3517](https://github.com/tldraw/tldraw/pull/3517) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Color tweaks (light and dark mode) [#3486](https://github.com/tldraw/tldraw/pull/3486) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`
  - Stickies: fix sticky note clipping [#3503](https://github.com/tldraw/tldraw/pull/3503) ([@steveruizok](https://github.com/steveruizok))
  - css more shapes that need transparent behavior [#3497](https://github.com/tldraw/tldraw/pull/3497) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [fix] use page point for pointer [#3476](https://github.com/tldraw/tldraw/pull/3476) ([@ds300](https://github.com/ds300))
  - perf: calculate hypoteneuse manually instead of using hypot [#3468](https://github.com/tldraw/tldraw/pull/3468) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Cancel pointer velocity while pinching [#3462](https://github.com/tldraw/tldraw/pull/3462) ([@steveruizok](https://github.com/steveruizok))
  - Perf: Use a computed cache for masked shape page bounds [#3460](https://github.com/tldraw/tldraw/pull/3460) ([@steveruizok](https://github.com/steveruizok))
  - Remove docs for Editor.batch [#3451](https://github.com/tldraw/tldraw/pull/3451) ([@steveruizok](https://github.com/steveruizok))
  - Fix panning. [#3445](https://github.com/tldraw/tldraw/pull/3445) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Perf: Improve text outline performance [#3429](https://github.com/tldraw/tldraw/pull/3429) ([@steveruizok](https://github.com/steveruizok))
  - Fix text bug on iOS [#3423](https://github.com/tldraw/tldraw/pull/3423) ([@steveruizok](https://github.com/steveruizok))
  - Perf: block hit tests while moving camera [#3418](https://github.com/tldraw/tldraw/pull/3418) ([@steveruizok](https://github.com/steveruizok))
  - Fix an issue with layers when moving shapes. [#3380](https://github.com/tldraw/tldraw/pull/3380) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [culling] minimal culled diff with webgl [#3377](https://github.com/tldraw/tldraw/pull/3377) ([@steveruizok](https://github.com/steveruizok))
  - put `getCurrentPageId` into a computed [#3378](https://github.com/tldraw/tldraw/pull/3378) ([@steveruizok](https://github.com/steveruizok))
  - Don't trigger pointer move on zoom [#3305](https://github.com/tldraw/tldraw/pull/3305) ([@steveruizok](https://github.com/steveruizok))
  - Improve performance of culling [#3272](https://github.com/tldraw/tldraw/pull/3272) ([@steveruizok](https://github.com/steveruizok))
  - Skip the random ID for regular history entries [#3183](https://github.com/tldraw/tldraw/pull/3183) ([@steveruizok](https://github.com/steveruizok))
  - [tiny] Slightly more efficient selection rotated page bounds / page bounds [#3178](https://github.com/tldraw/tldraw/pull/3178) ([@steveruizok](https://github.com/steveruizok))
  - [fix] handles [#3177](https://github.com/tldraw/tldraw/pull/3177) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Handles extra renders [#3172](https://github.com/tldraw/tldraw/pull/3172) ([@steveruizok](https://github.com/steveruizok))
  - [tiny] remove unused shape indicator equality checker [#3171](https://github.com/tldraw/tldraw/pull/3171) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Cleanup text measures [#3169](https://github.com/tldraw/tldraw/pull/3169) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - New migrations again [#3220](https://github.com/tldraw/tldraw/pull/3220) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/store`
  - undo devFreeze unintentional commit [#3466](https://github.com/tldraw/tldraw/pull/3466) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix typo. [#3306](https://github.com/tldraw/tldraw/pull/3306) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Don't double squash [#3182](https://github.com/tldraw/tldraw/pull/3182) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Stickies: release candidate [#3249](https://github.com/tldraw/tldraw/pull/3249) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo) [@TodePond](https://github.com/TodePond) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`
  - Improve hand dragging with long press [#3432](https://github.com/tldraw/tldraw/pull/3432) ([@steveruizok](https://github.com/steveruizok))
  - Perf: (slightly) faster min dist checks [#3401](https://github.com/tldraw/tldraw/pull/3401) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/utils`
  - Perf: slightly faster `getShapeAtPoint` [#3416](https://github.com/tldraw/tldraw/pull/3416) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`, `@tldraw/tlschema`
  - Add white migration [#3334](https://github.com/tldraw/tldraw/pull/3334) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `tldraw`
  - Fix blur bug in editable text [#3343](https://github.com/tldraw/tldraw/pull/3343) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - Input buffering [#3223](https://github.com/tldraw/tldraw/pull/3223) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Fix lag while panning + translating at the same time [#3186](https://github.com/tldraw/tldraw/pull/3186) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- `tldraw`, `@tldraw/tlschema`
  - Add white [#3321](https://github.com/tldraw/tldraw/pull/3321) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - use native structuredClone on node, cloudflare workers, and in tests [#3166](https://github.com/tldraw/tldraw/pull/3166) ([@si14](https://github.com/si14))
- `@tldraw/editor`, `@tldraw/state`
  - [perf] Reinstate render throttling [#3160](https://github.com/tldraw/tldraw/pull/3160) ([@ds300](https://github.com/ds300))

#### 🖥️ tldraw.com Changes

- fix document name alignment [#3559](https://github.com/tldraw/tldraw/pull/3559) ([@SomeHats](https://github.com/SomeHats))
- Fix version [#3521](https://github.com/tldraw/tldraw/pull/3521) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Only show cursor chat button in select mode [#3485](https://github.com/tldraw/tldraw/pull/3485) ([@TodePond](https://github.com/TodePond))
- Allow users to edit the document title by double clicking it even when editing a shape. [#3459](https://github.com/tldraw/tldraw/pull/3459) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix cursor chat in context menu. [#3435](https://github.com/tldraw/tldraw/pull/3435) ([@steveruizok](https://github.com/steveruizok))
- Update romanian translations [#3269](https://github.com/tldraw/tldraw/pull/3269) ([@TodePond](https://github.com/TodePond))
- fix document name overflow [#3263](https://github.com/tldraw/tldraw/pull/3263) ([@SomeHats](https://github.com/SomeHats))
- top bar design tweaks [#3205](https://github.com/tldraw/tldraw/pull/3205) ([@SomeHats](https://github.com/SomeHats))
- Update the document title to include the document name. [#3197](https://github.com/tldraw/tldraw/pull/3197) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Remove access token logic. [#3187](https://github.com/tldraw/tldraw/pull/3187) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [sync] allow connections from v4 clients [#3173](https://github.com/tldraw/tldraw/pull/3173) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - Enable document name [#3150](https://github.com/tldraw/tldraw/pull/3150) ([@ds300](https://github.com/ds300))

#### 📖 Documentation changes

- Add releases section to docs [#3564](https://github.com/tldraw/tldraw/pull/3564) ([@SomeHats](https://github.com/SomeHats))
- conditionally use star-history dark theme [#3461](https://github.com/tldraw/tldraw/pull/3461) ([@sunnyzanchi](https://github.com/sunnyzanchi))
- Update font import URL in quick-start.mdx [#3430](https://github.com/tldraw/tldraw/pull/3430) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Examples: update kbd shortcuts, add actions overrides example [#3330](https://github.com/tldraw/tldraw/pull/3330) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Tool with child states [#3074](https://github.com/tldraw/tldraw/pull/3074) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Add inline behaviour example [#3113](https://github.com/tldraw/tldraw/pull/3113) ([@TodePond](https://github.com/TodePond))
- docs: make header fixed instead of sticky [#3228](https://github.com/tldraw/tldraw/pull/3228) ([@mimecuvalo](https://github.com/mimecuvalo))
- fix docs slugs [#3227](https://github.com/tldraw/tldraw/pull/3227) ([@SomeHats](https://github.com/SomeHats))
- docs: work around browser bug with input+scrolling [#3209](https://github.com/tldraw/tldraw/pull/3209) ([@mimecuvalo](https://github.com/mimecuvalo))
- PDF editor example [#3159](https://github.com/tldraw/tldraw/pull/3159) ([@SomeHats](https://github.com/SomeHats))
- fix docs build [#3201](https://github.com/tldraw/tldraw/pull/3201) ([@ds300](https://github.com/ds300))
- [example] culling [#3174](https://github.com/tldraw/tldraw/pull/3174) ([@steveruizok](https://github.com/steveruizok))
- Fix release eliding [#3156](https://github.com/tldraw/tldraw/pull/3156) ([@ds300](https://github.com/ds300))
- [docs] Sync docs deploy with npm deploy [#3153](https://github.com/tldraw/tldraw/pull/3153) ([@ds300](https://github.com/ds300))
- Updated exploded example link from installation page. [#3138](https://github.com/tldraw/tldraw/pull/3138) ([@Kesavaraja](https://github.com/Kesavaraja))
- Make the custom menu examples a bit clearer [#3106](https://github.com/tldraw/tldraw/pull/3106) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Custom renderer example [#3091](https://github.com/tldraw/tldraw/pull/3091) ([@steveruizok](https://github.com/steveruizok))
- Shape with Migrations [#3078](https://github.com/tldraw/tldraw/pull/3078) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Fix typo [#3069](https://github.com/tldraw/tldraw/pull/3069) ([@calebeby](https://github.com/calebeby))
- Add custom tool examples [#3064](https://github.com/tldraw/tldraw/pull/3064) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix broken link for shape example [#3046](https://github.com/tldraw/tldraw/pull/3046) ([@lorenzolewis](https://github.com/lorenzolewis))
- Custom shape examples [#2994](https://github.com/tldraw/tldraw/pull/2994) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Example of using tldraw styles [#3017](https://github.com/tldraw/tldraw/pull/3017) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Add slides example [#3467](https://github.com/tldraw/tldraw/pull/3467) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@TodePond](https://github.com/TodePond))
  - side effects reference docs & examples [#3258](https://github.com/tldraw/tldraw/pull/3258) ([@SomeHats](https://github.com/SomeHats))
  - fix docs not building due to typo [#3259](https://github.com/tldraw/tldraw/pull/3259) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/store`
  - Fix typo in Store.ts [#3385](https://github.com/tldraw/tldraw/pull/3385) ([@OrionReed](https://github.com/OrionReed))
- `tldraw`
  - docs: fix missing API entries [#3111](https://github.com/tldraw/tldraw/pull/3111) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`
  - Fix typo in useValue comment [#3088](https://github.com/tldraw/tldraw/pull/3088) ([@Slowhand0309](https://github.com/Slowhand0309))

#### 🏠 Internal

- Fix deploy script [#3550](https://github.com/tldraw/tldraw/pull/3550) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [internal] Add license report scripts [#2751](https://github.com/tldraw/tldraw/pull/2751) ([@steveruizok](https://github.com/steveruizok))
- [chore] Bump browser-fs-access. [#3277](https://github.com/tldraw/tldraw/pull/3277) ([@steveruizok](https://github.com/steveruizok))
- log message size in worker analytics [#3274](https://github.com/tldraw/tldraw/pull/3274) ([@SomeHats](https://github.com/SomeHats))
- Add yarn immutable check to pre-commit. [#3218](https://github.com/tldraw/tldraw/pull/3218) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- tooling: prettier ignore pr template [#3210](https://github.com/tldraw/tldraw/pull/3210) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add release docs [#3158](https://github.com/tldraw/tldraw/pull/3158) ([@ds300](https://github.com/ds300))
- Simplify tlsync types [#3139](https://github.com/tldraw/tldraw/pull/3139) ([@si14](https://github.com/si14))
- [DX] PR labels revamp [#3112](https://github.com/tldraw/tldraw/pull/3112) ([@ds300](https://github.com/ds300))
- Restore export menu content [#3126](https://github.com/tldraw/tldraw/pull/3126) ([@steveruizok](https://github.com/steveruizok))
- Don't import package.json in scripts/refresh-assets.ts, just read it [#3116](https://github.com/tldraw/tldraw/pull/3116) ([@si14](https://github.com/si14))
- [dx] Allow vscode to search inside md files by default [#3105](https://github.com/tldraw/tldraw/pull/3105) ([@ds300](https://github.com/ds300))
- Debounce/aggregate tlsync messages [#3012](https://github.com/tldraw/tldraw/pull/3012) ([@si14](https://github.com/si14))
- [infra] Fix patch release script [#3095](https://github.com/tldraw/tldraw/pull/3095) ([@ds300](https://github.com/ds300))
- [infra] Patch release scripting [#3072](https://github.com/tldraw/tldraw/pull/3072) ([@ds300](https://github.com/ds300))
- Shorten url state [#3041](https://github.com/tldraw/tldraw/pull/3041) ([@steveruizok](https://github.com/steveruizok))
- Fix cursor chat bubble position. [#3042](https://github.com/tldraw/tldraw/pull/3042) ([@steveruizok](https://github.com/steveruizok))
- Configure dependabot. [#2980](https://github.com/tldraw/tldraw/pull/2980) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [infra] fix canary dist tag [#3048](https://github.com/tldraw/tldraw/pull/3048) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - Use computed cache for getting the parent child relationships [#3508](https://github.com/tldraw/tldraw/pull/3508) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Perf: Improve perf of `getCurrentPageShapesSorted` [#3453](https://github.com/tldraw/tldraw/pull/3453) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Only run when shapes change. [#3456](https://github.com/tldraw/tldraw/pull/3456) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Reorder dom elements. [#3431](https://github.com/tldraw/tldraw/pull/3431) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - fix export preview size [#3264](https://github.com/tldraw/tldraw/pull/3264) ([@SomeHats](https://github.com/SomeHats))
  - A few more async routes [#3023](https://github.com/tldraw/tldraw/pull/3023) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - Fix culling. [#3504](https://github.com/tldraw/tldraw/pull/3504) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Revert "RBush again? (#3439)" [#3481](https://github.com/tldraw/tldraw/pull/3481) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - RBush again? [#3439](https://github.com/tldraw/tldraw/pull/3439) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [culling] Improve setting of display none. [#3376](https://github.com/tldraw/tldraw/pull/3376) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/state`
  - Revert "[perf] faster signia capture (#3471)" [#3480](https://github.com/tldraw/tldraw/pull/3480) ([@ds300](https://github.com/ds300))
- `@tldraw/utils`
  - Add two simple perf helpers. [#3399](https://github.com/tldraw/tldraw/pull/3399) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Display none for culled shapes [#3291](https://github.com/tldraw/tldraw/pull/3291) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `tldraw`
  - Revert perf changes [#3217](https://github.com/tldraw/tldraw/pull/3217) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - Remove namespaced-tldraw/tldraw.css [#3068](https://github.com/tldraw/tldraw/pull/3068) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tlschema`
  - Remove dependabot config since it only controls version updates? [#3057](https://github.com/tldraw/tldraw/pull/3057) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fixes

- VS Code 2.0.30 [#3519](https://github.com/tldraw/tldraw/pull/3519) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [hotfix] Panning fix for VS Code [#3452](https://github.com/tldraw/tldraw/pull/3452) (huppy+SomeHats@tldraw.com huppy+ds300@tldraw.com [@SomeHats](https://github.com/SomeHats) [@web-flow](https://github.com/web-flow) huppy+mimecuvalo@tldraw.com [@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300) huppy+steveruizok@tldraw.com)
- Fix viewport params for pages. [#3079](https://github.com/tldraw/tldraw/pull/3079) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Better websocket reconnection handling [#2960](https://github.com/tldraw/tldraw/pull/2960) ([@si14](https://github.com/si14) [@ds300](https://github.com/ds300))
- Lokalise: Translations update [#3049](https://github.com/tldraw/tldraw/pull/3049) ([@TodePond](https://github.com/TodePond))
- `@tldraw/assets`, `@tldraw/editor`, `tldraw`
  - ui: make toasts look more toasty [#2988](https://github.com/tldraw/tldraw/pull/2988) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/state`
  - Revert throttling of useValue and useStateTracking. [#3129](https://github.com/tldraw/tldraw/pull/3129) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`, `@tldraw/utils`
  - chore: cleanup multiple uses of FileReader [#3110](https://github.com/tldraw/tldraw/pull/3110) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - [fix] Rotated crop handle [#3093](https://github.com/tldraw/tldraw/pull/3093) ([@steveruizok](https://github.com/steveruizok))
  - Fix an issue where the video size was not drawn correctly [#3047](https://github.com/tldraw/tldraw/pull/3047) ([@bubweiser](https://github.com/bubweiser) [@steveruizok](https://github.com/steveruizok))
  - [fix] Input tags [#3038](https://github.com/tldraw/tldraw/pull/3038) ([@steveruizok](https://github.com/steveruizok))
  - [terrible] Firefox: Allow scrolling on keyboard shortcuts dialog [#2974](https://github.com/tldraw/tldraw/pull/2974) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [fix] Missing element crash (rare) on video shapes. [#3037](https://github.com/tldraw/tldraw/pull/3037) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - Fix validation errors for `duplicateProps` [#3065](https://github.com/tldraw/tldraw/pull/3065) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - children: any -> children: ReactNode [#3061](https://github.com/tldraw/tldraw/pull/3061) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - Wrap local/session storage calls in try/catch (take 2) [#3066](https://github.com/tldraw/tldraw/pull/3066) ([@SomeHats](https://github.com/SomeHats))
  - Revert "Protect local storage calls (#3043)" [#3063](https://github.com/tldraw/tldraw/pull/3063) ([@SomeHats](https://github.com/SomeHats))
  - Protect local storage calls [#3043](https://github.com/tldraw/tldraw/pull/3043) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Expose `getStyleForNextShape` [#3039](https://github.com/tldraw/tldraw/pull/3039) ([@steveruizok](https://github.com/steveruizok))
  - [bugfix] Avoid randomness at init time to allow running on cloudflare. [#3016](https://github.com/tldraw/tldraw/pull/3016) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`, `tldraw`
  - Show a broken image for files without assets [#2990](https://github.com/tldraw/tldraw/pull/2990) ([@steveruizok](https://github.com/steveruizok))

#### 🧹 Chores

- VS Code 2.0.29 [#3515](https://github.com/tldraw/tldraw/pull/3515) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code 2.0.27 [#3442](https://github.com/tldraw/tldraw/pull/3442) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code 2.0.26 [#3148](https://github.com/tldraw/tldraw/pull/3148) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🧪 Tests

- attempted fix of a flaky ClientWebSocketAdapter test [#3114](https://github.com/tldraw/tldraw/pull/3114) ([@si14](https://github.com/si14))
- `@tldraw/editor`
  - Add tests for Vec.Average [#3071](https://github.com/tldraw/tldraw/pull/3071) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tlschema`
  - [fix] Routes check on e2e tests [#3022](https://github.com/tldraw/tldraw/pull/3022) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Bump the npm_and_yarn group across 1 directory with 2 updates [#3505](https://github.com/tldraw/tldraw/pull/3505) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Bump the npm_and_yarn group across 1 directory with 2 updates [#3443](https://github.com/tldraw/tldraw/pull/3443) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump the npm_and_yarn group across 1 directory with 1 update [#3348](https://github.com/tldraw/tldraw/pull/3348) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump the npm_and_yarn group across 1 directory with 2 updates [#3304](https://github.com/tldraw/tldraw/pull/3304) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@github-actions[bot]](https://github.com/github-actions[bot]) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Bump the npm_and_yarn group across 1 directory with 2 updates [#3165](https://github.com/tldraw/tldraw/pull/3165) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### Authors: 23

- [@dependabot[bot]](https://github.com/dependabot[bot])
- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Caleb Eby ([@calebeby](https://github.com/calebeby))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- ds300 (huppy+ds300@tldraw.com)
- GitHub Web Flow ([@web-flow](https://github.com/web-flow))
- hirano ([@bubweiser](https://github.com/bubweiser))
- Kesavaraja Krishnan ([@Kesavaraja](https://github.com/Kesavaraja))
- Lorenzo Lewis ([@lorenzolewis](https://github.com/lorenzolewis))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- mimecuvalo (huppy+mimecuvalo@tldraw.com)
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orion Reed ([@OrionReed](https://github.com/OrionReed))
- Slowhand ([@Slowhand0309](https://github.com/Slowhand0309))
- SomeHats (huppy+SomeHats@tldraw.com)
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- steveruizok (huppy+steveruizok@tldraw.com)
- Sunny Zanchi ([@sunnyzanchi](https://github.com/sunnyzanchi))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- `@tldraw/tldraw`, `tldraw`
  - updatereadmes ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- `@tldraw/tldraw`
  - Update readmes / docs for 2.0 [#3011](https://github.com/tldraw/tldraw/pull/3011) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.9 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- allow changes ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`
  - fix refresh-assets cache inputs ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.8 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- `@tldraw/editor`, `tldraw`
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

- `@tldraw/editor`, `tldraw`
  - Fix publish script one more time [#3010](https://github.com/tldraw/tldraw/pull/3010) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.6 (Thu Feb 29 2024)

### Release Notes

#### fix setAllVersions ([#3009](https://github.com/tldraw/tldraw/pull/3009))

- Add a brief release note for your PR here.

#### Fix publishing scripts ([#3008](https://github.com/tldraw/tldraw/pull/3008))

- Add a brief release note for your PR here.

---

#### 🏠 Internal

- fix setAllVersions [#3009](https://github.com/tldraw/tldraw/pull/3009) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`
  - Fix publishing scripts [#3008](https://github.com/tldraw/tldraw/pull/3008) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.5 (Thu Feb 29 2024)

### Release Notes

#### fix publishing scripts ([#3006](https://github.com/tldraw/tldraw/pull/3006))

- Add a brief release note for your PR here.

#### tldraw_final_v6_final(old version).docx.pdf ([#2998](https://github.com/tldraw/tldraw/pull/2998))

- The `@tldraw/tldraw` package has been renamed to `tldraw`. You can keep using the old version if you want though!

#### Don't add editor / app to window. ([#2995](https://github.com/tldraw/tldraw/pull/2995))

- Remove `window.editor` and `window.app` references to editor.

#### Adding a single E2E test per menu ([#2954](https://github.com/tldraw/tldraw/pull/2954))

- Add a brief release note for your PR here.

#### unbork publish-new ([#2999](https://github.com/tldraw/tldraw/pull/2999))

- Add a brief release note for your PR here.

#### Implement new package publish process ([#2996](https://github.com/tldraw/tldraw/pull/2996))

- Add a brief release note for your PR here.

#### [feature] wrap mode ([#2938](https://github.com/tldraw/tldraw/pull/2938))

- Added `isWrapMode` to user preferences.
- Added Wrap Mode toggle to user preferences menu.

#### Don't allow edge scrolling when camera is frozen. ([#2992](https://github.com/tldraw/tldraw/pull/2992))

- Don't allow edge scrolling when camera is frozen.

#### Setup papercuts ([#2987](https://github.com/tldraw/tldraw/pull/2987))

- Add a brief release note for your PR here.

#### Add external dialog example ([#2887](https://github.com/tldraw/tldraw/pull/2887))

- Dev: Added an example for dialogs that go outside the component.

#### fix document name overlapping people menu ([#2970](https://github.com/tldraw/tldraw/pull/2970))

- Fix people menu overlapping with document name when it grew too large.

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

#### [fix] Corejs imports ([#2940](https://github.com/tldraw/tldraw/pull/2940))

- Fixes a bug effecting some users related to corejs imports.

#### Add example for external UI ([#2846](https://github.com/tldraw/tldraw/pull/2846))

- Docs: Added external UI example.

#### Remove template references ([#2919](https://github.com/tldraw/tldraw/pull/2919))

- changes the doc site so it no longer references the site template

#### Fix keyboard shortcuts bugs ([#2936](https://github.com/tldraw/tldraw/pull/2936))

- [Fix] Keyboard shortcut focus bug

#### E2E Style Panel Tests ([#2878](https://github.com/tldraw/tldraw/pull/2878))

- Add style panel E2E tests

#### Fix undo/redo for Opacity Slider + Style dropdowns. ([#2933](https://github.com/tldraw/tldraw/pull/2933))

- Fixed issues where undo/redo entries were not being set up correctly for the opacity slider or the style dropdown menus.

#### Add custom static assets example, extract preloadFont ([#2932](https://github.com/tldraw/tldraw/pull/2932))

- Docs, added custom static assets example.

#### Fix frames not preserving shape order ([#2928](https://github.com/tldraw/tldraw/pull/2928))

- Fix an issue when framing shapes did not preserve the original order of the shapes.
- You can now frame shapes inside of the frame.

#### Bounds snapping shape ([#2909](https://github.com/tldraw/tldraw/pull/2909))

- Adds a custom bounds snapping shape

#### Improve dialog appearance on small components ([#2884](https://github.com/tldraw/tldraw/pull/2884))

- Dev: Made default dialogs work better when used in small components.

#### Better example intros ([#2912](https://github.com/tldraw/tldraw/pull/2912))

- Adds more info to the examples section of the docs.

#### docs: add star history and contributor list to README. ([#2914](https://github.com/tldraw/tldraw/pull/2914))

add star history and contributor list to README.

<img width="854" alt="image" src="https://github.com/tldraw/tldraw/assets/42437658/d0c73289-9fb1-4dc0-882a-0593ebc13895">


- Increases project transparency: This can help other developers understand the popularity and activity level of the project.

- Recognizes contributors: Listing contributors can recognize those who have contributed to the project, which may also motivate more people to participate in the project.

- Provides more information: The star history chart and contributor list provide more information for potential users or contributors, helping them make decisions about whether to use or participate in the project.

- Enhances the project's professionalism: A detailed README file can enhance the professionalism of the

---

#### 💥 Breaking Change

- `@tldraw/editor`
  - Don't add editor / app to window. [#2995](https://github.com/tldraw/tldraw/pull/2995) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- `@tldraw/editor`, `tldraw`
  - [feature] wrap mode [#2938](https://github.com/tldraw/tldraw/pull/2938) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Make exportToBlob public [#2983](https://github.com/tldraw/tldraw/pull/2983) ([@ds300](https://github.com/ds300))
  - export default ui items [#2973](https://github.com/tldraw/tldraw/pull/2973) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Fix keyboard shortcuts bugs [#2936](https://github.com/tldraw/tldraw/pull/2936) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
  - Add custom static assets example, extract preloadFont [#2932](https://github.com/tldraw/tldraw/pull/2932) ([@steveruizok](https://github.com/steveruizok))
  - Export history hooks [#2926](https://github.com/tldraw/tldraw/pull/2926) ([@steveruizok](https://github.com/steveruizok))
  - Improve dialog appearance on small components [#2884](https://github.com/tldraw/tldraw/pull/2884) ([@TodePond](https://github.com/TodePond))

#### 🐛 Bug Fix

- husky: add +x chmod flag [#2986](https://github.com/tldraw/tldraw/pull/2986) ([@mimecuvalo](https://github.com/mimecuvalo))
- fix document name overlapping people menu [#2970](https://github.com/tldraw/tldraw/pull/2970) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- docs: Adjust max columns of contributor list in README. [#2917](https://github.com/tldraw/tldraw/pull/2917) ([@wangrongding](https://github.com/wangrongding))
- VS Code 2.0.25 [#2911](https://github.com/tldraw/tldraw/pull/2911) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - textfields: make them consistent [#2984](https://github.com/tldraw/tldraw/pull/2984) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Show toast on upload error [#2959](https://github.com/tldraw/tldraw/pull/2959) ([@ds300](https://github.com/ds300))
  - menu: export followup with different semantics for file menu [#2968](https://github.com/tldraw/tldraw/pull/2968) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix transparency toggle [#2964](https://github.com/tldraw/tldraw/pull/2964) ([@ds300](https://github.com/ds300))
  - menu: rework File menu / ensure Export menu is present [#2783](https://github.com/tldraw/tldraw/pull/2783) ([@mimecuvalo](https://github.com/mimecuvalo))
  - ui events: prevent sending 2nd event unnecessarily [#2921](https://github.com/tldraw/tldraw/pull/2921) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [fix] fit to content shown on groups [#2946](https://github.com/tldraw/tldraw/pull/2946) ([@steveruizok](https://github.com/steveruizok))
  - Fix frames not preserving shape order [#2928](https://github.com/tldraw/tldraw/pull/2928) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Don't allow edge scrolling when camera is frozen. [#2992](https://github.com/tldraw/tldraw/pull/2992) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - migrate shapes / assets as a store on `putContent` [#2971](https://github.com/tldraw/tldraw/pull/2971) ([@steveruizok](https://github.com/steveruizok))
  - [fix] double spinner [#2963](https://github.com/tldraw/tldraw/pull/2963) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Corejs imports [#2940](https://github.com/tldraw/tldraw/pull/2940) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Setup papercuts [#2987](https://github.com/tldraw/tldraw/pull/2987) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Prevent iframe embedding for dotcom (except on tldraw.com) [#2947](https://github.com/tldraw/tldraw/pull/2947) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - Expand props [#2948](https://github.com/tldraw/tldraw/pull/2948) ([@steveruizok](https://github.com/steveruizok))
  - Fix undo/redo for Opacity Slider + Style dropdowns. [#2933](https://github.com/tldraw/tldraw/pull/2933) ([@ds300](https://github.com/ds300))
- `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`
  - fix structured clone reference in drawing [#2945](https://github.com/tldraw/tldraw/pull/2945) ([@steveruizok](https://github.com/steveruizok))

#### ⚠️ Pushed to `main`

- better name for publish-new ([@ds300](https://github.com/ds300))
- remove dry run early return ([@ds300](https://github.com/ds300))
- better error message in publish-new.yml ([@ds300](https://github.com/ds300))
- fix error logging in publish-now.yml ([@ds300](https://github.com/ds300))
- fix bash thing ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- fix publishing scripts [#3006](https://github.com/tldraw/tldraw/pull/3006) ([@ds300](https://github.com/ds300))
- unbork "unbork publish-new" [#3003](https://github.com/tldraw/tldraw/pull/3003) ([@si14](https://github.com/si14))
- unbork publish-new [#2999](https://github.com/tldraw/tldraw/pull/2999) ([@ds300](https://github.com/ds300))
- remove yarn stuff from the templates and ignore it [#2997](https://github.com/tldraw/tldraw/pull/2997) ([@si14](https://github.com/si14))
- Implement new package publish process [#2996](https://github.com/tldraw/tldraw/pull/2996) ([@ds300](https://github.com/ds300))
- Use github actions to mirror templates from monorepo to appropriate repos [#2781](https://github.com/tldraw/tldraw/pull/2781) ([@si14](https://github.com/si14) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- tooling: notify team members if package.json/yarn has been updated [#2972](https://github.com/tldraw/tldraw/pull/2972) ([@mimecuvalo](https://github.com/mimecuvalo))
- Open iframe production links in new tab [#2966](https://github.com/tldraw/tldraw/pull/2966) ([@SomeHats](https://github.com/SomeHats))
- [examples] Log out the 'after' values of changes in StoreEventsExample [#2956](https://github.com/tldraw/tldraw/pull/2956) ([@ds300](https://github.com/ds300))
- [dx] Derive vercel routes from react-router config [#2937](https://github.com/tldraw/tldraw/pull/2937) ([@ds300](https://github.com/ds300))
- Update auto [#2952](https://github.com/tldraw/tldraw/pull/2952) ([@ds300](https://github.com/ds300))
- Fix an issue with publishing canary [#2931](https://github.com/tldraw/tldraw/pull/2931) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make Vercel URL rewrites precise [#2913](https://github.com/tldraw/tldraw/pull/2913) ([@si14](https://github.com/si14))
- examples: let people copy out code [#2920](https://github.com/tldraw/tldraw/pull/2920) ([@mimecuvalo](https://github.com/mimecuvalo))
- Lokalise: Translations update [#2908](https://github.com/tldraw/tldraw/pull/2908) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/tldraw`, `tldraw`
  - tldraw_final_v6_final(old version).docx.pdf [#2998](https://github.com/tldraw/tldraw/pull/2998) ([@SomeHats](https://github.com/SomeHats))
- `tldraw`
  - license: make them not be scrubbed out in code munging [#2976](https://github.com/tldraw/tldraw/pull/2976) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 📝 Documentation

- Add external dialog example [#2887](https://github.com/tldraw/tldraw/pull/2887) ([@TodePond](https://github.com/TodePond))
- speech bubble handle -> tail [#2975](https://github.com/tldraw/tldraw/pull/2975) ([@SomeHats](https://github.com/SomeHats))
- [docs] Fix mailtos [#2961](https://github.com/tldraw/tldraw/pull/2961) ([@steveruizok](https://github.com/steveruizok))
- [docs] content [#2958](https://github.com/tldraw/tldraw/pull/2958) ([@steveruizok](https://github.com/steveruizok))
- Add example for external UI [#2846](https://github.com/tldraw/tldraw/pull/2846) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Remove template references [#2919](https://github.com/tldraw/tldraw/pull/2919) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Bounds snapping shape [#2909](https://github.com/tldraw/tldraw/pull/2909) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Better example intros [#2912](https://github.com/tldraw/tldraw/pull/2912) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- docs: add star history and contributor list to README. [#2914](https://github.com/tldraw/tldraw/pull/2914) ([@wangrongding](https://github.com/wangrongding))
- `tldraw`
  - [docs] design shuffle [#2951](https://github.com/tldraw/tldraw/pull/2951) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- E2E Style Panel Tests [#2878](https://github.com/tldraw/tldraw/pull/2878) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Adding a single E2E test per menu [#2954](https://github.com/tldraw/tldraw/pull/2954) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - bump typescript / api-extractor [#2949](https://github.com/tldraw/tldraw/pull/2949) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 9

- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- 荣顶 ([@wangrongding](https://github.com/wangrongding))

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

#### Sentence case all example titles ([#2889](https://github.com/tldraw/tldraw/pull/2889))

- Docs: Made the examples titles sentence case.

#### Fix 'style panel doesn't always disappear if you switch to the hand/laser tools' ([#2886](https://github.com/tldraw/tldraw/pull/2886))

- Fixes an bug causing the opacity slider to show up in the move tool and laser pointer tool.

#### Faster validations + record reference stability at the same time ([#2848](https://github.com/tldraw/tldraw/pull/2848))

- Add a brief release note for your PR here.

#### [Snapping 6/6] Self-snapping API ([#2869](https://github.com/tldraw/tldraw/pull/2869))

- Line handles now snap to other handles on the same line when holding command

#### Editable shape example ([#2853](https://github.com/tldraw/tldraw/pull/2853))

- Adds an editable shape example

#### Fix dialog title styles ([#2873](https://github.com/tldraw/tldraw/pull/2873))

- Unreleased bug: Fixed dialog titles appearance.

#### Fix some incorrect translation keys ([#2870](https://github.com/tldraw/tldraw/pull/2870))

- Unreleased issue. Fixed some translation keys being wrong.

#### Allow users to set document name and use it for exporting / saving ([#2685](https://github.com/tldraw/tldraw/pull/2685))

- Allow users to name their documents.

#### Fix some problem under Windows OS development enviroment ([#2722](https://github.com/tldraw/tldraw/pull/2722))

- stablize language.ts when running under different OS language.
- add isWin32() and posixPath() to format the parameter of glob.sync().
- use child_process.exec() instead of child_process.execFile() for win32 platform.

#### doc: fix typo in examples ([#2859](https://github.com/tldraw/tldraw/pull/2859))

- fix typo in examples

#### [fix] grid, other insets ([#2858](https://github.com/tldraw/tldraw/pull/2858))

- Fixes a bug with the grid not appearing.

#### E2e tests for the toolbar ([#2709](https://github.com/tldraw/tldraw/pull/2709))

- Add e2e tests for the toolbar

#### fix frame style panel ([#2851](https://github.com/tldraw/tldraw/pull/2851))

- Fixes an issue with the opacity slider getting squished.

#### Add component for viewing an image of a snapshot ([#2804](https://github.com/tldraw/tldraw/pull/2804))

- Dev: Added the `TldrawImage` component.

#### fix typo(examples/hosted-images) ([#2849](https://github.com/tldraw/tldraw/pull/2849))

- Fixed a typo in the description in the hosted-images example.

#### ui: refactor breakpoints to fit in an enum ([#2843](https://github.com/tldraw/tldraw/pull/2843))

- Refactor breakpoints into an enum.

#### [Snapping 5/5] Better handle snapping for geo shapes ([#2845](https://github.com/tldraw/tldraw/pull/2845))

- You can now snap the handles of lines to the corners of rectangles, stars, triangles, etc.

#### [Snapping 4/5] Add handle-point snapping ([#2841](https://github.com/tldraw/tldraw/pull/2841))

- Line handles

#### [Snapping 3/5] Custom snapping API ([#2793](https://github.com/tldraw/tldraw/pull/2793))

- Add `ShapeUtil.getSnapInfo` for customising shape snaps.

#### Composable custom UI ([#2796](https://github.com/tldraw/tldraw/pull/2796))

- Add a brief release note for your PR here.

#### errors: improve msg in dialog when error happens ([#2844](https://github.com/tldraw/tldraw/pull/2844))

- Improves error dialog messaging.

#### [Snapping 2/5] Fix line-handle mid-point snapping ([#2831](https://github.com/tldraw/tldraw/pull/2831))

- Simplify the contents of `TLLineShape.props.handles`

#### Readonly defaults to the hand tool ([#2833](https://github.com/tldraw/tldraw/pull/2833))

- Shared projects in  read only mode now default to the hand tool

#### Improve signia error handling ([#2835](https://github.com/tldraw/tldraw/pull/2835))

- Add a brief release note for your PR here.

#### [docs] Fix missing Persistence page ([#2828](https://github.com/tldraw/tldraw/pull/2828))

- Add a brief release note for your PR here.

#### emojis! 🧑‍🎨 🎨 ✏️ ([#2814](https://github.com/tldraw/tldraw/pull/2814))

- Adds emoji picker to text fields.

---

#### 💥 Breaking Change

- `@tldraw/tldraw`, `@tldraw/tlschema`
  - Add line IDs & fractional indexes [#2890](https://github.com/tldraw/tldraw/pull/2890) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Allow users to set document name and use it for exporting / saving [#2685](https://github.com/tldraw/tldraw/pull/2685) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - UI components round two [#2847](https://github.com/tldraw/tldraw/pull/2847) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/validate`
  - Composable custom UI [#2796](https://github.com/tldraw/tldraw/pull/2796) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [Snapping 2/5] Fix line-handle mid-point snapping [#2831](https://github.com/tldraw/tldraw/pull/2831) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- Readonly defaults to the hand tool [#2833](https://github.com/tldraw/tldraw/pull/2833) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [Snapping 6/6] Self-snapping API [#2869](https://github.com/tldraw/tldraw/pull/2869) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
  - Add component for viewing an image of a snapshot [#2804](https://github.com/tldraw/tldraw/pull/2804) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [Snapping 4/5] Add handle-point snapping [#2841](https://github.com/tldraw/tldraw/pull/2841) ([@SomeHats](https://github.com/SomeHats))
  - [Snapping 3/5] Custom snapping API [#2793](https://github.com/tldraw/tldraw/pull/2793) ([@SomeHats](https://github.com/SomeHats))
  - emojis! 🧑‍🎨 🎨 ✏️ [#2814](https://github.com/tldraw/tldraw/pull/2814) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - [handles] Line shape handles -> points [#2856](https://github.com/tldraw/tldraw/pull/2856) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - [Snapping 5/5] Better handle snapping for geo shapes [#2845](https://github.com/tldraw/tldraw/pull/2845) ([@SomeHats](https://github.com/SomeHats))
  - Remove pointer check for arrow labels [#2824](https://github.com/tldraw/tldraw/pull/2824) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - Lokalise: Translations update [#2830](https://github.com/tldraw/tldraw/pull/2830) ([@TodePond](https://github.com/TodePond) [@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fix

- fix invite others [#2904](https://github.com/tldraw/tldraw/pull/2904) ([@SomeHats](https://github.com/SomeHats))
- Update Hungarian and Korean [#2871](https://github.com/tldraw/tldraw/pull/2871) ([@TodePond](https://github.com/TodePond))
- docs: tweak search kbd placement to match loupe [#2834](https://github.com/tldraw/tldraw/pull/2834) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/tldraw`
  - menu fixes: add company links in general; add tracking to lang menu [#2902](https://github.com/tldraw/tldraw/pull/2902) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix some menu issues on mobile [#2906](https://github.com/tldraw/tldraw/pull/2906) ([@TodePond](https://github.com/TodePond))
  - remove stray 'console' [#2881](https://github.com/tldraw/tldraw/pull/2881) ([@ds300](https://github.com/ds300))
  - Fix dialog title styles [#2873](https://github.com/tldraw/tldraw/pull/2873) ([@TodePond](https://github.com/TodePond))
  - Fix some incorrect translation keys [#2870](https://github.com/tldraw/tldraw/pull/2870) ([@TodePond](https://github.com/TodePond))
  - fix frame style panel [#2851](https://github.com/tldraw/tldraw/pull/2851) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - ui: refactor breakpoints to fit in an enum [#2843](https://github.com/tldraw/tldraw/pull/2843) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/validate`
  - Fix object validator [#2897](https://github.com/tldraw/tldraw/pull/2897) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [experiment] paste: show little puff when pasting to denote something happened [#2787](https://github.com/tldraw/tldraw/pull/2787) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Fix 'style panel doesn't always disappear if you switch to the hand/laser tools' [#2886](https://github.com/tldraw/tldraw/pull/2886) ([@ds300](https://github.com/ds300))
  - Roundup fixes [#2862](https://github.com/tldraw/tldraw/pull/2862) ([@steveruizok](https://github.com/steveruizok))
  - [fix] grid, other insets [#2858](https://github.com/tldraw/tldraw/pull/2858) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/validate`
  - Faster validations + record reference stability at the same time [#2848](https://github.com/tldraw/tldraw/pull/2848) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - [fix] pointer capture logging when debug flag is off [#2850](https://github.com/tldraw/tldraw/pull/2850) ([@steveruizok](https://github.com/steveruizok))
  - errors: improve msg in dialog when error happens [#2844](https://github.com/tldraw/tldraw/pull/2844) ([@mimecuvalo](https://github.com/mimecuvalo))
  - seo: take 2 [#2817](https://github.com/tldraw/tldraw/pull/2817) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - [fix] sticky note bug [#2836](https://github.com/tldraw/tldraw/pull/2836) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - [Snapping 1/5] Validation & strict types for fractional indexes [#2827](https://github.com/tldraw/tldraw/pull/2827) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/state`
  - Improve signia error handling [#2835](https://github.com/tldraw/tldraw/pull/2835) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- Fix some problem under Windows OS development enviroment [#2722](https://github.com/tldraw/tldraw/pull/2722) ([@Rokixy](https://github.com/Rokixy))
- fix typo(examples/hosted-images) [#2849](https://github.com/tldraw/tldraw/pull/2849) ([@pocari](https://github.com/pocari))
- ✋ humans.txt [#2842](https://github.com/tldraw/tldraw/pull/2842) ([@mimecuvalo](https://github.com/mimecuvalo))
- examples: rename ui events and increase priority [#2840](https://github.com/tldraw/tldraw/pull/2840) ([@mimecuvalo](https://github.com/mimecuvalo))
- repair Huppy's handling of LICENCE [#2821](https://github.com/tldraw/tldraw/pull/2821) ([@si14](https://github.com/si14))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/validate`
  - Check tsconfig "references" arrays [#2891](https://github.com/tldraw/tldraw/pull/2891) ([@ds300](https://github.com/ds300))
- `@tldraw/tldraw`
  - Fix custom keyboard shortcut dialog example [#2876](https://github.com/tldraw/tldraw/pull/2876) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - dev: swap yarn test and test-dev for better dx [#2773](https://github.com/tldraw/tldraw/pull/2773) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Revert "emojis! 🧑‍🎨 🎨 ✏️ (#2814)" [#2822](https://github.com/tldraw/tldraw/pull/2822) ([@si14](https://github.com/si14))

#### 📝 Documentation

- Sentence case all example titles [#2889](https://github.com/tldraw/tldraw/pull/2889) ([@TodePond](https://github.com/TodePond))
- docs: fix scroll position and theming issue for code snippets [#2883](https://github.com/tldraw/tldraw/pull/2883) ([@mimecuvalo](https://github.com/mimecuvalo))
- Editable shape example [#2853](https://github.com/tldraw/tldraw/pull/2853) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- doc: fix typo in examples [#2859](https://github.com/tldraw/tldraw/pull/2859) ([@Rokixy](https://github.com/Rokixy))
- [docs] Fix missing Persistence page [#2828](https://github.com/tldraw/tldraw/pull/2828) ([@ds300](https://github.com/ds300))

#### 🧪 Tests

- `@tldraw/tldraw`
  - E2e tests for the toolbar [#2709](https://github.com/tldraw/tldraw/pull/2709) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### Authors: 10

- [@Rokixy](https://github.com/Rokixy)
- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- pocari ([@pocari](https://github.com/pocari))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.3 (Tue Feb 13 2024)

### Release Notes

#### Fix camera. ([#2818](https://github.com/tldraw/tldraw/pull/2818))

- Fixes an issue with the camera and zooming.

#### Use canvas bounds for viewport bounds ([#2798](https://github.com/tldraw/tldraw/pull/2798))

- Changes the source of truth for the viewport page bounds to be the canvas instead.

#### docs: better code snippets ([#2801](https://github.com/tldraw/tldraw/pull/2801))

- Docs: reworks code snippets

#### Quick start guide ([#2692](https://github.com/tldraw/tldraw/pull/2692))

- Add a quick start guide

#### docs: fix scrolling issue with sidebar ([#2791](https://github.com/tldraw/tldraw/pull/2791))

- Docs: fix up scrolling.

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

#### docs: disable ai search for now ([#2740](https://github.com/tldraw/tldraw/pull/2740))

- Docs: disable AI search for now.

#### seo: attempt at avoiding a "soft 404" with there being thin content on dotcom ([#2737](https://github.com/tldraw/tldraw/pull/2737))

- Add a "Loading..." text to help SEO.

#### docs: add full-text search ([#2735](https://github.com/tldraw/tldraw/pull/2735))

- Docs: Add full-text search.

#### docs: fix CORS issue and broken example link ([#2727](https://github.com/tldraw/tldraw/pull/2727))

- Fixes docs CORS issue.

#### docs: rework search UI ([#2723](https://github.com/tldraw/tldraw/pull/2723))

- Docs: rework the search to be an inline dropdown.

#### [fix] VSCode keyboard shortcuts while editing text ([#2721](https://github.com/tldraw/tldraw/pull/2721))

- Fixed a bug in the VS Code that prevented keyboard shortcuts from working in text labels.

#### [Fix] Camera coordinate issues ([#2719](https://github.com/tldraw/tldraw/pull/2719))

- Fixed bugs with `getViewportScreenCenter` that could effect zooming and pinching on editors that aren't full screen

#### fix(docs): fix user-interface.mdx ([#2700](https://github.com/tldraw/tldraw/pull/2700))

Add `newMenuItem` creation in "Toolbar and Menus" example

#### docs: more cleanup following restructure ([#2702](https://github.com/tldraw/tldraw/pull/2702))

- Docs: further cleanup following restructure.

#### reactive context menu overrides ([#2697](https://github.com/tldraw/tldraw/pull/2697))

- Context Menu overrides will now update reactively

#### [Fix] Note shape border radius ([#2696](https://github.com/tldraw/tldraw/pull/2696))

- Fixes a bad border radius

#### arrows: separate out handle behavior from labels ([#2621](https://github.com/tldraw/tldraw/pull/2621))

- Arrow labels: provide more polish on label placement

#### docs: fix up gen links to point to the new /reference section ([#2690](https://github.com/tldraw/tldraw/pull/2690))

- Fix up doc links with /gen links

#### docs: rework docs site to have different sections ([#2686](https://github.com/tldraw/tldraw/pull/2686))

- Rework our docs site to pull together the examples app and reference section more cohesively.

#### Fix svg exporting for images with not fully qualified url (`/tldraw.png` or `./tldraw.png`) ([#2676](https://github.com/tldraw/tldraw/pull/2676))

- Fix the svg export for images that have a local url.

#### Remove examples app landing page ([#2678](https://github.com/tldraw/tldraw/pull/2678))

- Remove examples app landing page

#### dev: add test-dev command for easier testing of packages ([#2627](https://github.com/tldraw/tldraw/pull/2627))

- Adds easier testing command for individual packages.

#### debug: start adding more tooling for debugging when interacting with shapes ([#2560](https://github.com/tldraw/tldraw/pull/2560))

- Adds more information in the debug view about what shape is selected and coordinates.

#### Grouping examples into categories ([#2585](https://github.com/tldraw/tldraw/pull/2585))

- Add collapsible categories to the examples app

#### [Fix] Overlapping non-adjacent handles ([#2663](https://github.com/tldraw/tldraw/pull/2663))

- Fixed a bug with virtual / create handle visibility.

#### [Fix] Missing bend handles on curved arrows ([#2661](https://github.com/tldraw/tldraw/pull/2661))

- Fixed a bug where the bend handle on arrows with a large curve could sometimes be hidden.

#### Improved duplication ([#2480](https://github.com/tldraw/tldraw/pull/2480))

- Add a brief release note for your PR here.

#### Positional keyboard shortcuts for toolbar ([#2409](https://github.com/tldraw/tldraw/pull/2409))

- You can now use the number keys to select the corresponding tool from the toolbar

#### Add button to Examples to request an example ([#2597](https://github.com/tldraw/tldraw/pull/2597))

- Add a button to request an example to the examples app

#### Update README and examples copy in the docs ([#2594](https://github.com/tldraw/tldraw/pull/2594))

- Update examples copy and tldraw README

#### Remove repeated word in CONTRIBUTING.md ([#2651](https://github.com/tldraw/tldraw/pull/2651))

- Remove repeated word in CONTRIBUTING.md.

#### [Fix] Wheel bug ([#2657](https://github.com/tldraw/tldraw/pull/2657))

- Fixed a bug with the mouse wheel effecting the pointer location when the editor was not full screen

#### Update layout.tsx ([#2619](https://github.com/tldraw/tldraw/pull/2619))

- Add a brief release note for your PR here.

#### [Improvement] Share zone styling ([#2628](https://github.com/tldraw/tldraw/pull/2628))

- Tweaked user avatar size.

#### [draft] Keep editor focus after losing focus of an action button ([#2630](https://github.com/tldraw/tldraw/pull/2630))

- Fixed a bug where keyboard shortcuts could stop working after using an action button.

#### Fix nudge bug ([#2634](https://github.com/tldraw/tldraw/pull/2634))

- Fixes a bug with keyboard nudging.

#### menus: address several little big things about menu styling ([#2624](https://github.com/tldraw/tldraw/pull/2624))

- Fixes nits on styling on our Radix menus.

#### i18n: sort languages by name, not by locale code ([#2625](https://github.com/tldraw/tldraw/pull/2625))

- Sorts the locale list by locale name, not code.

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

#### Add context toolbar example. ([#2596](https://github.com/tldraw/tldraw/pull/2596))

- Add context toolbar example.

#### Export TLCommandHistoryOptions type ([#2598](https://github.com/tldraw/tldraw/pull/2598))

- Added TLCommandHistoryOptions to the exported types.

#### [improvement] better comma control for pointer ([#2568](https://github.com/tldraw/tldraw/pull/2568))

- Improve comma key as a replacement for pointer down / pointer up.

#### fix: replaced dead links ([#2567](https://github.com/tldraw/tldraw/pull/2567))

- N/A

#### [dotcom] Delete service worker, cache tldraw assets ([#2552](https://github.com/tldraw/tldraw/pull/2552))

- Fix 'could not load assets' error that we often see on tldraw.com after a deploy

#### Allow snapping of shapes to the frame when dragging inside the frame. ([#2520](https://github.com/tldraw/tldraw/pull/2520))

- Adds snapping to frames when dragging shapes inside a frame.

#### Allow dismissing dialogs by clicking backdrop ([#2497](https://github.com/tldraw/tldraw/pull/2497))

- Allows dismissing dialogs by clicking the backdrop.

#### Fix the first run of dev script. ([#2484](https://github.com/tldraw/tldraw/pull/2484))

- Fix first `yarn dev` experience.

#### Prevent overlay content disappearing at some browser zoom levels ([#2483](https://github.com/tldraw/tldraw/pull/2483))

- removes the internal `useDprMultiple` hook

#### add keyboard shortcuts example ([#2474](https://github.com/tldraw/tldraw/pull/2474))

- Add keyboard shortcuts example

#### [hot take] Make dark mode colours pop more ([#2478](https://github.com/tldraw/tldraw/pull/2478))

- Tweaked dark mode colour styles to make them pop more.

#### fix typo in hideRotateHandle method ([#2473](https://github.com/tldraw/tldraw/pull/2473))

- fix typo in hideRotateHandle method

#### Maintain bindings whilst translating arrows ([#2424](https://github.com/tldraw/tldraw/pull/2424))

- You can now move arrows without them becoming unattached the shapes they're pointing to

#### [improvement] update dark mode ([#2468](https://github.com/tldraw/tldraw/pull/2468))

- Updated dark mode colors.

#### rename and annotate user presence example ([#2462](https://github.com/tldraw/tldraw/pull/2462))

- annotate user presence example and rename to presence-record

#### annotate onthecanvas example ([#2459](https://github.com/tldraw/tldraw/pull/2459))

- annotate onthecanvas example

#### annotate snapshot example ([#2454](https://github.com/tldraw/tldraw/pull/2454))

- annotate snapshot example

#### Fix and annotate minimal example ([#2448](https://github.com/tldraw/tldraw/pull/2448))

- Fix and annotate minimal example

#### annotate zones example ([#2461](https://github.com/tldraw/tldraw/pull/2461))

- annotate zones example

#### annotate ui events example ([#2460](https://github.com/tldraw/tldraw/pull/2460))

- annotate ui events example

#### Annotate shape meta data example ([#2453](https://github.com/tldraw/tldraw/pull/2453))

- Annotate shape meta data example

#### Annotate example for using Tldraw component in a scrollable container ([#2452](https://github.com/tldraw/tldraw/pull/2452))

- Annotate example for using Tldraw component in a scrollable container

#### Annotate example for making editor read-only ([#2451](https://github.com/tldraw/tldraw/pull/2451))

- Annotate example for making editor read-only

#### Fix typos and add comments for persistence example ([#2450](https://github.com/tldraw/tldraw/pull/2450))

- Fix typos and add comments for persistence example

#### Fix bookmark info for VS Code ([#2449](https://github.com/tldraw/tldraw/pull/2449))

- Fix bookmark image and description for VS code extension.

#### [fix] disable vertical edge resizing for text on mobile ([#2456](https://github.com/tldraw/tldraw/pull/2456))

- Add a brief release note for your PR here.

#### Don't bother measuring canvas max size for small images ([#2442](https://github.com/tldraw/tldraw/pull/2442))

- Android: Sped up exporting and importing images.

#### [Minor] change Simplified Chinese label to Chinese ([#2434](https://github.com/tldraw/tldraw/pull/2434))

- Changed the label for the Simplified Chinese language from `Chinese - Simplified` to `简体中文`, following the convention of other languages.
- Updated the API and relevant documentation through build scripts.

#### annotate external sources example ([#2414](https://github.com/tldraw/tldraw/pull/2414))

- Adds annotation to the external sources example.

#### annotate multiple example ([#2431](https://github.com/tldraw/tldraw/pull/2431))

- annotate multiple example

#### annotate force mobile example ([#2421](https://github.com/tldraw/tldraw/pull/2421))

- annotate force mobile example

#### annotate hosted images example ([#2422](https://github.com/tldraw/tldraw/pull/2422))

- annotate hosted images example

#### annotate local images example ([#2423](https://github.com/tldraw/tldraw/pull/2423))

- annotate local images example

#### Lokalise: Translations update ([#2418](https://github.com/tldraw/tldraw/pull/2418))

- Added Hungarian translations.
- Updated Turkish translations.

#### annotate meta oncreate example ([#2426](https://github.com/tldraw/tldraw/pull/2426))

- annotate meta oncreate example

#### Annotate exploded example ([#2413](https://github.com/tldraw/tldraw/pull/2413))

- Adds annotation to exploded example
- imports all default components instead of just a few

#### annotate hide-ui example ([#2420](https://github.com/tldraw/tldraw/pull/2420))

- Annotate hide ui example

#### Annotate custom ui example ([#2408](https://github.com/tldraw/tldraw/pull/2408))

- Adds annotation to the custom ui example

#### [improvement] account for coarse pointers / insets in edge scrolling ([#2401](https://github.com/tldraw/tldraw/pull/2401))

- Add `instanceState.insets` to track which edges of the component are inset from the edges of the document body.
- Improve behavior around edge scrolling

#### Custom components annotation ([#2403](https://github.com/tldraw/tldraw/pull/2403))

- Annotate the custom components example.

#### annotate meta onchange ([#2430](https://github.com/tldraw/tldraw/pull/2430))

- annotate meta onchange

---

#### 💥 Breaking Change

- `@tldraw/editor`, `@tldraw/tldraw`
  - Use canvas bounds for viewport bounds [#2798](https://github.com/tldraw/tldraw/pull/2798) ([@steveruizok](https://github.com/steveruizok))
  - Remove Geometry2d.isSnappable [#2768](https://github.com/tldraw/tldraw/pull/2768) ([@SomeHats](https://github.com/SomeHats))
  - [Fix] Camera coordinate issues [#2719](https://github.com/tldraw/tldraw/pull/2719) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/utils`
  - Split snap manager into ShapeBoundsSnaps and HandleSnaps [#2747](https://github.com/tldraw/tldraw/pull/2747) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tldraw`, `@tldraw/utils`
  - faster image processing in default asset handler [#2441](https://github.com/tldraw/tldraw/pull/2441) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- docs: rework search UI [#2723](https://github.com/tldraw/tldraw/pull/2723) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - [dx] use Biome instead of Prettier, part 2 [#2731](https://github.com/tldraw/tldraw/pull/2731) ([@si14](https://github.com/si14))
- `@tldraw/assets`, `@tldraw/tlschema`
  - [dx] use Biome instead of Prettier, part 1 [#2729](https://github.com/tldraw/tldraw/pull/2729) ([@si14](https://github.com/si14))
- `@tldraw/tldraw`
  - debug: start adding more tooling for debugging when interacting with shapes [#2560](https://github.com/tldraw/tldraw/pull/2560) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Positional keyboard shortcuts for toolbar [#2409](https://github.com/tldraw/tldraw/pull/2409) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - Improved duplication [#2480](https://github.com/tldraw/tldraw/pull/2480) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`
  - debug: add FPS counter [#2558](https://github.com/tldraw/tldraw/pull/2558) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - [improvement] better comma control for pointer [#2568](https://github.com/tldraw/tldraw/pull/2568) ([@steveruizok](https://github.com/steveruizok))
  - Allow snapping of shapes to the frame when dragging inside the frame. [#2520](https://github.com/tldraw/tldraw/pull/2520) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Maintain bindings whilst translating arrows [#2424](https://github.com/tldraw/tldraw/pull/2424) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
  - [improvement] update dark mode [#2468](https://github.com/tldraw/tldraw/pull/2468) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - arrows: add ability to change label placement [#2557](https://github.com/tldraw/tldraw/pull/2557) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
  - [improvement] account for coarse pointers / insets in edge scrolling [#2401](https://github.com/tldraw/tldraw/pull/2401) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`
  - [dotcom] Delete service worker, cache tldraw assets [#2552](https://github.com/tldraw/tldraw/pull/2552) ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fix

- VS Code 2.0.24 [#2816](https://github.com/tldraw/tldraw/pull/2816) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- menu: just have an empty space for checked menuitems [#2785](https://github.com/tldraw/tldraw/pull/2785) ([@mimecuvalo](https://github.com/mimecuvalo))
- VS Code 2.0.23 [#2756](https://github.com/tldraw/tldraw/pull/2756) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- seo: attempt at avoiding a "soft 404" with there being thin content on dotcom [#2737](https://github.com/tldraw/tldraw/pull/2737) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: add full-text search [#2735](https://github.com/tldraw/tldraw/pull/2735) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: fix up gen links to point to the new /reference section [#2690](https://github.com/tldraw/tldraw/pull/2690) ([@mimecuvalo](https://github.com/mimecuvalo))
- [DX] Use tabs in JSON.stringify [#2674](https://github.com/tldraw/tldraw/pull/2674) ([@steveruizok](https://github.com/steveruizok))
- [Improvement] Share zone styling [#2628](https://github.com/tldraw/tldraw/pull/2628) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- VS Code 2.0.22 [#2500](https://github.com/tldraw/tldraw/pull/2500) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- fix geo cloud icon [#2485](https://github.com/tldraw/tldraw/pull/2485) ([@ds300](https://github.com/ds300))
- Update README.md [#2464](https://github.com/tldraw/tldraw/pull/2464) ([@steveruizok](https://github.com/steveruizok))
- Fix bookmark info for VS Code [#2449](https://github.com/tldraw/tldraw/pull/2449) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix the publish script [#2440](https://github.com/tldraw/tldraw/pull/2440) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Lokalise: Translations update [#2418](https://github.com/tldraw/tldraw/pull/2418) ([@TodePond](https://github.com/TodePond))
- VS Code 2.0.21 [#2438](https://github.com/tldraw/tldraw/pull/2438) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Fix camera. [#2818](https://github.com/tldraw/tldraw/pull/2818) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] overlays, custom brush example [#2806](https://github.com/tldraw/tldraw/pull/2806) ([@steveruizok](https://github.com/steveruizok))
  - Fix pinch zooming [#2748](https://github.com/tldraw/tldraw/pull/2748) ([@TodePond](https://github.com/TodePond))
  - [Improvement] Text measurement tweaks [#2670](https://github.com/tldraw/tldraw/pull/2670) ([@steveruizok](https://github.com/steveruizok))
  - [Fix] Missing bend handles on curved arrows [#2661](https://github.com/tldraw/tldraw/pull/2661) ([@steveruizok](https://github.com/steveruizok))
  - [Fix] Wheel bug [#2657](https://github.com/tldraw/tldraw/pull/2657) ([@steveruizok](https://github.com/steveruizok))
  - Export TLCommandHistoryOptions type [#2598](https://github.com/tldraw/tldraw/pull/2598) ([@steveruizok](https://github.com/steveruizok))
  - Prevent overlay content disappearing at some browser zoom levels [#2483](https://github.com/tldraw/tldraw/pull/2483) ([@ds300](https://github.com/ds300))
- `@tldraw/tldraw`
  - Style UI based on component size instead of window size [#2758](https://github.com/tldraw/tldraw/pull/2758) ([@TodePond](https://github.com/TodePond))
  - Fixed actions menu opening in wrong direction on mobile (and add an inline layout example) [#2730](https://github.com/tldraw/tldraw/pull/2730) ([@TodePond](https://github.com/TodePond))
  - rearrange export / import from tldraw to help builds [#2739](https://github.com/tldraw/tldraw/pull/2739) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix infinite cursor chat issue by partially reverting "reactive context menu overrides (#2697)" [#2775](https://github.com/tldraw/tldraw/pull/2775) ([@SomeHats](https://github.com/SomeHats))
  - [fix] VSCode keyboard shortcuts while editing text [#2721](https://github.com/tldraw/tldraw/pull/2721) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Debug panel text overflow [#2715](https://github.com/tldraw/tldraw/pull/2715) ([@steveruizok](https://github.com/steveruizok))
  - reactive context menu overrides [#2697](https://github.com/tldraw/tldraw/pull/2697) ([@SomeHats](https://github.com/SomeHats))
  - [Fix] Note shape border radius [#2696](https://github.com/tldraw/tldraw/pull/2696) ([@steveruizok](https://github.com/steveruizok))
  - Fix svg exporting for images with not fully qualified url (`/tldraw.png` or `./tldraw.png`) [#2676](https://github.com/tldraw/tldraw/pull/2676) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [draft] Keep editor focus after losing focus of an action button [#2630](https://github.com/tldraw/tldraw/pull/2630) ([@TodePond](https://github.com/TodePond))
  - menus: address several little big things about menu styling [#2624](https://github.com/tldraw/tldraw/pull/2624) ([@mimecuvalo](https://github.com/mimecuvalo))
  - style: fix missing titles on vertical align menu [#2623](https://github.com/tldraw/tldraw/pull/2623) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Only actions on selected shapes if we are in select tool. [#2617](https://github.com/tldraw/tldraw/pull/2617) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix ios export crash [#2615](https://github.com/tldraw/tldraw/pull/2615) ([@TodePond](https://github.com/TodePond))
  - Allow dismissing dialogs by clicking backdrop [#2497](https://github.com/tldraw/tldraw/pull/2497) ([@ds300](https://github.com/ds300))
  - Fix the first run of dev script. [#2484](https://github.com/tldraw/tldraw/pull/2484) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Don't bother measuring canvas max size for small images [#2442](https://github.com/tldraw/tldraw/pull/2442) ([@TodePond](https://github.com/TodePond))
  - Fix main. [#2439](https://github.com/tldraw/tldraw/pull/2439) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/validate`
  - error reporting: rm ids from msgs for better Sentry grouping [#2738](https://github.com/tldraw/tldraw/pull/2738) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - i18n: add HR 🇭🇷 [#2778](https://github.com/tldraw/tldraw/pull/2778) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/tldraw`
  - arrows: account for another NaN [#2753](https://github.com/tldraw/tldraw/pull/2753) ([@mimecuvalo](https://github.com/mimecuvalo))
  - arrows: update cursor only when in Select mode [#2742](https://github.com/tldraw/tldraw/pull/2742) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [Fix] Overlapping non-adjacent handles [#2663](https://github.com/tldraw/tldraw/pull/2663) ([@steveruizok](https://github.com/steveruizok))
  - Fix nudge bug [#2634](https://github.com/tldraw/tldraw/pull/2634) ([@steveruizok](https://github.com/steveruizok))
  - [tweak] dark mode colors [#2469](https://github.com/tldraw/tldraw/pull/2469) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - arrows: separate out handle behavior from labels [#2621](https://github.com/tldraw/tldraw/pull/2621) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - i18n: sort languages by name, not by locale code [#2625](https://github.com/tldraw/tldraw/pull/2625) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [hot take] Make dark mode colours pop more [#2478](https://github.com/tldraw/tldraw/pull/2478) ([@TodePond](https://github.com/TodePond) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - [Minor] change Simplified Chinese label to Chinese [#2434](https://github.com/tldraw/tldraw/pull/2434) ([@peilingjiang](https://github.com/peilingjiang))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Make sure correct dark mode colours get used in exports [#2492](https://github.com/tldraw/tldraw/pull/2492) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/validate`
  - Fix validation for local files. [#2447](https://github.com/tldraw/tldraw/pull/2447) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - [fix] disable vertical edge resizing for text on mobile [#2456](https://github.com/tldraw/tldraw/pull/2456) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🏠 Internal

- hello@tldraw.com -> sales@tldraw.com [#2774](https://github.com/tldraw/tldraw/pull/2774) ([@steveruizok](https://github.com/steveruizok))
- fix(infra): Fix routing config [#2741](https://github.com/tldraw/tldraw/pull/2741) ([@ds300](https://github.com/ds300))
- [dotcom] `TLSyncRoom` tidy [#2712](https://github.com/tldraw/tldraw/pull/2712) ([@steveruizok](https://github.com/steveruizok))
- [dx] add gen docs to gitignore [#2704](https://github.com/tldraw/tldraw/pull/2704) ([@steveruizok](https://github.com/steveruizok))
- return 404 on missing docs content instead of 500 [#2699](https://github.com/tldraw/tldraw/pull/2699) ([@si14](https://github.com/si14))
- fix prune preview deployment script [#2698](https://github.com/tldraw/tldraw/pull/2698) ([@SomeHats](https://github.com/SomeHats))
- fix sub-project vercel configs [#2687](https://github.com/tldraw/tldraw/pull/2687) ([@si14](https://github.com/si14))
- remove dotcom's vercel.json [#2689](https://github.com/tldraw/tldraw/pull/2689) ([@si14](https://github.com/si14))
- check for duplicate dependencies in CI [#2682](https://github.com/tldraw/tldraw/pull/2682) ([@si14](https://github.com/si14))
- Introduce a Cloudflare health worker [#2499](https://github.com/tldraw/tldraw/pull/2499) ([@si14](https://github.com/si14) [@steveruizok](https://github.com/steveruizok))
- [dx] Add docs to lazy caching. [#2672](https://github.com/tldraw/tldraw/pull/2672) ([@steveruizok](https://github.com/steveruizok))
- Restore vercel.jsons [#2650](https://github.com/tldraw/tldraw/pull/2650) ([@steveruizok](https://github.com/steveruizok))
- remove erroneous mount entry from fly.toml [#2644](https://github.com/tldraw/tldraw/pull/2644) ([@si14](https://github.com/si14))
- make Huppy deployable (again) [#2632](https://github.com/tldraw/tldraw/pull/2632) ([@si14](https://github.com/si14))
- Fix yarn clean [#2620](https://github.com/tldraw/tldraw/pull/2620) ([@si14](https://github.com/si14))
- Replace "original tldraw issue" with docs link. [#2599](https://github.com/tldraw/tldraw/pull/2599) ([@steveruizok](https://github.com/steveruizok))
- [Internal] Create build-docs.sh [#2569](https://github.com/tldraw/tldraw/pull/2569) ([@steveruizok](https://github.com/steveruizok))
- add dev / build scripts [#2551](https://github.com/tldraw/tldraw/pull/2551) ([@steveruizok](https://github.com/steveruizok))
- auto-it/typescript fails the release, patch the problem away while mods are asleep [#2498](https://github.com/tldraw/tldraw/pull/2498) ([@si14](https://github.com/si14))
- use github.ref rather than github.event.ref in deploy.yml [#2495](https://github.com/tldraw/tldraw/pull/2495) ([@SomeHats](https://github.com/SomeHats))
- add bash scripts for Vercel [#2494](https://github.com/tldraw/tldraw/pull/2494) ([@si14](https://github.com/si14))
- `@tldraw/tldraw`
  - examples: clean up Canvas/Store events and make UiEvents have code snippets [#2770](https://github.com/tldraw/tldraw/pull/2770) ([@mimecuvalo](https://github.com/mimecuvalo))
  - delete unused duplicated DraggingHandle.ts [#2463](https://github.com/tldraw/tldraw/pull/2463) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Unbiome [#2776](https://github.com/tldraw/tldraw/pull/2776) ([@si14](https://github.com/si14))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/validate`
  - Update the project to Node 20 [#2691](https://github.com/tldraw/tldraw/pull/2691) ([@si14](https://github.com/si14))
  - Add docs [#2470](https://github.com/tldraw/tldraw/pull/2470) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/store`, `@tldraw/tlschema`
  - make CI check for yarn install warnings and fix the peer deps ones we have [#2683](https://github.com/tldraw/tldraw/pull/2683) ([@si14](https://github.com/si14))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - dev: add test-dev command for easier testing of packages [#2627](https://github.com/tldraw/tldraw/pull/2627) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/state`, `@tldraw/store`
  - unbrivate, dot com in [#2475](https://github.com/tldraw/tldraw/pull/2475) ([@steveruizok](https://github.com/steveruizok) [@si14](https://github.com/si14) [@SomeHats](https://github.com/SomeHats))

#### 📝 Documentation

- [docs] Small style changes [#2805](https://github.com/tldraw/tldraw/pull/2805) ([@steveruizok](https://github.com/steveruizok))
- docs: better code snippets [#2801](https://github.com/tldraw/tldraw/pull/2801) ([@mimecuvalo](https://github.com/mimecuvalo))
- Quick start guide [#2692](https://github.com/tldraw/tldraw/pull/2692) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@mimecuvalo](https://github.com/mimecuvalo))
- docs: rm ... from some examples and fix up inset example [#2788](https://github.com/tldraw/tldraw/pull/2788) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: fix scrolling issue with sidebar [#2791](https://github.com/tldraw/tldraw/pull/2791) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: disable ai search for now [#2740](https://github.com/tldraw/tldraw/pull/2740) ([@mimecuvalo](https://github.com/mimecuvalo))
- [docs] Autocomplete styling tweaks [#2732](https://github.com/tldraw/tldraw/pull/2732) ([@steveruizok](https://github.com/steveruizok))
- docs: fix CORS issue and broken example link [#2727](https://github.com/tldraw/tldraw/pull/2727) ([@mimecuvalo](https://github.com/mimecuvalo))
- [docs] Fix links, little style tweaks [#2724](https://github.com/tldraw/tldraw/pull/2724) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))
- [Docs] Tweak sidebar titles [#2706](https://github.com/tldraw/tldraw/pull/2706) ([@steveruizok](https://github.com/steveruizok))
- fix(docs): fix user-interface.mdx [#2700](https://github.com/tldraw/tldraw/pull/2700) ([@Rokixy](https://github.com/Rokixy) [@steveruizok](https://github.com/steveruizok))
- docs: more cleanup following restructure [#2702](https://github.com/tldraw/tldraw/pull/2702) ([@mimecuvalo](https://github.com/mimecuvalo))
- [Examples] Add a stupid 404 page [#2694](https://github.com/tldraw/tldraw/pull/2694) ([@steveruizok](https://github.com/steveruizok))
- docs: rework docs site to have different sections [#2686](https://github.com/tldraw/tldraw/pull/2686) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@mimecuvalo](https://github.com/mimecuvalo) [@TodePond](https://github.com/TodePond) [@si14](https://github.com/si14))
- Remove examples app landing page [#2678](https://github.com/tldraw/tldraw/pull/2678) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Grouping examples into categories [#2585](https://github.com/tldraw/tldraw/pull/2585) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Add button to Examples to request an example [#2597](https://github.com/tldraw/tldraw/pull/2597) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Update README and examples copy in the docs [#2594](https://github.com/tldraw/tldraw/pull/2594) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Remove repeated word in CONTRIBUTING.md [#2651](https://github.com/tldraw/tldraw/pull/2651) ([@albjoh2](https://github.com/albjoh2))
- Update layout.tsx [#2619](https://github.com/tldraw/tldraw/pull/2619) ([@steveruizok](https://github.com/steveruizok))
- Add context toolbar example. [#2596](https://github.com/tldraw/tldraw/pull/2596) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Use simple example [#2561](https://github.com/tldraw/tldraw/pull/2561) ([@steveruizok](https://github.com/steveruizok))
- fix: replaced dead links [#2567](https://github.com/tldraw/tldraw/pull/2567) ([@alikiki](https://github.com/alikiki) [@steveruizok](https://github.com/steveruizok))
- add keyboard shortcuts example [#2474](https://github.com/tldraw/tldraw/pull/2474) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix translations link [#2477](https://github.com/tldraw/tldraw/pull/2477) ([@steveruizok](https://github.com/steveruizok))
- rename and annotate user presence example [#2462](https://github.com/tldraw/tldraw/pull/2462) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- annotate onthecanvas example [#2459](https://github.com/tldraw/tldraw/pull/2459) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate snapshot example [#2454](https://github.com/tldraw/tldraw/pull/2454) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix and annotate minimal example [#2448](https://github.com/tldraw/tldraw/pull/2448) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate zones example [#2461](https://github.com/tldraw/tldraw/pull/2461) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate ui events example [#2460](https://github.com/tldraw/tldraw/pull/2460) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate shape meta data example [#2453](https://github.com/tldraw/tldraw/pull/2453) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate example for using Tldraw component in a scrollable container [#2452](https://github.com/tldraw/tldraw/pull/2452) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate example for making editor read-only [#2451](https://github.com/tldraw/tldraw/pull/2451) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix typos and add comments for persistence example [#2450](https://github.com/tldraw/tldraw/pull/2450) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate external sources example [#2414](https://github.com/tldraw/tldraw/pull/2414) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Update README [#2444](https://github.com/tldraw/tldraw/pull/2444) ([@steveruizok](https://github.com/steveruizok))
- annotate multiple example [#2431](https://github.com/tldraw/tldraw/pull/2431) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- annotate force mobile example [#2421](https://github.com/tldraw/tldraw/pull/2421) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate hosted images example [#2422](https://github.com/tldraw/tldraw/pull/2422) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate local images example [#2423](https://github.com/tldraw/tldraw/pull/2423) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate meta oncreate example [#2426](https://github.com/tldraw/tldraw/pull/2426) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate exploded example [#2413](https://github.com/tldraw/tldraw/pull/2413) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate hide-ui example [#2420](https://github.com/tldraw/tldraw/pull/2420) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate custom ui example [#2408](https://github.com/tldraw/tldraw/pull/2408) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Custom components annotation [#2403](https://github.com/tldraw/tldraw/pull/2403) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate meta onchange [#2430](https://github.com/tldraw/tldraw/pull/2430) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/tldraw`
  - Examples tweaks [#2681](https://github.com/tldraw/tldraw/pull/2681) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - fix typo in hideRotateHandle method [#2473](https://github.com/tldraw/tldraw/pull/2473) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### 🧪 Tests

- `@tldraw/editor`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/utils`
  - Bump jest to fix weird prettier bug [#2716](https://github.com/tldraw/tldraw/pull/2716) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Bump Yarn to 4.0.2 and add version constraints [#2481](https://github.com/tldraw/tldraw/pull/2481) ([@si14](https://github.com/si14))

#### Authors: 13

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- [@Rokixy](https://github.com/Rokixy)
- a22albjo ([@albjoh2](https://github.com/albjoh2))
- Alex ([@alikiki](https://github.com/alikiki))
- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Peiling Jiang ([@peilingjiang](https://github.com/peilingjiang))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.2 (Wed Jan 10 2024)

### Release Notes

#### Fix validation when pasting images. ([#2436](https://github.com/tldraw/tldraw/pull/2436))

- Fixes url validations.

#### Fix decrement button label in OnTheCanvas example component ([#2432](https://github.com/tldraw/tldraw/pull/2432))

- tiny bug fix, simply changing a label to match behaviour

#### refactor copy/export, fix safari copy-as-image being broken ([#2411](https://github.com/tldraw/tldraw/pull/2411))

- Fix a bug preventing copying as an image on iOS

#### Add url validation ([#2428](https://github.com/tldraw/tldraw/pull/2428))

- Add validation to urls.

#### [fix] next selected shapes comment ([#2427](https://github.com/tldraw/tldraw/pull/2427))

- Fix error in setStyleForNextSelectedShapes comment

#### annotate error boundary example ([#2410](https://github.com/tldraw/tldraw/pull/2410))

- Add annotation to error boundary example

#### Fix issues with clip paths for frames ([#2406](https://github.com/tldraw/tldraw/pull/2406))

- Add a brief release note for your PR here.

#### Annotate custom styles example ([#2405](https://github.com/tldraw/tldraw/pull/2405))

- Add annotation to the custom styles example

#### annotate custom config example ([#2404](https://github.com/tldraw/tldraw/pull/2404))

- Adds annotation to the custom config example with a bit more detail

#### annotate asset props, correct image/video confusion ([#2399](https://github.com/tldraw/tldraw/pull/2399))

- Annotates the asset props example and fixes a mistake in the existing comments

#### Annotate/refactor store events example ([#2400](https://github.com/tldraw/tldraw/pull/2400))

- Update store events example to use store.listen method
- Annotate with explanations of the code

#### annotate canvas events ([#2397](https://github.com/tldraw/tldraw/pull/2397))

- Adds annotation to the canvas events example

#### [fix] edge scrolling when component is inside of screen ([#2398](https://github.com/tldraw/tldraw/pull/2398))

- Add a brief release note for your PR here.

#### Annotate api example ([#2395](https://github.com/tldraw/tldraw/pull/2395))

- Annotate API example

#### [tech debt] Primitives renaming party / cleanup ([#2396](https://github.com/tldraw/tldraw/pull/2396))

- renames Vec2d to Vec
- renames Vec2dModel to VecModel
- renames Box2d to Box
- renames Box2dModel to BoxModel
- renames Matrix2d to Mat
- renames Matrix2dModel to MatModel
- removes unused primitive helpers

#### Refactor and document speech bubble example ([#2392](https://github.com/tldraw/tldraw/pull/2392))

- Add annotations to the speech bubble example
- Refactor code for clarity

#### Fix trademark links ([#2380](https://github.com/tldraw/tldraw/pull/2380))

- Fixes broken links in a number of docs files.

#### [fix] polygon bounds ([#2378](https://github.com/tldraw/tldraw/pull/2378))

- Fixed a bug with the bounds calculation for polygons.

#### Avoid importing `editor.css` twice ([#2373](https://github.com/tldraw/tldraw/pull/2373))

- Prevent importing `editor.css` twice which should help when debugging the styles via developer console.

#### Adding an image shape from a file the public folder ([#2370](https://github.com/tldraw/tldraw/pull/2370))

- Adds a simple image example.

---

#### 💥 Breaking Change

- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [tech debt] Primitives renaming party / cleanup [#2396](https://github.com/tldraw/tldraw/pull/2396) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- Adding an image shape from a file the public folder [#2370](https://github.com/tldraw/tldraw/pull/2370) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fix

- Avoid importing `editor.css` twice [#2373](https://github.com/tldraw/tldraw/pull/2373) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code bump 2.0.20 [#2371](https://github.com/tldraw/tldraw/pull/2371) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tlschema`
  - Fix validation when pasting images. [#2436](https://github.com/tldraw/tldraw/pull/2436) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
- `@tldraw/tldraw`
  - refactor copy/export, fix safari copy-as-image being broken [#2411](https://github.com/tldraw/tldraw/pull/2411) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - [fix] Asset versions [#2389](https://github.com/tldraw/tldraw/pull/2389) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Add url validation [#2428](https://github.com/tldraw/tldraw/pull/2428) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Fix issues with clip paths for frames [#2406](https://github.com/tldraw/tldraw/pull/2406) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [fix] edge scrolling when component is inside of screen [#2398](https://github.com/tldraw/tldraw/pull/2398) ([@steveruizok](https://github.com/steveruizok))
  - [fix] polygon bounds [#2378](https://github.com/tldraw/tldraw/pull/2378) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/store`
  - Fix meta examples [#2379](https://github.com/tldraw/tldraw/pull/2379) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Fix license language. [#2365](https://github.com/tldraw/tldraw/pull/2365) ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- Fix decrement button label in OnTheCanvas example component [#2432](https://github.com/tldraw/tldraw/pull/2432) ([@StanFlint](https://github.com/StanFlint))
- annotate error boundary example [#2410](https://github.com/tldraw/tldraw/pull/2410) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- fix example scrolling on ios [#2412](https://github.com/tldraw/tldraw/pull/2412) ([@SomeHats](https://github.com/SomeHats))
- Add descriptions to active examples [#2407](https://github.com/tldraw/tldraw/pull/2407) ([@SomeHats](https://github.com/SomeHats))
- Annotate custom styles example [#2405](https://github.com/tldraw/tldraw/pull/2405) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- annotate custom config example [#2404](https://github.com/tldraw/tldraw/pull/2404) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate asset props, correct image/video confusion [#2399](https://github.com/tldraw/tldraw/pull/2399) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate/refactor store events example [#2400](https://github.com/tldraw/tldraw/pull/2400) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate canvas events [#2397](https://github.com/tldraw/tldraw/pull/2397) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate api example [#2395](https://github.com/tldraw/tldraw/pull/2395) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Refactor and document speech bubble example [#2392](https://github.com/tldraw/tldraw/pull/2392) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Fix README link typo [#2372](https://github.com/tldraw/tldraw/pull/2372) ([@chunderbolt](https://github.com/chunderbolt))
- `@tldraw/editor`
  - [fix] next selected shapes comment [#2427](https://github.com/tldraw/tldraw/pull/2427) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/tldraw`
  - [example] Changing the default tldraw colors [#2402](https://github.com/tldraw/tldraw/pull/2402) ([@steveruizok](https://github.com/steveruizok))
  - add descriptions to examples [#2375](https://github.com/tldraw/tldraw/pull/2375) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Fix trademark links [#2380](https://github.com/tldraw/tldraw/pull/2380) ([@nonparibus](https://github.com/nonparibus))
  - Another typo fix. [#2366](https://github.com/tldraw/tldraw/pull/2366) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 8

- [@chunderbolt](https://github.com/chunderbolt)
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David @ HASH ([@nonparibus](https://github.com/nonparibus))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Stan Flint ([@StanFlint](https://github.com/StanFlint))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.1 (Wed Dec 20 2023)

### Release Notes

#### add speech bubble example ([#2362](https://github.com/tldraw/tldraw/pull/2362))

- Add an example for making a custom shape with handles, this one is a speech bubble with a movable tail.

#### Fix clicking off the context menu ([#2355](https://github.com/tldraw/tldraw/pull/2355))

- Fix not being able to close the context menu by clicking on the UI or your selected shape.

#### fix read only page menu ([#2356](https://github.com/tldraw/tldraw/pull/2356))

- Add a brief release note for your PR here.

#### refactor: Keep hook function convention the same ([#2358](https://github.com/tldraw/tldraw/pull/2358))

- Add a brief release note for your PR here.

#### focus on container before deleting to avoid losing focus ([#2354](https://github.com/tldraw/tldraw/pull/2354))

- Prevents losing focus when clicking the trash button

#### Stop shape text labels being hoverable when context menu is open ([#2352](https://github.com/tldraw/tldraw/pull/2352))

- Add a brief release note for your PR here.

#### Use custom font ([#2343](https://github.com/tldraw/tldraw/pull/2343))

- Add a brief release note for your PR here.

#### Only allow side resizing when we have some shapes that are not aspect ratio locked ([#2347](https://github.com/tldraw/tldraw/pull/2347))

- Don't allow edges resizing on mobile. The only exception is a single text shape.

#### Fix iconleft padding ([#2345](https://github.com/tldraw/tldraw/pull/2345))

- Fixes the icon padding in back to content / pen mode buttons.

#### [bug] Fix for issue #2329 ([#2330](https://github.com/tldraw/tldraw/pull/2330))

- Fix for `Matrix2d.Scale` function

#### Allow dragging on top of locked shapes. ([#2337](https://github.com/tldraw/tldraw/pull/2337))

- Allow translating of shapes on top of a locked shape by clicking inside of selection and moving the mouse.

#### Remove deprecated getters ([#2333](https://github.com/tldraw/tldraw/pull/2333))

- (Breaking) Removed deprecated getters.

#### Lokalise: Translations update ([#2342](https://github.com/tldraw/tldraw/pull/2342))

Added Czech translations.
Updated translations for German, Korean, Russian, Ukrainian, Traditional Chinese.

#### Prevent diff mutation ([#2336](https://github.com/tldraw/tldraw/pull/2336))

- Fix `squashRecordDiffs` to prevent a bug where it mutates the 'updated' entires

#### Fix indicator radius for bookmarks. ([#2335](https://github.com/tldraw/tldraw/pull/2335))

- Fix the indicator for the bookmark shape. The radius now matches the shape's radius.

#### Start scrolling if we are dragging close to the window edges. ([#2299](https://github.com/tldraw/tldraw/pull/2299))

- Adds the logic to change the camera position when you get close to the edges of the window. This allows you to drag, resize, brush select past the edges of the current viewport.

#### Fix downscaling ([#2325](https://github.com/tldraw/tldraw/pull/2325))

- Decrease the size of uploaded assets.

#### Use a global singleton for tlstate ([#2322](https://github.com/tldraw/tldraw/pull/2322))

- Make a global singleton for tlstate.

#### VS Code 2.0.19 ([#2324](https://github.com/tldraw/tldraw/pull/2324))

- Version bump for VS Code.

---

#### 💥 Breaking Change

- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - bump to beta [#2364](https://github.com/tldraw/tldraw/pull/2364) ([@steveruizok](https://github.com/steveruizok))
  - Change licenses to tldraw [#2167](https://github.com/tldraw/tldraw/pull/2167) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/tldraw`
  - Use custom font [#2343](https://github.com/tldraw/tldraw/pull/2343) ([@ds300](https://github.com/ds300) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `@tldraw/state`
  - Remove deprecated getters [#2333](https://github.com/tldraw/tldraw/pull/2333) ([@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- add speech bubble example [#2362](https://github.com/tldraw/tldraw/pull/2362) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Start scrolling if we are dragging close to the window edges. [#2299](https://github.com/tldraw/tldraw/pull/2299) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- VS Code 2.0.19 [#2324](https://github.com/tldraw/tldraw/pull/2324) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Fix clicking off the context menu [#2355](https://github.com/tldraw/tldraw/pull/2355) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - Drop edge scrolling adjustment for mobile [#2346](https://github.com/tldraw/tldraw/pull/2346) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - fix read only page menu [#2356](https://github.com/tldraw/tldraw/pull/2356) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@TodePond](https://github.com/TodePond))
  - focus on container before deleting to avoid losing focus [#2354](https://github.com/tldraw/tldraw/pull/2354) ([@ds300](https://github.com/ds300))
  - Only allow side resizing when we have some shapes that are not aspect ratio locked [#2347](https://github.com/tldraw/tldraw/pull/2347) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix iconleft padding [#2345](https://github.com/tldraw/tldraw/pull/2345) ([@steveruizok](https://github.com/steveruizok))
  - Allow dragging on top of locked shapes. [#2337](https://github.com/tldraw/tldraw/pull/2337) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix indicator radius for bookmarks. [#2335](https://github.com/tldraw/tldraw/pull/2335) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix downscaling [#2325](https://github.com/tldraw/tldraw/pull/2325) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Stop shape text labels being hoverable when context menu is open [#2352](https://github.com/tldraw/tldraw/pull/2352) ([@TodePond](https://github.com/TodePond))
  - [bug] Fix for issue #2329 [#2330](https://github.com/tldraw/tldraw/pull/2330) ([@zfedoran](https://github.com/zfedoran))
- `@tldraw/utils`
  - fix png images with pixel ratios <0.5 crashing the app [#2350](https://github.com/tldraw/tldraw/pull/2350) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - Lokalise: Translations update [#2342](https://github.com/tldraw/tldraw/pull/2342) ([@TodePond](https://github.com/TodePond))
- `@tldraw/store`, `@tldraw/tldraw`
  - Prevent diff mutation [#2336](https://github.com/tldraw/tldraw/pull/2336) ([@ds300](https://github.com/ds300))
- `@tldraw/store`
  - Call devFreeze on initialData [#2332](https://github.com/tldraw/tldraw/pull/2332) ([@ds300](https://github.com/ds300))
- `@tldraw/state`
  - Fix TSDoc for @tldraw/state [#2327](https://github.com/tldraw/tldraw/pull/2327) ([@ds300](https://github.com/ds300))
  - Use a global singleton for tlstate [#2322](https://github.com/tldraw/tldraw/pull/2322) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- `@tldraw/editor`
  - refactor: Keep hook function convention the same [#2358](https://github.com/tldraw/tldraw/pull/2358) ([@Lennon57](https://github.com/Lennon57))

#### Authors: 9

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- [@zfedoran](https://github.com/zfedoran)
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- MinhoPark ([@Lennon57](https://github.com/Lennon57))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.19 (Tue Dec 12 2023)

### Release Notes

#### zoom to affected shapes after undo/redo ([#2293](https://github.com/tldraw/tldraw/pull/2293))

- Make sure affected shapes are visible after undo/redo

#### Fix hmr. ([#2303](https://github.com/tldraw/tldraw/pull/2303))

- Fixes HMR in local dev.

#### Fix migrations. ([#2302](https://github.com/tldraw/tldraw/pull/2302))

- Fix migrations of `instance_page_state`.

#### Add fit to content for frames. ([#2275](https://github.com/tldraw/tldraw/pull/2275))

- Add Fit to content option to the context menu for frames. This resizes the frames to correctly fit all their content.

#### Fix an issue with a stale editor reference in shape utils ([#2295](https://github.com/tldraw/tldraw/pull/2295))

- Fix an issue where the shape utils could have a stale reference to the editor.

#### fix new page naming ([#2292](https://github.com/tldraw/tldraw/pull/2292))

- Fix naming of pages created by the "move to page" action

#### Fix exporting of cropped images. ([#2268](https://github.com/tldraw/tldraw/pull/2268))

- Fix exporting of cropped images.

#### Update the comment in the example. ([#2272](https://github.com/tldraw/tldraw/pull/2272))

- Improve the comment for one of our examples.

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

#### improves translation into pt-br ([#2231](https://github.com/tldraw/tldraw/pull/2231))

- Improves the overall translation into Portuguese (pt-br).

#### Fixes #2246 Sublibraries example (ExplodedExample.tsx) ([#2247](https://github.com/tldraw/tldraw/pull/2247))

- Fixed Sublibraries (Exploded) example

#### Fix missing padding-right in toast ([#2251](https://github.com/tldraw/tldraw/pull/2251))

- Fox padding-right in toast content.

#### Fix "custom UI" example ([#2253](https://github.com/tldraw/tldraw/pull/2253))

- Fixed double rendering of canvas in the "custom UI" example

#### Lokalise: Translations update ([#2248](https://github.com/tldraw/tldraw/pull/2248))

- Update Romanian translations.

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

#### VS Code bump 2.0.17 ([#2217](https://github.com/tldraw/tldraw/pull/2217))

- VS code extension 2.0.17.

#### don't overwrite bookmark position if it changed before metadata arrives ([#2215](https://github.com/tldraw/tldraw/pull/2215))

- Fixes issue when creating new bookmark shape where the position would be reset if you moved it before the bookmark metadata was fetched.

#### Add prettier caching ([#2212](https://github.com/tldraw/tldraw/pull/2212))

- Speed up formatting of files via `yarn format`.

#### Update translations from community submissions ([#2201](https://github.com/tldraw/tldraw/pull/2201))

- Updated translations for Spanish, Japanese, Romanian, Russian, Ukrainian, and Simplified Chinese.

#### [fix] huge images, use downscale for image scaling ([#2207](https://github.com/tldraw/tldraw/pull/2207))

- Improved image rescaling.

#### Revert back to the previous color. ([#2210](https://github.com/tldraw/tldraw/pull/2210))

- Fixes the color of culled shapes when using dark mode.

#### Fix an issue with not being able to group a shape an an arrow. ([#2205](https://github.com/tldraw/tldraw/pull/2205))

- Add a brief release note for your PR here.

#### Japanese translations. (update) ([#2199](https://github.com/tldraw/tldraw/pull/2199))

- Updated Japanese translations.

#### feat: add new prop to force mobile mode layout ([#1734](https://github.com/tldraw/tldraw/pull/1734))

- add new prop to force mobile mode layout

#### [fix] masked bounds calculation ([#2197](https://github.com/tldraw/tldraw/pull/2197))

- Fix bug with getmaskedpagebounds calculation for identical parent / child sizes

---

#### 💥 Breaking Change

- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - No impure getters pt 1 [#2189](https://github.com/tldraw/tldraw/pull/2189) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- `@tldraw/editor`, `@tldraw/tldraw`
  - Add fit to content for frames. [#2275](https://github.com/tldraw/tldraw/pull/2275) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Removing frames and adding elements to frames [#2219](https://github.com/tldraw/tldraw/pull/2219) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Custom Tools DX + screenshot example [#2198](https://github.com/tldraw/tldraw/pull/2198) ([@steveruizok](https://github.com/steveruizok))
  - StateNode atoms [#2213](https://github.com/tldraw/tldraw/pull/2213) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [improvements] arrows x enclosing shapes x precision. [#2265](https://github.com/tldraw/tldraw/pull/2265) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Add connecting screen override. [#2273](https://github.com/tldraw/tldraw/pull/2273) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - Add `getSvgAsImage` to exports. [#2229](https://github.com/tldraw/tldraw/pull/2229) ([@steveruizok](https://github.com/steveruizok))
  - [fix] huge images, use downscale for image scaling [#2207](https://github.com/tldraw/tldraw/pull/2207) ([@steveruizok](https://github.com/steveruizok))
  - feat: add new prop to force mobile mode layout [#1734](https://github.com/tldraw/tldraw/pull/1734) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix hmr. [#2303](https://github.com/tldraw/tldraw/pull/2303) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code version bump. [#2297](https://github.com/tldraw/tldraw/pull/2297) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- improves translation into pt-br [#2231](https://github.com/tldraw/tldraw/pull/2231) ([@bybruno](https://github.com/bybruno))
- Fixes #2246 Sublibraries example (ExplodedExample.tsx) [#2247](https://github.com/tldraw/tldraw/pull/2247) (gary.saunders@sportsengine.com [@steveruizok](https://github.com/steveruizok))
- Lokalise: Translations update [#2248](https://github.com/tldraw/tldraw/pull/2248) ([@TodePond](https://github.com/TodePond))
- Update translations from community submissions [#2201](https://github.com/tldraw/tldraw/pull/2201) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Japanese translations. (update) [#2199](https://github.com/tldraw/tldraw/pull/2199) ([@sugitlab](https://github.com/sugitlab))
- VS code bump 2.0.16 [#2193](https://github.com/tldraw/tldraw/pull/2193) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Revert "zoom to affected shapes after undo/redo" [#2310](https://github.com/tldraw/tldraw/pull/2310) ([@ds300](https://github.com/ds300))
  - zoom to affected shapes after undo/redo [#2293](https://github.com/tldraw/tldraw/pull/2293) ([@ds300](https://github.com/ds300))
  - fix new page naming [#2292](https://github.com/tldraw/tldraw/pull/2292) ([@SomeHats](https://github.com/SomeHats))
  - No impure getters pt9 [#2222](https://github.com/tldraw/tldraw/pull/2222) ([@ds300](https://github.com/ds300))
  - No impure getters pt8 [#2221](https://github.com/tldraw/tldraw/pull/2221) ([@ds300](https://github.com/ds300))
  - No impure getters pt7 [#2220](https://github.com/tldraw/tldraw/pull/2220) ([@ds300](https://github.com/ds300))
  - No impure getters pt6 [#2218](https://github.com/tldraw/tldraw/pull/2218) ([@ds300](https://github.com/ds300))
  - No impure getters pt5 [#2208](https://github.com/tldraw/tldraw/pull/2208) ([@ds300](https://github.com/ds300))
  - Fix an issue with not being able to group a shape an an arrow. [#2205](https://github.com/tldraw/tldraw/pull/2205) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - No impure getters pt4 [#2206](https://github.com/tldraw/tldraw/pull/2206) ([@ds300](https://github.com/ds300))
  - No impure getters pt3 [#2203](https://github.com/tldraw/tldraw/pull/2203) ([@ds300](https://github.com/ds300))
  - No impure getters pt2 [#2202](https://github.com/tldraw/tldraw/pull/2202) ([@ds300](https://github.com/ds300))
- `@tldraw/tlschema`
  - Fix migrations. [#2302](https://github.com/tldraw/tldraw/pull/2302) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Fix an issue with a stale editor reference in shape utils [#2295](https://github.com/tldraw/tldraw/pull/2295) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix the cleanup of event handlers [#2298](https://github.com/tldraw/tldraw/pull/2298) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Revert back to the previous color. [#2210](https://github.com/tldraw/tldraw/pull/2210) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] masked bounds calculation [#2197](https://github.com/tldraw/tldraw/pull/2197) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - Fix exporting of cropped images. [#2268](https://github.com/tldraw/tldraw/pull/2268) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Hot elbows [#2258](https://github.com/tldraw/tldraw/pull/2258) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
  - Fix missing padding-right in toast [#2251](https://github.com/tldraw/tldraw/pull/2251) ([@ByMykel](https://github.com/ByMykel) [@steveruizok](https://github.com/steveruizok))
  - Also export `TLUiEventMap` [#2234](https://github.com/tldraw/tldraw/pull/2234) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix the tool lock button. [#2225](https://github.com/tldraw/tldraw/pull/2225) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - don't overwrite bookmark position if it changed before metadata arrives [#2215](https://github.com/tldraw/tldraw/pull/2215) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/utils`
  - fix vite HMR issue [#2279](https://github.com/tldraw/tldraw/pull/2279) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/tldraw`, `@tldraw/utils`
  - no impure getters pt 11 [#2236](https://github.com/tldraw/tldraw/pull/2236) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`
  - No impure getters pt10 [#2235](https://github.com/tldraw/tldraw/pull/2235) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- Fix "custom UI" example [#2253](https://github.com/tldraw/tldraw/pull/2253) ([@OriginalEXE](https://github.com/OriginalEXE))
- Add floaty window example [#2250](https://github.com/tldraw/tldraw/pull/2250) ([@steveruizok](https://github.com/steveruizok))
- VS Code bump 2.0.17 [#2217](https://github.com/tldraw/tldraw/pull/2217) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tlschema`
  - Add prettier caching [#2212](https://github.com/tldraw/tldraw/pull/2212) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 📝 Documentation

- Update the comment in the example. [#2272](https://github.com/tldraw/tldraw/pull/2272) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/state`
  - Replace getters in examples [#2261](https://github.com/tldraw/tldraw/pull/2261) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - fix typo in useFixSafariDoubleTapZoomPencilEvents.ts [#2242](https://github.com/tldraw/tldraw/pull/2242) ([@eltociear](https://github.com/eltociear))

#### 🧪 Tests

- `@tldraw/tldraw`
  - fix export snapshot race condition [#2280](https://github.com/tldraw/tldraw/pull/2280) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 13

- [@ByMykel](https://github.com/ByMykel)
- alex ([@SomeHats](https://github.com/SomeHats))
- Ante Sepic ([@OriginalEXE](https://github.com/OriginalEXE))
- Bruno ([@bybruno](https://github.com/bybruno))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Gary Saunders ([@codenamegary](https://github.com/codenamegary))
- Ikko Eltociear Ashimine ([@eltociear](https://github.com/eltociear))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Sugit ([@sugitlab](https://github.com/sugitlab))
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

#### add missing semicolon ([#2182](https://github.com/tldraw/tldraw/pull/2182))

- Fix typo in CSS file

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

#### Bump vs code extension. ([#2142](https://github.com/tldraw/tldraw/pull/2142))

- Release a new version of VS Code extension with all the latest changes.

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

#### Fix an issue with `addEventListener` in old Safari (pre v14) ([#2114](https://github.com/tldraw/tldraw/pull/2114))

- Fixes an issue with `addEventListener` on MediaQueryList object in old versions of Safari.

#### fix selection fg transform ([#2113](https://github.com/tldraw/tldraw/pull/2113))

- Fixes a small issue causing the selection foreground to be offset when the browser is at particular zoom levels.

#### Remove (optional) from jsdocs ([#2109](https://github.com/tldraw/tldraw/pull/2109))

- dev: Removed duplicate/inconsistent `(optional)`s from docs

#### [fix] mobile style panel switching open / closed ([#2101](https://github.com/tldraw/tldraw/pull/2101))

- Fix bug with style panel

---

#### 🚀 Enhancement

- `@tldraw/tldraw`
  - instant bookmarks [#2176](https://github.com/tldraw/tldraw/pull/2176) ([@ds300](https://github.com/ds300))
  - Remove indicator for autosize text shapes while editing [#2120](https://github.com/tldraw/tldraw/pull/2120) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [feature] Things on the canvas [#2150](https://github.com/tldraw/tldraw/pull/2150) ([@steveruizok](https://github.com/steveruizok))
  - Tighten up editor ui [#2102](https://github.com/tldraw/tldraw/pull/2102) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [feature] multi-scribbles [#2125](https://github.com/tldraw/tldraw/pull/2125) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Bump vs code extension. [#2142](https://github.com/tldraw/tldraw/pull/2142) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Bump VS Code [#2100](https://github.com/tldraw/tldraw/pull/2100) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - Add tldraw component exports [#2188](https://github.com/tldraw/tldraw/pull/2188) ([@steveruizok](https://github.com/steveruizok))
  - Fix an error when using context menu. [#2186](https://github.com/tldraw/tldraw/pull/2186) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix an issue with edit link. [#2184](https://github.com/tldraw/tldraw/pull/2184) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Only use the hack if we are in safari. [#2185](https://github.com/tldraw/tldraw/pull/2185) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix keyboard shortcuts for vscode. [#2181](https://github.com/tldraw/tldraw/pull/2181) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix printing. [#2177](https://github.com/tldraw/tldraw/pull/2177) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] Frame label not following staying aligned correctly on rotation [#2172](https://github.com/tldraw/tldraw/pull/2172) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - Don't show scrollbars. [#2171](https://github.com/tldraw/tldraw/pull/2171) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix arrow dropdown localizations. [#2174](https://github.com/tldraw/tldraw/pull/2174) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Allow users to select shapes when drag starts on top of a locked shape. [#2169](https://github.com/tldraw/tldraw/pull/2169) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix the problem with text not being correctly aligned in small geo shapes. [#2168](https://github.com/tldraw/tldraw/pull/2168) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix cleanupText [#2138](https://github.com/tldraw/tldraw/pull/2138) ([@ds300](https://github.com/ds300))
  - [android] Fix text labels and link button getting misaligned [#2132](https://github.com/tldraw/tldraw/pull/2132) ([@TodePond](https://github.com/TodePond))
  - [fix] button gaps [#2130](https://github.com/tldraw/tldraw/pull/2130) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Move to page button / toasts styling [#2126](https://github.com/tldraw/tldraw/pull/2126) ([@steveruizok](https://github.com/steveruizok))
  - [fix] css for editing page title [#2124](https://github.com/tldraw/tldraw/pull/2124) ([@steveruizok](https://github.com/steveruizok))
  - fix selection fg transform [#2113](https://github.com/tldraw/tldraw/pull/2113) ([@ds300](https://github.com/ds300))
  - [fix] mobile style panel switching open / closed [#2101](https://github.com/tldraw/tldraw/pull/2101) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [fix] actions menu freezing ui [#2187](https://github.com/tldraw/tldraw/pull/2187) ([@steveruizok](https://github.com/steveruizok))
  - Fix crash with zero length arrow [#2173](https://github.com/tldraw/tldraw/pull/2173) ([@TodePond](https://github.com/TodePond))
  - Zooming improvement [#2149](https://github.com/tldraw/tldraw/pull/2149) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - add missing semicolon [#2182](https://github.com/tldraw/tldraw/pull/2182) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - fix scroll event coords [#2180](https://github.com/tldraw/tldraw/pull/2180) ([@ds300](https://github.com/ds300))
  - Fix an issue with `addEventListener` in old Safari (pre v14) [#2114](https://github.com/tldraw/tldraw/pull/2114) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🏠 Internal

- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Revert "bump prerelease from alpha to beta" [#2192](https://github.com/tldraw/tldraw/pull/2192) ([@ds300](https://github.com/ds300))
  - bump prerelease from alpha to beta [#2148](https://github.com/tldraw/tldraw/pull/2148) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Taha/initial shape in handle change [#2117](https://github.com/tldraw/tldraw/pull/2117) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### 📝 Documentation

- `@tldraw/editor`
  - Add meta example [#2122](https://github.com/tldraw/tldraw/pull/2122) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/tldraw`
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

#### [fix] missing border on group shape when unlocked ([#2075](https://github.com/tldraw/tldraw/pull/2075))

- Fix case where indicator was not shown when unlocking groups

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

- `@tldraw/assets`, `@tldraw/tldraw`
  - Add offline indicator (also to top zone example) [#2083](https://github.com/tldraw/tldraw/pull/2083) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - Add data breakpoint to layout css [#2076](https://github.com/tldraw/tldraw/pull/2076) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - Same first page id for all editors [#2071](https://github.com/tldraw/tldraw/pull/2071) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- `@tldraw/tldraw`
  - Firefox, Touch: Fix not being able to open style dropdowns [#2092](https://github.com/tldraw/tldraw/pull/2092) ([@TodePond](https://github.com/TodePond))
  - Add timestamp to file names [#2096](https://github.com/tldraw/tldraw/pull/2096) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - move imports [#2099](https://github.com/tldraw/tldraw/pull/2099) ([@SomeHats](https://github.com/SomeHats))
  - Fix not being able to upload massive images [#2095](https://github.com/tldraw/tldraw/pull/2095) ([@TodePond](https://github.com/TodePond))
  - fix cropped image size [#2097](https://github.com/tldraw/tldraw/pull/2097) ([@ds300](https://github.com/ds300))
  - Fixed a bug checking translated string keys [#2082](https://github.com/tldraw/tldraw/pull/2082) ([@kewell-tsao](https://github.com/kewell-tsao))
  - [fix] Don't select locked shapes on pointer up [#2069](https://github.com/tldraw/tldraw/pull/2069) ([@steveruizok](https://github.com/steveruizok))
  - [fix] locked shape of opacity problem with eraser.pointing [#2073](https://github.com/tldraw/tldraw/pull/2073) ([@momenthana](https://github.com/momenthana))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [fix] Context menu + menus not closing correctly [#2086](https://github.com/tldraw/tldraw/pull/2086) ([@steveruizok](https://github.com/steveruizok))
  - [fix] reparenting locked shapes [#2070](https://github.com/tldraw/tldraw/pull/2070) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - [fix] remove findLast calls [#2081](https://github.com/tldraw/tldraw/pull/2081) ([@steveruizok](https://github.com/steveruizok))
  - [fix] missing border on group shape when unlocked [#2075](https://github.com/tldraw/tldraw/pull/2075) ([@steveruizok](https://github.com/steveruizok))
  - Compact children when updating parents to children. [#2072](https://github.com/tldraw/tldraw/pull/2072) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Fix ExplodedExample.tsx [#2068](https://github.com/tldraw/tldraw/pull/2068) ([@antmoux](https://github.com/antmoux) [@steveruizok](https://github.com/steveruizok))
- Update VS Code extension 2.0.13 [#2066](https://github.com/tldraw/tldraw/pull/2066) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🧪 Tests

- Only upload playwright to S3 if we have the right credentials [#2074](https://github.com/tldraw/tldraw/pull/2074) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Cache playwright browsers. [#2067](https://github.com/tldraw/tldraw/pull/2067) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🔩 Dependency Updates

- `@tldraw/editor`, `@tldraw/store`, `@tldraw/tlschema`
  - bump nanoid [#2078](https://github.com/tldraw/tldraw/pull/2078) ([@ds300](https://github.com/ds300))

#### Authors: 9

- alex ([@SomeHats](https://github.com/SomeHats))
- antonio moura ([@antmoux](https://github.com/antmoux))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Hana ([@momenthana](https://github.com/momenthana))
- Kewell ([@kewell-tsao](https://github.com/kewell-tsao))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.16 (Wed Oct 11 2023)

### Release Notes

#### Fix shape opacity when erasing ([#2055](https://github.com/tldraw/tldraw/pull/2055))

- Fixes opacity of shapes while erasing in a group or frame.

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

- `@tldraw/editor`, `@tldraw/tldraw`
  - [improvement] Scope `getShapeAtPoint` to rendering shapes only [#2043](https://github.com/tldraw/tldraw/pull/2043) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - Remove dot com ui styles [1/2] [#2039](https://github.com/tldraw/tldraw/pull/2039) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - prevent hover indicator from showing when pointer isn't over the canvas [#2023](https://github.com/tldraw/tldraw/pull/2023) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tldraw`
  - Remove topBar prop from <TldrawUi /> [#2018](https://github.com/tldraw/tldraw/pull/2018) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fix

- fix standalone examples [#2042](https://github.com/tldraw/tldraw/pull/2042) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Fix shape opacity when erasing [#2055](https://github.com/tldraw/tldraw/pull/2055) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [fix] Hit testing against zero width / height lines [#2060](https://github.com/tldraw/tldraw/pull/2060) ([@steveruizok](https://github.com/steveruizok))
  - Fix newlines in text geo shapes [#2059](https://github.com/tldraw/tldraw/pull/2059) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok))
  - Restore background [#2037](https://github.com/tldraw/tldraw/pull/2037) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - Fix opacity lowering on shapes that cannot be deleted [#2061](https://github.com/tldraw/tldraw/pull/2061) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - fix: proper label for opacity tooltip on hover [#2044](https://github.com/tldraw/tldraw/pull/2044) ([@Prince-Mendiratta](https://github.com/Prince-Mendiratta))
  - Fix alt + shift keyboard shortcuts [#2053](https://github.com/tldraw/tldraw/pull/2053) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] Stylepanel default spacing [#2036](https://github.com/tldraw/tldraw/pull/2036) ([@steveruizok](https://github.com/steveruizok))
  - Export tools [#2035](https://github.com/tldraw/tldraw/pull/2035) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - [fix] Page state migration [#2040](https://github.com/tldraw/tldraw/pull/2040) ([@steveruizok](https://github.com/steveruizok))
  - [fix] migrations for page state [#2038](https://github.com/tldraw/tldraw/pull/2038) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Move example into examples folder [#2064](https://github.com/tldraw/tldraw/pull/2064) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - [fix] broken docs link [#2062](https://github.com/tldraw/tldraw/pull/2062) ([@steveruizok](https://github.com/steveruizok))
  - Remove fixup script [#2041](https://github.com/tldraw/tldraw/pull/2041) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Publish api.json [#2034](https://github.com/tldraw/tldraw/pull/2034) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- re-enable visual regression tests [#2056](https://github.com/tldraw/tldraw/pull/2056) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))

#### Authors: 7

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
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

#### [fix] Hovered indicators shown when coarse pointer ([#1985](https://github.com/tldraw/tldraw/pull/1985))

- Hide hovered indicators on mobile / coarse pointer devices.

#### fix(docs): update shapes docs add the array of defined shapes ([#1949](https://github.com/tldraw/tldraw/pull/1949))

This pr add the custom defined shapes that's being passed to Tldraw

#### Fix style panel opening when disabled ([#1983](https://github.com/tldraw/tldraw/pull/1983))

- When select tool is active, the style menu shouldn't be openable unless a shape is also selected.

Before/After

<img width="300" src="https://github.com/tldraw/tldraw/assets/98838967/91ea55c8-0fcc-4f73-b61e-565829a5f25e" />
<img width="300" src="https://github.com/tldraw/tldraw/assets/98838967/ee4070fe-e236-4818-8fb4-43520210102b" />

#### [fix] pinch events ([#1979](https://github.com/tldraw/tldraw/pull/1979))

- Improve pinch gesture events.

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

#### Lokalise: Translations update ([#1964](https://github.com/tldraw/tldraw/pull/1964))

* Updated community translations for German and Galician

#### [improvement] improve arrows (for real) ([#1957](https://github.com/tldraw/tldraw/pull/1957))

- Improve arrows.

#### [feature] Include `sources` in `TLExternalContent` ([#1925](https://github.com/tldraw/tldraw/pull/1925))

- [editor / tldraw] add `sources` to `TLExternalContent`

#### [improvement] quick actions ([#1922](https://github.com/tldraw/tldraw/pull/1922))

- Improve the menu / kbds behavior when select tool is not active

#### Fix shape drag perf ([#1932](https://github.com/tldraw/tldraw/pull/1932))

- Fixes a perf regression for dragging shapes around

#### Firefox: Fix dropdowns not opening with touch ([#1923](https://github.com/tldraw/tldraw/pull/1923))

- Firefox: Fixed dropdown menus not opening with touch.

#### Use smarter rounding for shape container div width/height ([#1930](https://github.com/tldraw/tldraw/pull/1930))

- Improves the precision of the shape dimensions rounding logic

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

#### Update community translations ([#1889](https://github.com/tldraw/tldraw/pull/1889))

- Updated translations for Russian, Ukrainian, and Simplified Chinese

#### Fix line wobble ([#1915](https://github.com/tldraw/tldraw/pull/1915))

- Fixes an issue where lines would wobble as you dragged the handles around

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

#### clamp x-box and check-box lines to stay within box at small scales ([#1860](https://github.com/tldraw/tldraw/pull/1860))

- Fixes a regression introduced by the geometry refactor related to x-box and checkbox resizing.

#### Fix paste transform ([#1859](https://github.com/tldraw/tldraw/pull/1859))

- Fixes a bug affecting the position of pasted content inside frames.

#### Fix indicator transform miscalculation ([#1852](https://github.com/tldraw/tldraw/pull/1852))

- Fixes indicator transform miscalculation on android and windows

#### update currentPageShapesSorted reference in docs ([#1851](https://github.com/tldraw/tldraw/pull/1851))

- Add a brief release note for your PR here.

#### [fix] awful rendering issue ([#1842](https://github.com/tldraw/tldraw/pull/1842))

- [fix] iframe rendering issue

#### fix typo ([#1831](https://github.com/tldraw/tldraw/pull/1831))

- Just fixed a typo in the docs

#### [feature] Asset props ([#1824](https://github.com/tldraw/tldraw/pull/1824))

- [@tldraw/tldraw] add asset props

#### [fix] snapping bug ([#1819](https://github.com/tldraw/tldraw/pull/1819))

- [fix] crash that could occur when snapping

#### [fix] editing video shapes ([#1821](https://github.com/tldraw/tldraw/pull/1821))

- Fix bug with editing video shapes.

#### [feature] unlock all action ([#1820](https://github.com/tldraw/tldraw/pull/1820))

- Adds the unlock all feature.

#### [fix] bug with eventemitter3 default export ([#1818](https://github.com/tldraw/tldraw/pull/1818))

- [@tldraw/editor] updates eventemitter3 import to fix issue with Astro builds.

#### Add next cache to clean command ([#1811](https://github.com/tldraw/tldraw/pull/1811))

- Internal tooling change

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

#### [feature] Add val town embed ([#1777](https://github.com/tldraw/tldraw/pull/1777))

- (feature) val town

#### export `UiEventsProvider` ([#1774](https://github.com/tldraw/tldraw/pull/1774))

- [@tldraw/tldraw] export ui events, so that UI hooks can work without context

#### remove useForceSolid effect for geo / line shapes ([#1769](https://github.com/tldraw/tldraw/pull/1769))

- Remove the force solid switching for geo / line shapes

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

#### add shapes docs content ([#1705](https://github.com/tldraw/tldraw/pull/1705))

- Documentation: Added more info about shapes.

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

#### [fix] add cloud tooltip ([#1728](https://github.com/tldraw/tldraw/pull/1728))

- Add a brief release note for your PR here.

#### (2/2) Add content to Tools docs page. ([#1721](https://github.com/tldraw/tldraw/pull/1721))

- Tools docs.

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

#### Add API links to all docs pages ([#1661](https://github.com/tldraw/tldraw/pull/1661))

- Documentation: Added links to API reference in guides.

#### Go back to default cursor when done resizing. ([#1700](https://github.com/tldraw/tldraw/pull/1700))

- Switch back to the default cursor after you are done inserting a new text shape.

#### Firefox: Fix coarse pointer issue ([#1701](https://github.com/tldraw/tldraw/pull/1701))

- Fixed firefox not being able to use cursor chat when using a touch screen on desktop.

#### Fix tsdocs for TldrawUi component ([#1707](https://github.com/tldraw/tldraw/pull/1707))

- Docs: Show some docs missing from TldrawUi component.

---

#### 💥 Breaking Change

- `@tldraw/editor`, `@tldraw/tldraw`
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
  - environment manager [#1784](https://github.com/tldraw/tldraw/pull/1784) ([@steveruizok](https://github.com/steveruizok))
  - remove `selectionPageCenter` [#1766](https://github.com/tldraw/tldraw/pull/1766) ([@steveruizok](https://github.com/steveruizok))
  - rename selection page bounds [#1763](https://github.com/tldraw/tldraw/pull/1763) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - Remove targeted editing from text [#1962](https://github.com/tldraw/tldraw/pull/1962) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [improvement] quick actions [#1922](https://github.com/tldraw/tldraw/pull/1922) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`
  - SideEffectManager [#1785](https://github.com/tldraw/tldraw/pull/1785) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - Revert "Editor commands API / effects" [#1783](https://github.com/tldraw/tldraw/pull/1783) ([@steveruizok](https://github.com/steveruizok))
  - Editor commands API / effects [#1778](https://github.com/tldraw/tldraw/pull/1778) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - `ShapeUtil.getGeometry`, selection rewrite [#1751](https://github.com/tldraw/tldraw/pull/1751) ([@steveruizok](https://github.com/steveruizok))
  - More cleanup, focus bug fixes [#1749](https://github.com/tldraw/tldraw/pull/1749) ([@steveruizok](https://github.com/steveruizok))
  - Remove helpers / extraneous API methods. [#1745](https://github.com/tldraw/tldraw/pull/1745) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/utils`
  - move some utils into tldraw/utils [#1750](https://github.com/tldraw/tldraw/pull/1750) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - tldraw zero - package shuffle [#1710](https://github.com/tldraw/tldraw/pull/1710) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - [refactor] reduce dependencies on shape utils in editor [#1693](https://github.com/tldraw/tldraw/pull/1693) ([@steveruizok](https://github.com/steveruizok))
  - [hot take] remove `tool` from shape definition [#1691](https://github.com/tldraw/tldraw/pull/1691) ([@TodePond](https://github.com/TodePond))
  - [refactor] reordering shapes [#1718](https://github.com/tldraw/tldraw/pull/1718) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- `@tldraw/editor`, `@tldraw/tldraw`
  - Debugging cleanup / misc cleanup [#2025](https://github.com/tldraw/tldraw/pull/2025) ([@steveruizok](https://github.com/steveruizok))
  - [feature] Include `sources` in `TLExternalContent` [#1925](https://github.com/tldraw/tldraw/pull/1925) ([@steveruizok](https://github.com/steveruizok))
  - Add snapshot prop, examples [#1856](https://github.com/tldraw/tldraw/pull/1856) ([@steveruizok](https://github.com/steveruizok))
  - [fix] arrow snapping bug [#1756](https://github.com/tldraw/tldraw/pull/1756) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - Fix arrow handle snapping, snapping to text labels, selection of text labels [#1910](https://github.com/tldraw/tldraw/pull/1910) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - Migrate snapshot [#1843](https://github.com/tldraw/tldraw/pull/1843) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - export asset stuff [#1829](https://github.com/tldraw/tldraw/pull/1829) ([@steveruizok](https://github.com/steveruizok))
  - [feature] Asset props [#1824](https://github.com/tldraw/tldraw/pull/1824) ([@steveruizok](https://github.com/steveruizok))
  - [feature] unlock all action [#1820](https://github.com/tldraw/tldraw/pull/1820) ([@steveruizok](https://github.com/steveruizok))
  - export `UiEventsProvider` [#1774](https://github.com/tldraw/tldraw/pull/1774) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Add className as prop to Canvas [#1827](https://github.com/tldraw/tldraw/pull/1827) ([@steveruizok](https://github.com/steveruizok))
  - refactor `parentsToChildrenWithIndexes` [#1764](https://github.com/tldraw/tldraw/pull/1764) ([@steveruizok](https://github.com/steveruizok))
  - remove state checks for brush and zoom brush [#1717](https://github.com/tldraw/tldraw/pull/1717) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/tldraw`
  - [improvement] More selection logic [#1806](https://github.com/tldraw/tldraw/pull/1806) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/tlschema`
  - [feature] Add val town embed [#1777](https://github.com/tldraw/tldraw/pull/1777) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/validate`
  - Add shapes to exports [#1776](https://github.com/tldraw/tldraw/pull/1776) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - Add cloud shape [#1708](https://github.com/tldraw/tldraw/pull/1708) ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fix

- [fix] Multiple example [#2026](https://github.com/tldraw/tldraw/pull/2026) ([@steveruizok](https://github.com/steveruizok))
- Fix vs code extension. Prepare for new release. [#2011](https://github.com/tldraw/tldraw/pull/2011) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Lokalise: Translations update [#1964](https://github.com/tldraw/tldraw/pull/1964) ([@TodePond](https://github.com/TodePond))
- Update community translations [#1889](https://github.com/tldraw/tldraw/pull/1889) ([@TodePond](https://github.com/TodePond))
- Bump vs code version. [#1735](https://github.com/tldraw/tldraw/pull/1735) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] add cloud tooltip [#1728](https://github.com/tldraw/tldraw/pull/1728) ([@ds300](https://github.com/ds300))
- Bump vs code version. [#1719](https://github.com/tldraw/tldraw/pull/1719) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - Update readme [#2027](https://github.com/tldraw/tldraw/pull/2027) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Minimap interactions [#2012](https://github.com/tldraw/tldraw/pull/2012) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Image size [#2002](https://github.com/tldraw/tldraw/pull/2002) ([@steveruizok](https://github.com/steveruizok))
  - [fix] tool lock button in toolbar [#2009](https://github.com/tldraw/tldraw/pull/2009) ([@steveruizok](https://github.com/steveruizok))
  - fix cloud rendering [#2008](https://github.com/tldraw/tldraw/pull/2008) ([@ds300](https://github.com/ds300))
  - Fix hooks error. [#2000](https://github.com/tldraw/tldraw/pull/2000) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix style panel opening when disabled [#1983](https://github.com/tldraw/tldraw/pull/1983) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - [fix] Drawing tool touch for first pen mark [#1977](https://github.com/tldraw/tldraw/pull/1977) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Screen bounds offset after editing text [#1976](https://github.com/tldraw/tldraw/pull/1976) ([@steveruizok](https://github.com/steveruizok))
  - fix line bugs [#1936](https://github.com/tldraw/tldraw/pull/1936) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - Mark an undo before toggling lock [#1969](https://github.com/tldraw/tldraw/pull/1969) ([@steveruizok](https://github.com/steveruizok))
  - Stop editing frame headers when clicking inside a frame. [#1955](https://github.com/tldraw/tldraw/pull/1955) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@TodePond](https://github.com/TodePond))
  - Firefox: Fix dropdowns not opening with touch [#1923](https://github.com/tldraw/tldraw/pull/1923) ([@TodePond](https://github.com/TodePond))
  - Fix lines being draggable via their background [#1920](https://github.com/tldraw/tldraw/pull/1920) ([@TodePond](https://github.com/TodePond))
  - Fix first handle of line snapping to itself [#1912](https://github.com/tldraw/tldraw/pull/1912) ([@TodePond](https://github.com/TodePond))
  - [fix] id properties of undefined (#1730) [#1919](https://github.com/tldraw/tldraw/pull/1919) ([@momenthana](https://github.com/momenthana))
  - :recycle: fix: editing is not terminated after the conversion is confirmed. [#1885](https://github.com/tldraw/tldraw/pull/1885) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
  - Fix selecting one shape from selection group [#1905](https://github.com/tldraw/tldraw/pull/1905) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - [fix] help menu css [#1888](https://github.com/tldraw/tldraw/pull/1888) ([@steveruizok](https://github.com/steveruizok))
  - Fix highlighter dots not being clickable [#1903](https://github.com/tldraw/tldraw/pull/1903) ([@TodePond](https://github.com/TodePond))
  - Fix video shape controls [#1909](https://github.com/tldraw/tldraw/pull/1909) ([@ds300](https://github.com/ds300))
  - Fix line handles [#1904](https://github.com/tldraw/tldraw/pull/1904) ([@ds300](https://github.com/ds300))
  - Fix pinch start with toolbar open [#1895](https://github.com/tldraw/tldraw/pull/1895) ([@ds300](https://github.com/ds300))
  - clamp x-box and check-box lines to stay within box at small scales [#1860](https://github.com/tldraw/tldraw/pull/1860) ([@ds300](https://github.com/ds300))
  - [fix] exit penmode [#1847](https://github.com/tldraw/tldraw/pull/1847) ([@steveruizok](https://github.com/steveruizok))
  - [fix] assets and content handlers [#1846](https://github.com/tldraw/tldraw/pull/1846) ([@steveruizok](https://github.com/steveruizok))
  - [fix] line tool bug with tool locked [#1841](https://github.com/tldraw/tldraw/pull/1841) ([@steveruizok](https://github.com/steveruizok))
  - [fix] arrows bind to locked shapes [#1833](https://github.com/tldraw/tldraw/pull/1833) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] Collaborator scribble on tldraw [#1804](https://github.com/tldraw/tldraw/pull/1804) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Don't make arrows shapes to arrows [#1793](https://github.com/tldraw/tldraw/pull/1793) ([@steveruizok](https://github.com/steveruizok))
  - Fix text editing in page menu popover [#1790](https://github.com/tldraw/tldraw/pull/1790) ([@steveruizok](https://github.com/steveruizok))
  - Fix outlines on text shapes [#1781](https://github.com/tldraw/tldraw/pull/1781) ([@steveruizok](https://github.com/steveruizok))
  - remove useForceSolid effect for geo / line shapes [#1769](https://github.com/tldraw/tldraw/pull/1769) ([@steveruizok](https://github.com/steveruizok))
  - [fix] arrow rendering safari [#1767](https://github.com/tldraw/tldraw/pull/1767) ([@steveruizok](https://github.com/steveruizok))
  - [fix] revert legacy changes to buildFromV1Document.ts [#1761](https://github.com/tldraw/tldraw/pull/1761) ([@steveruizok](https://github.com/steveruizok))
  - Fix asset urls [#1758](https://github.com/tldraw/tldraw/pull/1758) ([@lakesare](https://github.com/lakesare))
  - [fix]: Fix typo in shapeType declaration [#1747](https://github.com/tldraw/tldraw/pull/1747) ([@ricardo-crespo](https://github.com/ricardo-crespo) [@steveruizok](https://github.com/steveruizok))
  - fix: escape eraser tool on escape [#1732](https://github.com/tldraw/tldraw/pull/1732) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))
  - fix: arrow label dark mode color [#1733](https://github.com/tldraw/tldraw/pull/1733) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - fix screen bounds not updating [#2022](https://github.com/tldraw/tldraw/pull/2022) ([@SomeHats](https://github.com/SomeHats))
  - [improvement] Refactor curved arrows [#2019](https://github.com/tldraw/tldraw/pull/2019) ([@steveruizok](https://github.com/steveruizok))
  - [fix] focus events [#2013](https://github.com/tldraw/tldraw/pull/2013) ([@steveruizok](https://github.com/steveruizok))
  - Re-focus on focus. [#2010](https://github.com/tldraw/tldraw/pull/2010) ([@steveruizok](https://github.com/steveruizok))
  - [fix] X box shape arrow intersections [#2006](https://github.com/tldraw/tldraw/pull/2006) ([@steveruizok](https://github.com/steveruizok))
  - Fix group opacity [#1997](https://github.com/tldraw/tldraw/pull/1997) ([@ds300](https://github.com/ds300))
  - [fix] Escape key exiting full screen while editing shapes [#1986](https://github.com/tldraw/tldraw/pull/1986) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Hovered indicators shown when coarse pointer [#1985](https://github.com/tldraw/tldraw/pull/1985) ([@steveruizok](https://github.com/steveruizok))
  - Sliiiightly darken muted-2 color. [#1981](https://github.com/tldraw/tldraw/pull/1981) ([@steveruizok](https://github.com/steveruizok))
  - [fix] pinch events [#1979](https://github.com/tldraw/tldraw/pull/1979) ([@steveruizok](https://github.com/steveruizok))
  - Make state node methods arrow functions [#1973](https://github.com/tldraw/tldraw/pull/1973) ([@steveruizok](https://github.com/steveruizok))
  - Arrows followup [#1972](https://github.com/tldraw/tldraw/pull/1972) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] improve arrows (for real) [#1957](https://github.com/tldraw/tldraw/pull/1957) ([@steveruizok](https://github.com/steveruizok))
  - fix clipping on nested non-intersecting frames [#1934](https://github.com/tldraw/tldraw/pull/1934) ([@SomeHats](https://github.com/SomeHats))
  - Use smarter rounding for shape container div width/height [#1930](https://github.com/tldraw/tldraw/pull/1930) ([@ds300](https://github.com/ds300))
  - Fix line wobble [#1915](https://github.com/tldraw/tldraw/pull/1915) ([@ds300](https://github.com/ds300))
  - [fix] right click [#1891](https://github.com/tldraw/tldraw/pull/1891) ([@steveruizok](https://github.com/steveruizok))
  - [wip] Viewport focus of editing shapes [#1873](https://github.com/tldraw/tldraw/pull/1873) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Fix indicator transform miscalculation [#1852](https://github.com/tldraw/tldraw/pull/1852) ([@ds300](https://github.com/ds300))
  - [fix] pointer events in shapes [#1855](https://github.com/tldraw/tldraw/pull/1855) ([@steveruizok](https://github.com/steveruizok))
  - [fix] overlays stacking [#1849](https://github.com/tldraw/tldraw/pull/1849) ([@steveruizok](https://github.com/steveruizok))
  - [fix] awful rendering issue [#1842](https://github.com/tldraw/tldraw/pull/1842) ([@steveruizok](https://github.com/steveruizok))
  - [fix] svg overlays when browser zoom is not 100% [#1836](https://github.com/tldraw/tldraw/pull/1836) ([@steveruizok](https://github.com/steveruizok))
  - Allow setting `user` as a prop [#1832](https://github.com/tldraw/tldraw/pull/1832) ([@SomeHats](https://github.com/SomeHats))
  - [fix] snapping bug [#1819](https://github.com/tldraw/tldraw/pull/1819) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Replace `findLast` for browser compat [#1822](https://github.com/tldraw/tldraw/pull/1822) ([@steveruizok](https://github.com/steveruizok))
  - [fix] bug with eventemitter3 default export [#1818](https://github.com/tldraw/tldraw/pull/1818) ([@steveruizok](https://github.com/steveruizok))
  - [fix] handles updates [#1779](https://github.com/tldraw/tldraw/pull/1779) ([@steveruizok](https://github.com/steveruizok))
  - [fix] transform errors [#1772](https://github.com/tldraw/tldraw/pull/1772) ([@steveruizok](https://github.com/steveruizok))
  - [fix] shape indicator showing when locked shapes are hovered [#1771](https://github.com/tldraw/tldraw/pull/1771) ([@steveruizok](https://github.com/steveruizok))
  - tweaks for cloud shape [#1723](https://github.com/tldraw/tldraw/pull/1723) ([@ds300](https://github.com/ds300))
  - Go back to default cursor when done resizing. [#1700](https://github.com/tldraw/tldraw/pull/1700) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Firefox: Fix coarse pointer issue [#1701](https://github.com/tldraw/tldraw/pull/1701) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/tldraw`
  - frame label fix [#2016](https://github.com/tldraw/tldraw/pull/2016) ([@ds300](https://github.com/ds300))
  - [fix] Focus events (actually) [#2015](https://github.com/tldraw/tldraw/pull/2015) ([@steveruizok](https://github.com/steveruizok))
  - Contain all the things [#1999](https://github.com/tldraw/tldraw/pull/1999) ([@steveruizok](https://github.com/steveruizok))
  - fix text in geo shapes not causing its container to grow [#2003](https://github.com/tldraw/tldraw/pull/2003) ([@SomeHats](https://github.com/SomeHats))
  - Fix an issue with arrow creation. [#2004](https://github.com/tldraw/tldraw/pull/2004) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Fix text-wrapping on Safari [#1980](https://github.com/tldraw/tldraw/pull/1980) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - [fix] text shape outline [#1974](https://github.com/tldraw/tldraw/pull/1974) ([@steveruizok](https://github.com/steveruizok))
  - Allow right clicking selection backgrounds [#1968](https://github.com/tldraw/tldraw/pull/1968) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [fix] geo shape text label placement [#1927](https://github.com/tldraw/tldraw/pull/1927) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
  - expanded highlighter geometry [#1929](https://github.com/tldraw/tldraw/pull/1929) ([@SomeHats](https://github.com/SomeHats))
  - [fix] Moving group items inside of a frame (dropping) [#1886](https://github.com/tldraw/tldraw/pull/1886) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
  - [fix] iframe losing focus on pointer down [#1848](https://github.com/tldraw/tldraw/pull/1848) ([@steveruizok](https://github.com/steveruizok))
  - [fix] zero width / height bounds [#1840](https://github.com/tldraw/tldraw/pull/1840) ([@steveruizok](https://github.com/steveruizok))
  - avoid pixel rounding / transformation miscalc for overlay items [#1858](https://github.com/tldraw/tldraw/pull/1858) ([@BrianHung](https://github.com/BrianHung) [@ds300](https://github.com/ds300))
  - Fix paste transform [#1859](https://github.com/tldraw/tldraw/pull/1859) ([@ds300](https://github.com/ds300))
  - [fix] text editing outline when scaled [#1826](https://github.com/tldraw/tldraw/pull/1826) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Line shape rendering [#1825](https://github.com/tldraw/tldraw/pull/1825) ([@steveruizok](https://github.com/steveruizok))
  - [fix] remove CSS radius calculations [#1823](https://github.com/tldraw/tldraw/pull/1823) ([@steveruizok](https://github.com/steveruizok))
  - [fix] editing video shapes [#1821](https://github.com/tldraw/tldraw/pull/1821) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Sticky text content / hovered shapes [#1808](https://github.com/tldraw/tldraw/pull/1808) ([@steveruizok](https://github.com/steveruizok))
  - [fix] page to screen [#1797](https://github.com/tldraw/tldraw/pull/1797) ([@steveruizok](https://github.com/steveruizok))
  - Custom rendering margin / don't cull selected shapes [#1788](https://github.com/tldraw/tldraw/pull/1788) ([@steveruizok](https://github.com/steveruizok))
  - [fix] minimap, common page bounds [#1770](https://github.com/tldraw/tldraw/pull/1770) ([@steveruizok](https://github.com/steveruizok))
  - [fix] restore bg option, fix calculations [#1765](https://github.com/tldraw/tldraw/pull/1765) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`
  - Fix shape drag perf [#1932](https://github.com/tldraw/tldraw/pull/1932) ([@ds300](https://github.com/ds300))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - [fix] embeds switching / tldraw embed [#1792](https://github.com/tldraw/tldraw/pull/1792) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [fix] dark mode [#1754](https://github.com/tldraw/tldraw/pull/1754) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Remove docs source. [#2030](https://github.com/tldraw/tldraw/pull/2030) ([@steveruizok](https://github.com/steveruizok))
- [infra] missing await [#1951](https://github.com/tldraw/tldraw/pull/1951) ([@ds300](https://github.com/ds300))
- [infra] maybe fix canary publish [#1950](https://github.com/tldraw/tldraw/pull/1950) ([@ds300](https://github.com/ds300))
- fix typo [#1831](https://github.com/tldraw/tldraw/pull/1831) ([@judicaelandria](https://github.com/judicaelandria))
- Add next cache to clean command [#1811](https://github.com/tldraw/tldraw/pull/1811) ([@ds300](https://github.com/ds300))
- remove yjs example [#1795](https://github.com/tldraw/tldraw/pull/1795) ([@steveruizok](https://github.com/steveruizok))
- support custom shapes in yjs example [#1737](https://github.com/tldraw/tldraw/pull/1737) ([@steveruizok](https://github.com/steveruizok))
- [internal] Add basic list to examples [#1688](https://github.com/tldraw/tldraw/pull/1688) ([@steveruizok](https://github.com/steveruizok))
- cleanup [#1711](https://github.com/tldraw/tldraw/pull/1711) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tldraw`
  - [fix] CSS reload in dev [#1791](https://github.com/tldraw/tldraw/pull/1791) ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- fix(docs): update shapes docs add the array of defined shapes [#1949](https://github.com/tldraw/tldraw/pull/1949) ([@judicaelandria](https://github.com/judicaelandria) [@steveruizok](https://github.com/steveruizok))
- update currentPageShapesSorted reference in docs [#1851](https://github.com/tldraw/tldraw/pull/1851) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix broken link in docs [#1830](https://github.com/tldraw/tldraw/pull/1830) ([@jmduke](https://github.com/jmduke) [@steveruizok](https://github.com/steveruizok))
- add shapes docs content [#1705](https://github.com/tldraw/tldraw/pull/1705) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- (2/2) Add content to Tools docs page. [#1721](https://github.com/tldraw/tldraw/pull/1721) ([@TodePond](https://github.com/TodePond))
- Add API links to all docs pages [#1661](https://github.com/tldraw/tldraw/pull/1661) ([@TodePond](https://github.com/TodePond))
- Fix tsdocs for TldrawUi component [#1707](https://github.com/tldraw/tldraw/pull/1707) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`
  - Make some missing tsdocs appear on the docs site [#1706](https://github.com/tldraw/tldraw/pull/1706) ([@TodePond](https://github.com/TodePond))

#### 🧪 Tests

- Fix e2e test [#1748](https://github.com/tldraw/tldraw/pull/1748) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - [fix] Right click groups [#1975](https://github.com/tldraw/tldraw/pull/1975) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- `@tldraw/editor`
  - (chore) bump [#1744](https://github.com/tldraw/tldraw/pull/1744) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 14

- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Evgenia Karunus ([@lakesare](https://github.com/lakesare))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Hana ([@momenthana](https://github.com/momenthana))
- Judicael ([@judicaelandria](https://github.com/judicaelandria))
- Justin Duke ([@jmduke](https://github.com/jmduke))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Ricardo Crespo ([@ricardo-crespo](https://github.com/ricardo-crespo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Takuto Mori Gump ([@mr04vv](https://github.com/mr04vv))

---

# v2.0.0-alpha.14 (Tue Jul 04 2023)

### Release Notes

#### Disable styles panel button on mobile when using the laser tool. ([#1704](https://github.com/tldraw/tldraw/pull/1704))

- Disable the styles panel button for laser tool on mobile.

#### remove lock option from highlighter ([#1703](https://github.com/tldraw/tldraw/pull/1703))

- We no longer show the tool lock option for highlighter - it didn't do anything anyway

#### [fix] penmode ([#1698](https://github.com/tldraw/tldraw/pull/1698))

- [fix] pen mode

#### Update readme ([#1686](https://github.com/tldraw/tldraw/pull/1686))

- Documentation: Updated readme to reflect recent library changes.

#### [docs] Fix the types in the Shapes example ([#1681](https://github.com/tldraw/tldraw/pull/1681))

- Documentation: Fix some incorrect types on the Shapes page.

#### [improvement] More nuanced cursor state ([#1682](https://github.com/tldraw/tldraw/pull/1682))

- Improve cursor timeouts and hiding logic.

#### Fix VS Code commits failing on bublic? ([#1680](https://github.com/tldraw/tldraw/pull/1680))

- [internal] fixed commits failing from bublic when using UI

#### [fix] Lock shortcut ([#1677](https://github.com/tldraw/tldraw/pull/1677))

- [@tldraw/editor] Fix lock tool shortcut

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

#### [fix] mutating `snapshot` in `migrateStoreSnapshot` ([#1663](https://github.com/tldraw/tldraw/pull/1663))

- [@tldraw/store] Fixed a bug that would cause `Store.migrateStoreSnapshot` to mutate its `snapshot` argument.

---

#### 🚀 Enhancement

- `@tldraw/editor`
  - [improvement] More nuanced cursor state [#1682](https://github.com/tldraw/tldraw/pull/1682) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] export scribble manager [#1671](https://github.com/tldraw/tldraw/pull/1671) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`, `@tldraw/validate`
  - [feature] add `meta` property to records [#1627](https://github.com/tldraw/tldraw/pull/1627) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Lokalise: Translations update [#1694](https://github.com/tldraw/tldraw/pull/1694) ([@TodePond](https://github.com/TodePond))
- `@tldraw/ui`
  - Disable styles panel button on mobile when using the laser tool. [#1704](https://github.com/tldraw/tldraw/pull/1704) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - remove lock option from highlighter [#1703](https://github.com/tldraw/tldraw/pull/1703) ([@SomeHats](https://github.com/SomeHats))
  - [fix] Lock shortcut [#1677](https://github.com/tldraw/tldraw/pull/1677) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - [fix] penmode [#1698](https://github.com/tldraw/tldraw/pull/1698) ([@steveruizok](https://github.com/steveruizok))
  - [fix] indicator not updating [#1696](https://github.com/tldraw/tldraw/pull/1696) ([@steveruizok](https://github.com/steveruizok))
  - [fix] comma keyboard shortcuts [#1675](https://github.com/tldraw/tldraw/pull/1675) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] add box sizing border box [#1674](https://github.com/tldraw/tldraw/pull/1674) ([@steveruizok](https://github.com/steveruizok))
  - [improvemnet] drop crc, Buffer dependency [#1673](https://github.com/tldraw/tldraw/pull/1673) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Shape rendering [#1670](https://github.com/tldraw/tldraw/pull/1670) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`
  - [fix] rename `global` in @tldraw/state to avoid collissions [#1672](https://github.com/tldraw/tldraw/pull/1672) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/store`
  - [fix] mutating `snapshot` in `migrateStoreSnapshot` [#1663](https://github.com/tldraw/tldraw/pull/1663) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- [infra] use huppy token for publish-new [#1687](https://github.com/tldraw/tldraw/pull/1687) ([@ds300](https://github.com/ds300))
- Fix VS Code commits failing on bublic? [#1680](https://github.com/tldraw/tldraw/pull/1680) ([@TodePond](https://github.com/TodePond))

#### 📝 Documentation

- Update readme [#1686](https://github.com/tldraw/tldraw/pull/1686) ([@TodePond](https://github.com/TodePond))
- [docs] Update multiple test [#1685](https://github.com/tldraw/tldraw/pull/1685) ([@steveruizok](https://github.com/steveruizok))
- [docs] Fix the types in the Shapes example [#1681](https://github.com/tldraw/tldraw/pull/1681) ([@TodePond](https://github.com/TodePond))

#### Authors: 5

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
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

#### (2/2) [docs] Fix links to API. ([#1654](https://github.com/tldraw/tldraw/pull/1654))

- Documentation: Simplified links to the API reference.

#### (1/2) [docs] Restore some missing changes ([#1652](https://github.com/tldraw/tldraw/pull/1652))

- None (Docs internals)

#### [docs] Remove embeds page ([#1653](https://github.com/tldraw/tldraw/pull/1653))

- Documentation: Removed unused Embeds page.

#### Fix text shapes not having colour ([#1649](https://github.com/tldraw/tldraw/pull/1649))

- None: Fixes an unreleased bug.

#### Styles API docs ([#1641](https://github.com/tldraw/tldraw/pull/1641))

--

#### Styles API follow-ups ([#1636](https://github.com/tldraw/tldraw/pull/1636))

--

#### docs: remove not accepting contributions notice ([#1647](https://github.com/tldraw/tldraw/pull/1647))

- Remove not accepting contributions notice from README

#### Fix SVG cursors not being used ([#1639](https://github.com/tldraw/tldraw/pull/1639))

- None: Fixing an unreleased bug.

#### [docs] Add table of contents to Editor page ([#1642](https://github.com/tldraw/tldraw/pull/1642))

- Documentation: Added a table of contents to the Editor page.

#### speed up playwright and add visual regression tests ([#1638](https://github.com/tldraw/tldraw/pull/1638))

--

#### [docs] Allow sidebar to be scrolled on short screens ([#1632](https://github.com/tldraw/tldraw/pull/1632))

- Documentation: Fixed the sidebar being unscrollable on some short screens.

#### [docs] Add feedback when you search ([#1633](https://github.com/tldraw/tldraw/pull/1633))

- Documentation: Added some immediate feedback when you search.

#### [docs] Separate some pages out of the Docs section ([#1626](https://github.com/tldraw/tldraw/pull/1626))

- Documentation: Restructured the sidebar for clarity.

#### [docs] Fix wrong cursor when hovering buttons ([#1630](https://github.com/tldraw/tldraw/pull/1630))

- Documentation: Fixed the wrong cursor showing when hovering some buttons.

#### [docs] Tighten up wording & structure of Usage page ([#1624](https://github.com/tldraw/tldraw/pull/1624))

- Documentation: Impoved clarity of wording and structure of the Usage page.

#### [docs] Tighten up Editor page introduction ([#1622](https://github.com/tldraw/tldraw/pull/1622))

- Documentation: Simplified the Editor page.

#### [docs] Tighten up Introduction page ([#1621](https://github.com/tldraw/tldraw/pull/1621))

- Documentation: Simplified the Introduction page.

#### Lokalise: Translations update ([#1618](https://github.com/tldraw/tldraw/pull/1618))

- Added more translations for Simplified Chinese.

#### [docs] Simplify paths for uncategorised pages ([#1619](https://github.com/tldraw/tldraw/pull/1619))

- Documentation: Cleaned up some paths.

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

#### Remove `@tldraw/utils` from the docs site ([#1596](https://github.com/tldraw/tldraw/pull/1596))

- [docs] Removed an internal utilities package.

#### (1/2) Cursor Chat - Presence ([#1487](https://github.com/tldraw/tldraw/pull/1487))

- [dev] Added support for cursor chat presence.

#### [docs] Add barebones note about translations ([#1593](https://github.com/tldraw/tldraw/pull/1593))

- [docs] Added brief info on how to join as a translations contributor.

#### [refactor] snapping ([#1589](https://github.com/tldraw/tldraw/pull/1589))

- [editor] fix bug in snapping

#### remove `ShapeUtil.transform` ([#1590](https://github.com/tldraw/tldraw/pull/1590))

- [editor] Remove `ShapeUtil.transform`

#### Change app to editor in docs ([#1592](https://github.com/tldraw/tldraw/pull/1592))

- [docs] Updated 'App' to 'Editor'.

#### Make sure loading screens use dark mode user preference. ([#1552](https://github.com/tldraw/tldraw/pull/1552))

- Make sure our loading and error screens take dark mode setting into account.

#### remove `ShapeUtil.point` ([#1591](https://github.com/tldraw/tldraw/pull/1591))

- [editor] Remove `ShapeUtil.point`

#### [fix] Remove group shape export backgrounds ([#1587](https://github.com/tldraw/tldraw/pull/1587))

- Fix image exports for groups

#### Add tsdocs to Editor methods ([#1581](https://github.com/tldraw/tldraw/pull/1581))

- [dev] Added initial documentation for the Editor class.

#### add presence to yjs example ([#1582](https://github.com/tldraw/tldraw/pull/1582))

- [editor] Add presence to yjs example.

#### Add optional generic to `updateShapes` / `createShapes` ([#1579](https://github.com/tldraw/tldraw/pull/1579))

- [editor] adds an optional shape generic to `updateShapes` and `createShapes`

#### fix: properly remove awareness from store ([#1565](https://github.com/tldraw/tldraw/pull/1565))

- Add a brief release note for your PR here.

#### [improvement] Embed shape cleanup ([#1569](https://github.com/tldraw/tldraw/pull/1569))

- [editor] Remove unused props for `TLEditorShape`
- [editor] Adds `canUnmount` property to embed definitions

#### Move the loading of assets to the TldrawEditorWithReadyStore so that all code paths load the assets. ([#1561](https://github.com/tldraw/tldraw/pull/1561))

- Fix a problem where assets were not loading in some cases (snapshots).

#### Add anchor targets to our headings. ([#1571](https://github.com/tldraw/tldraw/pull/1571))

- Improve documentation to include anchor targets.

#### shapes folder, move tools into shape defs ([#1574](https://github.com/tldraw/tldraw/pull/1574))

n/a

#### mini `defineShape` API ([#1563](https://github.com/tldraw/tldraw/pull/1563))

[dev-facing, notes to come]

#### Lokalise: Translations update ([#1572](https://github.com/tldraw/tldraw/pull/1572))

- Added and updates translations for Italian, Russian, and Ukrainian.

#### Fix README typo ([#1451](https://github.com/tldraw/tldraw/pull/1451))

- None

#### yjs example ([#1560](https://github.com/tldraw/tldraw/pull/1560))

- [editor] Adds yjs example project

#### `ExternalContentManager` for handling external content (files, images, etc) ([#1550](https://github.com/tldraw/tldraw/pull/1550))

- [editor] add `ExternalContentManager` for plopping content onto the canvas
- [editor] remove `onCreateAssetFromFile` prop
- [editor] remove `onCreateBookmarkFromUrl` prop
- [editor] introduce `ExternalContentManager`
- [editor] add cleanup function to `onMount`

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

#### Select locked shapes on long press ([#1529](https://github.com/tldraw/tldraw/pull/1529))



#### highlighter fixes ([#1530](https://github.com/tldraw/tldraw/pull/1530))

[aq bug fixes]

#### Lokalise: Translations update ([#1515](https://github.com/tldraw/tldraw/pull/1515))

- Added and updated community translations for Galician, Italian, Romanian, Russian, Ukrainian, and Traditional Chinese.

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

#### Filter out unused assets. ([#1502](https://github.com/tldraw/tldraw/pull/1502))

- Optimize file size of exported files.

#### Cleanup @tldraw/ui types / exports ([#1504](https://github.com/tldraw/tldraw/pull/1504))

- [editor] clean up / unify types

#### rename app to editor ([#1503](https://github.com/tldraw/tldraw/pull/1503))

- Rename `App` to `Editor` and many other things that reference `app` to `editor`.

#### Revert 09c36781 & tweak linting ([#1501](https://github.com/tldraw/tldraw/pull/1501))

[internal-only]

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

#### [feature] Easier store persistence API + persistence example ([#1480](https://github.com/tldraw/tldraw/pull/1480))

- [tlstore] adds `getSnapshot` and `loadSnapshot`

#### Add DSL to make writing shape-layout test cases much easier ([#1413](https://github.com/tldraw/tldraw/pull/1413))

[internal only change]

#### Feature flags rework ([#1474](https://github.com/tldraw/tldraw/pull/1474))

[internal only change]

#### [tiny] add isPageId ([#1482](https://github.com/tldraw/tldraw/pull/1482))

- [tlschema] Add `isPageId`

#### [minor] Mark tlsync-client internal APIs ([#1481](https://github.com/tldraw/tldraw/pull/1481))

- Removes internal APIs from `@tldraw/tlsync-client`

#### [refactor] update record names ([#1473](https://github.com/tldraw/tldraw/pull/1473))

- [editor] rename record types

#### remove safari special-casing for paste ([#1470](https://github.com/tldraw/tldraw/pull/1470))

[fixes a regression introduced during this release]

#### Don't allow `g` keyboard shortcut in readonly mode, show laser tool in the toolbar ([#1459](https://github.com/tldraw/tldraw/pull/1459))

- Disable geo tool shortcut in readonly mode. Show laser on the toolbar.

#### [mini-feature] Following indicator ([#1468](https://github.com/tldraw/tldraw/pull/1468))

- Adds viewport following indicator

#### [chore] refactor user preferences ([#1435](https://github.com/tldraw/tldraw/pull/1435))

- Add a brief release note for your PR here.

#### Add translations for "Leave shared project" action ([#1394](https://github.com/tldraw/tldraw/pull/1394))

- None

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

#### Update docs links + guides + build ([#1422](https://github.com/tldraw/tldraw/pull/1422))

* [docs] Updated guides to get assets from the new `tldraw/tldraw` repo instead of the old `tldraw/tldraw-examples`.
* [docs] Updated an old CodeSandbox link to the new StackBlitz.

#### Create @tldraw/indices package ([#1426](https://github.com/tldraw/tldraw/pull/1426))

- [@tldraw/editor] Remove fractional indices code into `@tldraw/indices`
- [@tldraw/indices] Create library for fractional indices code

#### [feature] Add checkbox to toolbar ([#1423](https://github.com/tldraw/tldraw/pull/1423))

- Adds missing checkbox to toolbar.

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

#### [fix] page menu, drag handle css ([#1406](https://github.com/tldraw/tldraw/pull/1406))

- Fix styling in the page menu

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

#### Don't allow the users to use keyboard shortcuts to select tools in readonly mode. ([#1382](https://github.com/tldraw/tldraw/pull/1382))

- Disable keyboard shortcut events for tools in readonly mode. We only allow the select, hand tools, and zoom tool.

#### [fix] Don't synchronize isReadOnly ([#1396](https://github.com/tldraw/tldraw/pull/1396))

- Removes the isReadOnly value from the `user_document_settings` record type.

#### fix pasted tabs not getting converted to space ([#1388](https://github.com/tldraw/tldraw/pull/1388))

- Fixed a bug where pasted tabs wouldn't get converted into spaces.

#### Delete an empty text shape when clicking on another text shape. ([#1384](https://github.com/tldraw/tldraw/pull/1384))

- Fix a problem with empty text shapes not getting deleted if you clicked on another text shape.

#### Fix setting the grid mode. ([#1386](https://github.com/tldraw/tldraw/pull/1386))

- Fix grid mode toggle.

#### Update codesandbox + example link ([#1368](https://github.com/tldraw/tldraw/pull/1368))

- [docs] Fixed some links to examples.

#### Fix selection foreground being misaligned ([#1380](https://github.com/tldraw/tldraw/pull/1380))

- None (fix for a bug that hasn't released)

#### Expand selection outline for single-selected draw shape ([#1379](https://github.com/tldraw/tldraw/pull/1379))

- Improve selection outlines around horizontal or vertical draw shapes

#### Add localizations for snapshots links ([#1347](https://github.com/tldraw/tldraw/pull/1347))

- Add localization for creating snapshot links.

#### [fix] pointer location not updating when moving over editing shape ([#1378](https://github.com/tldraw/tldraw/pull/1378))

- Fix a bug where the pointer location would not update when moving the pointer over an editing shape.

#### [perf] deleteShapes ([#1373](https://github.com/tldraw/tldraw/pull/1373))

- Perf improvement for deleting shapes in a document with lots of pages.

#### Neaten up pr template ([#1369](https://github.com/tldraw/tldraw/pull/1369))

- None: internal

#### fix a couple of consistency assumptions ([#1365](https://github.com/tldraw/tldraw/pull/1365))

- Fixes a couple of minor consistency bugs affecting shape updating and page deletion in multiplayer contexts.

#### Disable nightly/on-demand webdriver scripts ([#1366](https://github.com/tldraw/tldraw/pull/1366))

None

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

#### Adds CI for webdriver tests ([#1343](https://github.com/tldraw/tldraw/pull/1343))

- Github action CI workflows added for webdriver tests
- Refactored e2e test runner

#### enable eslint for test files ([#1363](https://github.com/tldraw/tldraw/pull/1363))

internal-only change

#### [perf] make ensureStoreIsUsable scale better ([#1362](https://github.com/tldraw/tldraw/pull/1362))

- Add a brief release note for your PR here.

#### Export Events stuff ([#1360](https://github.com/tldraw/tldraw/pull/1360))

- [ui] export the `TLUiEventSource` type
- [ui] export the `EventsProviderProps ` type
- [ui] export the `useEvents ` hook

#### presence-related fixes ([#1361](https://github.com/tldraw/tldraw/pull/1361))

- Fix a bug where creating a page could throw an error in some multiplayer contexts.

#### [improvement] rename onEvent to onUiEvent ([#1358](https://github.com/tldraw/tldraw/pull/1358))

- [docs] Adds docs for ui events
- [tldraw] Renames `onEvent` to `onUiEvent`

#### [docs] Update links in docs ([#1357](https://github.com/tldraw/tldraw/pull/1357))

- [docs] Update links in docs to point to the tldraw repository rather than tldraw-examples.

#### [improvement] Ui events followup ([#1354](https://github.com/tldraw/tldraw/pull/1354))

- [ui] Adds source to ui events data object
- [ui] Corrects source for toolbar events
- [ui] Corrects source for clipboard events
- [examples] Updates events example

#### [fix] various text ([#1350](https://github.com/tldraw/tldraw/pull/1350))

- Allow leading whitespace

#### [chore] Bump nanoid ([#1349](https://github.com/tldraw/tldraw/pull/1349))

- Remove unused userId and instanceId props from AppOptions

#### Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled ([#1342](https://github.com/tldraw/tldraw/pull/1342))

- Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled

#### Rework the assets package for strategy-specific imports ([#1341](https://github.com/tldraw/tldraw/pull/1341))

- [dev] If you're using the `@tldraw/assets` package, you need to update your code to `import { getAssetUrlsByImport } from '@tldraw/assets/imports'` instead of `import { getBundlerAssetUrls } from '@tldraw/assets`

---

#### 💥 Breaking Change

- [minor] Mark tlsync-client internal APIs [#1481](https://github.com/tldraw/tldraw/pull/1481) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/store`
  - [tweak] migrate store snapshot arguments [#1659](https://github.com/tldraw/tldraw/pull/1659) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/store`, `@tldraw/tlschema`
  - [improvement] store snapshot types [#1657](https://github.com/tldraw/tldraw/pull/1657) ([@steveruizok](https://github.com/steveruizok))
  - Rename tlstore to store [#1507](https://github.com/tldraw/tldraw/pull/1507) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/ui`
  - [fix] react component runaways, error boundaries [#1625](https://github.com/tldraw/tldraw/pull/1625) ([@steveruizok](https://github.com/steveruizok))
  - Tidy up [#1600](https://github.com/tldraw/tldraw/pull/1600) ([@steveruizok](https://github.com/steveruizok))
  - Use unpkg as a default for serving assets. [#1548](https://github.com/tldraw/tldraw/pull/1548) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Switch to new collaborators component [#1405](https://github.com/tldraw/tldraw/pull/1405) ([@ds300](https://github.com/ds300))
  - [improvement] Ui events followup [#1354](https://github.com/tldraw/tldraw/pull/1354) ([@steveruizok](https://github.com/steveruizok))
  - [feature] ui events [#1326](https://github.com/tldraw/tldraw/pull/1326) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - `ShapeUtil` refactor, `Editor` cleanup [#1611](https://github.com/tldraw/tldraw/pull/1611) ([@steveruizok](https://github.com/steveruizok))
  - [refactor] restore createTLSchema [#1444](https://github.com/tldraw/tldraw/pull/1444) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Remove on drop override [#1612](https://github.com/tldraw/tldraw/pull/1612) ([@steveruizok](https://github.com/steveruizok))
  - Rename `ShapeUtil.render` -> `ShapeUtil.component` [#1609](https://github.com/tldraw/tldraw/pull/1609) ([@steveruizok](https://github.com/steveruizok))
  - [fix] camera culling [#1602](https://github.com/tldraw/tldraw/pull/1602) ([@steveruizok](https://github.com/steveruizok))
  - remove `ShapeUtil.transform` [#1590](https://github.com/tldraw/tldraw/pull/1590) ([@steveruizok](https://github.com/steveruizok))
  - remove `ShapeUtil.point` [#1591](https://github.com/tldraw/tldraw/pull/1591) ([@steveruizok](https://github.com/steveruizok))
  - remove url state, to private [#1402](https://github.com/tldraw/tldraw/pull/1402) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/ui`
  - tldraw.css [#1607](https://github.com/tldraw/tldraw/pull/1607) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`, `@tldraw/validate`
  - Styles API [#1580](https://github.com/tldraw/tldraw/pull/1580) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - mini `defineShape` API [#1563](https://github.com/tldraw/tldraw/pull/1563) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tldraw`, `@tldraw/ui`
  - `ExternalContentManager` for handling external content (files, images, etc) [#1550](https://github.com/tldraw/tldraw/pull/1550) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/ui`
  - hoist opacity out of props [#1526](https://github.com/tldraw/tldraw/pull/1526) ([@SomeHats](https://github.com/SomeHats))
  - Add support for project names [#1340](https://github.com/tldraw/tldraw/pull/1340) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [refactor] Remove `TLShapeDef`, `getShapeUtilByType`. [#1432](https://github.com/tldraw/tldraw/pull/1432) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
  - [fix] Don't synchronize isReadOnly [#1396](https://github.com/tldraw/tldraw/pull/1396) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/store`, `@tldraw/tlschema`, `@tldraw/ui`
  - Independent instance state persistence [#1493](https://github.com/tldraw/tldraw/pull/1493) ([@ds300](https://github.com/ds300))
  - tlschema cleanup [#1509](https://github.com/tldraw/tldraw/pull/1509) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/ui`
  - Renaming types, shape utils, tools [#1513](https://github.com/tldraw/tldraw/pull/1513) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/validate`
  - Rename tlvalidate to validate [#1508](https://github.com/tldraw/tldraw/pull/1508) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`
  - Cleanup @tldraw/ui types / exports [#1504](https://github.com/tldraw/tldraw/pull/1504) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/indices`, `@tldraw/tldraw`, `@tldraw/ui`
  - rename app to editor [#1503](https://github.com/tldraw/tldraw/pull/1503) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`
  - [refactor] User-facing APIs [#1478](https://github.com/tldraw/tldraw/pull/1478) ([@steveruizok](https://github.com/steveruizok))
  - [chore] refactor user preferences [#1435](https://github.com/tldraw/tldraw/pull/1435) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`
  - [refactor] update record names [#1473](https://github.com/tldraw/tldraw/pull/1473) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - [refactor] remove `createTLSchema` [#1440](https://github.com/tldraw/tldraw/pull/1440) ([@steveruizok](https://github.com/steveruizok))
  - [refactor] record migrations [#1430](https://github.com/tldraw/tldraw/pull/1430) ([@steveruizok](https://github.com/steveruizok))
  - [chore] Bump nanoid [#1349](https://github.com/tldraw/tldraw/pull/1349) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/indices`, `@tldraw/utils`
  - Create @tldraw/indices package [#1426](https://github.com/tldraw/tldraw/pull/1426) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/ui`
  - [improvement] rename onEvent to onUiEvent [#1358](https://github.com/tldraw/tldraw/pull/1358) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/tlschema`
  - Rework the assets package for strategy-specific imports [#1341](https://github.com/tldraw/tldraw/pull/1341) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- [feature] Easier store persistence API + persistence example [#1480](https://github.com/tldraw/tldraw/pull/1480) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/ui`
  - Styles API follow-ups [#1636](https://github.com/tldraw/tldraw/pull/1636) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
  - (1/2) Cursor Chat - Presence [#1487](https://github.com/tldraw/tldraw/pull/1487) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Make resizeBox a regular function [#1610](https://github.com/tldraw/tldraw/pull/1610) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] set horizontal position using text alignment [#1419](https://github.com/tldraw/tldraw/pull/1419) ([@steveruizok](https://github.com/steveruizok))
  - [fix] pointer location not updating when moving over editing shape [#1378](https://github.com/tldraw/tldraw/pull/1378) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - [fix] yjs presence [#1603](https://github.com/tldraw/tldraw/pull/1603) ([@steveruizok](https://github.com/steveruizok))
  - (1/2) Timeout collaborator cursors [#1525](https://github.com/tldraw/tldraw/pull/1525) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [feature] add vertical align to note shape [#1539](https://github.com/tldraw/tldraw/pull/1539) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`
  - Add optional generic to `updateShapes` / `createShapes` [#1579](https://github.com/tldraw/tldraw/pull/1579) ([@steveruizok](https://github.com/steveruizok))
  - move v1 migration code into file-format [#1499](https://github.com/tldraw/tldraw/pull/1499) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/ui`
  - Add support for locking shapes [#1447](https://github.com/tldraw/tldraw/pull/1447) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [feature] reduce motion [#1485](https://github.com/tldraw/tldraw/pull/1485) ([@steveruizok](https://github.com/steveruizok))
  - [mini-feature] Following indicator [#1468](https://github.com/tldraw/tldraw/pull/1468) ([@steveruizok](https://github.com/steveruizok))
  - Add SVG cursors for all cursor types [#1416](https://github.com/tldraw/tldraw/pull/1416) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [improvement] refactor paste to support multi-line text [#1398](https://github.com/tldraw/tldraw/pull/1398) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/ui`
  - [3/3] Highlighter styling [#1490](https://github.com/tldraw/tldraw/pull/1490) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/primitives`
  - [2/3] renderer changes to support "sandwich mode" highlighting [#1418](https://github.com/tldraw/tldraw/pull/1418) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/ui`
  - [1/3] initial highlighter shape/tool [#1401](https://github.com/tldraw/tldraw/pull/1401) ([@SomeHats](https://github.com/SomeHats))
  - [feature] add laser pointer [#1412](https://github.com/tldraw/tldraw/pull/1412) ([@steveruizok](https://github.com/steveruizok))
  - Vertical text alignment for geo shapes [#1414](https://github.com/tldraw/tldraw/pull/1414) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/ui`
  - [feature] Add checkbox to toolbar [#1423](https://github.com/tldraw/tldraw/pull/1423) ([@steveruizok](https://github.com/steveruizok))
  - Add stuff for new 'share project' flow [#1403](https://github.com/tldraw/tldraw/pull/1403) ([@ds300](https://github.com/ds300))
  - Snapshot link menu translations [#1399](https://github.com/tldraw/tldraw/pull/1399) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/ui`
  - open menus refactor [#1400](https://github.com/tldraw/tldraw/pull/1400) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Lokalise: Translations update [#1618](https://github.com/tldraw/tldraw/pull/1618) ([@TodePond](https://github.com/TodePond))
- Fa translation [#1500](https://github.com/tldraw/tldraw/pull/1500) ([@mokazemi](https://github.com/mokazemi) [@steveruizok](https://github.com/steveruizok))
- Lokalise: Translations update [#1572](https://github.com/tldraw/tldraw/pull/1572) ([@TodePond](https://github.com/TodePond))
- Update changelog. Bump version. [#1546](https://github.com/tldraw/tldraw/pull/1546) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Lokalise: Translations update [#1515](https://github.com/tldraw/tldraw/pull/1515) ([@TodePond](https://github.com/TodePond))
- VS Code version bump, changelog. [#1497](https://github.com/tldraw/tldraw/pull/1497) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix issue template label not getting applied [#1428](https://github.com/tldraw/tldraw/pull/1428) ([@TodePond](https://github.com/TodePond))
- Bump version. [#1421](https://github.com/tldraw/tldraw/pull/1421) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Update community translations + remove unused translations [#1356](https://github.com/tldraw/tldraw/pull/1356) ([@TodePond](https://github.com/TodePond))
- [docs] Update links in docs [#1357](https://github.com/tldraw/tldraw/pull/1357) ([@steveruizok](https://github.com/steveruizok))
- [chore] Add label options to PR template [#1339](https://github.com/tldraw/tldraw/pull/1339) ([@ds300](https://github.com/ds300))
- Fix publishing [#1338](https://github.com/tldraw/tldraw/pull/1338) ([@SomeHats](https://github.com/SomeHats))
- Update README.md [#1331](https://github.com/tldraw/tldraw/pull/1331) ([@steveruizok](https://github.com/steveruizok))
- [docs] editor API [#1328](https://github.com/tldraw/tldraw/pull/1328) ([@steveruizok](https://github.com/steveruizok))
- [docs] Add missing params docs [#1223](https://github.com/tldraw/tldraw/pull/1223) ([@TodePond](https://github.com/TodePond))
- Add link to original tldraw within issue template [#1225](https://github.com/tldraw/tldraw/pull/1225) ([@TodePond](https://github.com/TodePond))
- Fix issue templates not appearing [#1228](https://github.com/tldraw/tldraw/pull/1228) ([@TodePond](https://github.com/TodePond))
- [improvement] readme / contributing [#1199](https://github.com/tldraw/tldraw/pull/1199) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [improvement] add bug report / feature request [#1218](https://github.com/tldraw/tldraw/pull/1218) ([@steveruizok](https://github.com/steveruizok))
- add `env` and prefix output options to exec [#1217](https://github.com/tldraw/tldraw/pull/1217) ([@SomeHats](https://github.com/SomeHats))
- [wip] Going bublic [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- [chore] use explicit yarn in clean script [#1216](https://github.com/tldraw/tldraw/pull/1216) ([@ds300](https://github.com/ds300))
- fix husky install [#1212](https://github.com/tldraw/tldraw/pull/1212) ([@SomeHats](https://github.com/SomeHats))
- Alex/test [#1202](https://github.com/tldraw/tldraw/pull/1202) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Fix crash when rotating a deleted shape [#1658](https://github.com/tldraw/tldraw/pull/1658) ([@TodePond](https://github.com/TodePond))
  - [fix] pen mode touches [#1655](https://github.com/tldraw/tldraw/pull/1655) ([@steveruizok](https://github.com/steveruizok))
  - Fix text shapes not having colour [#1649](https://github.com/tldraw/tldraw/pull/1649) ([@TodePond](https://github.com/TodePond))
  - Fix SVG cursors not being used [#1639](https://github.com/tldraw/tldraw/pull/1639) ([@TodePond](https://github.com/TodePond))
  - [fix] tldraw file drop [#1616](https://github.com/tldraw/tldraw/pull/1616) ([@steveruizok](https://github.com/steveruizok))
  - Make sure loading screens use dark mode user preference. [#1552](https://github.com/tldraw/tldraw/pull/1552) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [fix] Remove group shape export backgrounds [#1587](https://github.com/tldraw/tldraw/pull/1587) ([@steveruizok](https://github.com/steveruizok))
  - Move the loading of assets to the TldrawEditorWithReadyStore so that all code paths load the assets. [#1561](https://github.com/tldraw/tldraw/pull/1561) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - shapes folder, move tools into shape defs [#1574](https://github.com/tldraw/tldraw/pull/1574) ([@SomeHats](https://github.com/SomeHats))
  - offset drop point by editor client rect [#1564](https://github.com/tldraw/tldraw/pull/1564) ([@BrianHung](https://github.com/BrianHung))
  - More misc sync fixes [#1559](https://github.com/tldraw/tldraw/pull/1559) ([@ds300](https://github.com/ds300))
  - Misc sync fixes [#1555](https://github.com/tldraw/tldraw/pull/1555) ([@ds300](https://github.com/ds300))
  - [fix] Shift key code / nudge [#1537](https://github.com/tldraw/tldraw/pull/1537) ([@steveruizok](https://github.com/steveruizok))
  - scale exported canvases when they reach the browsers max size [#1536](https://github.com/tldraw/tldraw/pull/1536) ([@SomeHats](https://github.com/SomeHats))
  - [fix] control click on mac [#1535](https://github.com/tldraw/tldraw/pull/1535) ([@steveruizok](https://github.com/steveruizok))
  - Fix being able to undo following [#1531](https://github.com/tldraw/tldraw/pull/1531) ([@TodePond](https://github.com/TodePond))
  - send user prefs data in broadcast msg [#1466](https://github.com/tldraw/tldraw/pull/1466) ([@ds300](https://github.com/ds300))
  - Fix positioning of default cursor [#1458](https://github.com/tldraw/tldraw/pull/1458) ([@TodePond](https://github.com/TodePond))
  - change pointer cursor to white [#1454](https://github.com/tldraw/tldraw/pull/1454) ([@TodePond](https://github.com/TodePond))
  - Fix cursor shadow getting clipped [#1441](https://github.com/tldraw/tldraw/pull/1441) ([@TodePond](https://github.com/TodePond))
  - Fix new wobble [#1431](https://github.com/tldraw/tldraw/pull/1431) ([@TodePond](https://github.com/TodePond))
  - [fix] laser pointer [#1429](https://github.com/tldraw/tldraw/pull/1429) ([@steveruizok](https://github.com/steveruizok))
  - [fix] reorder handles in front of selection [#1420](https://github.com/tldraw/tldraw/pull/1420) ([@steveruizok](https://github.com/steveruizok))
  - [firefox] Fix the pointer getting stuck down when you press the control key [#1390](https://github.com/tldraw/tldraw/pull/1390) ([@TodePond](https://github.com/TodePond))
  - fix viewport following [#1411](https://github.com/tldraw/tldraw/pull/1411) ([@ds300](https://github.com/ds300))
  - fix pasted tabs not getting converted to space [#1388](https://github.com/tldraw/tldraw/pull/1388) ([@TodePond](https://github.com/TodePond))
  - Delete an empty text shape when clicking on another text shape. [#1384](https://github.com/tldraw/tldraw/pull/1384) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix setting the grid mode. [#1386](https://github.com/tldraw/tldraw/pull/1386) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix selection foreground being misaligned [#1380](https://github.com/tldraw/tldraw/pull/1380) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - Expand selection outline for single-selected draw shape [#1379](https://github.com/tldraw/tldraw/pull/1379) ([@SomeHats](https://github.com/SomeHats))
  - [fix] Allow interactions with embeds in readonly mode [#1333](https://github.com/tldraw/tldraw/pull/1333) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [perf] deleteShapes [#1373](https://github.com/tldraw/tldraw/pull/1373) ([@ds300](https://github.com/ds300))
  - fix a couple of consistency assumptions [#1365](https://github.com/tldraw/tldraw/pull/1365) ([@ds300](https://github.com/ds300))
  - [fix] various text [#1350](https://github.com/tldraw/tldraw/pull/1350) ([@steveruizok](https://github.com/steveruizok))
  - [fix] tabs in text exports [#1323](https://github.com/tldraw/tldraw/pull/1323) ([@steveruizok](https://github.com/steveruizok))
  - [fix] update useTransform.ts [#1327](https://github.com/tldraw/tldraw/pull/1327) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] dragging start distance on coarse pointer [#1220](https://github.com/tldraw/tldraw/pull/1220) ([@steveruizok](https://github.com/steveruizok))
  - [fix] SVG export for arrows with labels but no arrowheads [#1229](https://github.com/tldraw/tldraw/pull/1229) ([@steveruizok](https://github.com/steveruizok))
  - add docs for TLShapeUtil [#1215](https://github.com/tldraw/tldraw/pull/1215) ([@TodePond](https://github.com/TodePond))
  - [fix] publish [#1222](https://github.com/tldraw/tldraw/pull/1222) ([@ds300](https://github.com/ds300))
  - [fix] typo in isFocusingInput [#1221](https://github.com/tldraw/tldraw/pull/1221) ([@ds300](https://github.com/ds300))
  - [feat] new LiveCollaborators behind feature flag [#1219](https://github.com/tldraw/tldraw/pull/1219) ([@ds300](https://github.com/ds300))
  - [fix] collaborator render order [#1213](https://github.com/tldraw/tldraw/pull/1213) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/ui`
  - 3/2 Cursor chat [#1623](https://github.com/tldraw/tldraw/pull/1623) ([@steveruizok](https://github.com/steveruizok))
  - [fix] embeds [#1578](https://github.com/tldraw/tldraw/pull/1578) ([@steveruizok](https://github.com/steveruizok))
  - highlighter fixes [#1530](https://github.com/tldraw/tldraw/pull/1530) ([@SomeHats](https://github.com/SomeHats))
  - Feature flags rework [#1474](https://github.com/tldraw/tldraw/pull/1474) ([@SomeHats](https://github.com/SomeHats))
  - remove svg layer, html all the things, rs to tl [#1227](https://github.com/tldraw/tldraw/pull/1227) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - Added `pHYs` to import/export of png images [#1200](https://github.com/tldraw/tldraw/pull/1200) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - [fix] tldraw api report [#1615](https://github.com/tldraw/tldraw/pull/1615) ([@steveruizok](https://github.com/steveruizok))
  - Fix to not ignore the `userId` option for `<Tldraw/>` component in `@tldraw/tldraw` [#1205](https://github.com/tldraw/tldraw/pull/1205) ([@orangemug](https://github.com/orangemug))
- `@tldraw/editor`, `@tldraw/primitives`
  - [refactor] snapping [#1589](https://github.com/tldraw/tldraw/pull/1589) ([@steveruizok](https://github.com/steveruizok))
  - Fix arrows with weird bends crashing [#1540](https://github.com/tldraw/tldraw/pull/1540) ([@TodePond](https://github.com/TodePond))
  - ensure that fixed points stay fixed [#1523](https://github.com/tldraw/tldraw/pull/1523) ([@steveruizok](https://github.com/steveruizok))
  - Use `strokePathData` for `<ShapeFill/>` path to avoid bugs in the inner path algo [#1207](https://github.com/tldraw/tldraw/pull/1207) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - update exports for user presence [#1583](https://github.com/tldraw/tldraw/pull/1583) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] Embed shape cleanup [#1569](https://github.com/tldraw/tldraw/pull/1569) ([@steveruizok](https://github.com/steveruizok))
  - Add migration for horizontal alignment [#1443](https://github.com/tldraw/tldraw/pull/1443) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [chore] move schema construction to tlschema package [#1334](https://github.com/tldraw/tldraw/pull/1334) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/ui`, `@tldraw/utils`
  - Asset improvements [#1557](https://github.com/tldraw/tldraw/pull/1557) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/ui`
  - Use `"Toggle locked"` [#1538](https://github.com/tldraw/tldraw/pull/1538) ([@steveruizok](https://github.com/steveruizok))
  - Select locked shapes on long press [#1529](https://github.com/tldraw/tldraw/pull/1529) ([@steveruizok](https://github.com/steveruizok))
  - remove safari special-casing for paste [#1470](https://github.com/tldraw/tldraw/pull/1470) ([@SomeHats](https://github.com/SomeHats))
  - Don't allow `g` keyboard shortcut in readonly mode, show laser tool in the toolbar [#1459](https://github.com/tldraw/tldraw/pull/1459) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Fix people menu button border on android [#1471](https://github.com/tldraw/tldraw/pull/1471) ([@TodePond](https://github.com/TodePond))
  - [fix] lock option for laser tool [#1460](https://github.com/tldraw/tldraw/pull/1460) ([@steveruizok](https://github.com/steveruizok))
  - Add laser keyboard shortcut. [#1467](https://github.com/tldraw/tldraw/pull/1467) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] make follow icon visible on iPad [#1462](https://github.com/tldraw/tldraw/pull/1462) ([@steveruizok](https://github.com/steveruizok))
  - [fix] page item submenu [#1461](https://github.com/tldraw/tldraw/pull/1461) ([@steveruizok](https://github.com/steveruizok))
  - Add translations for "Leave shared project" action [#1394](https://github.com/tldraw/tldraw/pull/1394) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [fix] page menu, drag handle css [#1406](https://github.com/tldraw/tldraw/pull/1406) ([@steveruizok](https://github.com/steveruizok))
  - Don't allow the users to use keyboard shortcuts to select tools in readonly mode. [#1382](https://github.com/tldraw/tldraw/pull/1382) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Disabling middle click paste in favour of panning [#1335](https://github.com/tldraw/tldraw/pull/1335) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
  - Export Events stuff [#1360](https://github.com/tldraw/tldraw/pull/1360) ([@steveruizok](https://github.com/steveruizok))
  - Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled [#1342](https://github.com/tldraw/tldraw/pull/1342) ([@orangemug](https://github.com/orangemug))
  - [tiny] rename show menu paste [#1332](https://github.com/tldraw/tldraw/pull/1332) ([@steveruizok](https://github.com/steveruizok))
  - update @radix-ui/react-popover to 1.0.6-rc.5 [#1206](https://github.com/tldraw/tldraw/pull/1206) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/file-format`
  - Filter out unused assets. [#1502](https://github.com/tldraw/tldraw/pull/1502) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - Stricter ID types [#1439](https://github.com/tldraw/tldraw/pull/1439) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/primitives`, `@tldraw/ui`
  - Measure individual words instead of just line breaks for text exports [#1397](https://github.com/tldraw/tldraw/pull/1397) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tlschema`
  - [perf] make ensureStoreIsUsable scale better [#1362](https://github.com/tldraw/tldraw/pull/1362) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/utils`
  - presence-related fixes [#1361](https://github.com/tldraw/tldraw/pull/1361) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/ui`
  - [feature] `check-box` geo shape [#1330](https://github.com/tldraw/tldraw/pull/1330) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/ui`
  - New vite-based examples app [#1226](https://github.com/tldraw/tldraw/pull/1226) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/file-format`, `@tldraw/polyfills`, `@tldraw/primitives`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - [wip] Going bublic [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/polyfills`, `@tldraw/primitives`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
  - [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
  - [wip] Going bublic [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- `@tldraw/tlschema`, `@tldraw/ui`
  - [fix] pick a better default language [#1201](https://github.com/tldraw/tldraw/pull/1201) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - derived presence state [#1204](https://github.com/tldraw/tldraw/pull/1204) ([@ds300](https://github.com/ds300))

#### ⚠️ Pushed to `main`

- Update publish-new.yml ([@steveruizok](https://github.com/steveruizok))
- Update lerna.json ([@steveruizok](https://github.com/steveruizok))
- Update publish-new.ts ([@steveruizok](https://github.com/steveruizok))
- change App to Editor in docs ([@TodePond](https://github.com/TodePond))
- rename api.mdx to editor.mdx ([@TodePond](https://github.com/TodePond))
- remove e2e files ([@steveruizok](https://github.com/steveruizok))
- main: notify huppy after release ([@SomeHats](https://github.com/SomeHats))
- main: exclude @tldraw/assets from vite dep optimization to fix examples links ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/indices`, `@tldraw/polyfills`, `@tldraw/primitives`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`, `@tldraw/validate`
  - update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- [chore] bump vscode extension to 2.0.9 [#1662](https://github.com/tldraw/tldraw/pull/1662) ([@steveruizok](https://github.com/steveruizok))
- untrack generated files [#1646](https://github.com/tldraw/tldraw/pull/1646) ([@steveruizok](https://github.com/steveruizok))
- Update pr template [#1570](https://github.com/tldraw/tldraw/pull/1570) ([@steveruizok](https://github.com/steveruizok))
- Add contributor license agreement. [#1556](https://github.com/tldraw/tldraw/pull/1556) ([@steveruizok](https://github.com/steveruizok))
- Reinstate auto [#1524](https://github.com/tldraw/tldraw/pull/1524) ([@ds300](https://github.com/ds300))
- [infra] use npx to run auto [#1521](https://github.com/tldraw/tldraw/pull/1521) ([@ds300](https://github.com/ds300))
- Revert 09c36781 & tweak linting [#1501](https://github.com/tldraw/tldraw/pull/1501) ([@SomeHats](https://github.com/SomeHats))
- [fix] eslint from brivate [#1498](https://github.com/tldraw/tldraw/pull/1498) ([@steveruizok](https://github.com/steveruizok))
- [chore] remove webdriver dependencies / scripts [#1488](https://github.com/tldraw/tldraw/pull/1488) ([@steveruizok](https://github.com/steveruizok))
- [fix] local e2e script [#1442](https://github.com/tldraw/tldraw/pull/1442) ([@steveruizok](https://github.com/steveruizok))
- [chore] remove yarnrc-private.yml [#1427](https://github.com/tldraw/tldraw/pull/1427) ([@steveruizok](https://github.com/steveruizok))
- [fix] example routes on vercel [#1391](https://github.com/tldraw/tldraw/pull/1391) ([@steveruizok](https://github.com/steveruizok))
- Neaten up pr template [#1369](https://github.com/tldraw/tldraw/pull/1369) ([@TodePond](https://github.com/TodePond))
- remove references to tldraw-lite [#1367](https://github.com/tldraw/tldraw/pull/1367) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/ui`
  - Explicit shape type checks [#1594](https://github.com/tldraw/tldraw/pull/1594) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] bookmark shape logic [#1568](https://github.com/tldraw/tldraw/pull/1568) ([@steveruizok](https://github.com/steveruizok))
  - Simplify static cursors [#1520](https://github.com/tldraw/tldraw/pull/1520) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/ui`
  - move some kbds into actions and tools [#1585](https://github.com/tldraw/tldraw/pull/1585) ([@BrianHung](https://github.com/BrianHung) [@steveruizok](https://github.com/steveruizok))
  - Add localizations for snapshots links [#1347](https://github.com/tldraw/tldraw/pull/1347) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - use the right TLEventHandlers [#1486](https://github.com/tldraw/tldraw/pull/1486) ([@judicaelandria](https://github.com/judicaelandria) [@steveruizok](https://github.com/steveruizok))
  - yjs example [#1560](https://github.com/tldraw/tldraw/pull/1560) ([@steveruizok](https://github.com/steveruizok))
  - rename app folder to editor [#1528](https://github.com/tldraw/tldraw/pull/1528) ([@steveruizok](https://github.com/steveruizok))
  - [fix] overlay rendering issues [#1389](https://github.com/tldraw/tldraw/pull/1389) ([@steveruizok](https://github.com/steveruizok))
  - Remove commented code in App [#1377](https://github.com/tldraw/tldraw/pull/1377) ([@steveruizok](https://github.com/steveruizok))
  - enable eslint for test files [#1363](https://github.com/tldraw/tldraw/pull/1363) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tlschema`
  - restore styles sets exports [#1512](https://github.com/tldraw/tldraw/pull/1512) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/primitives`
  - replace console.log with nicelog [#1496](https://github.com/tldraw/tldraw/pull/1496) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/indices`, `@tldraw/primitives`, `@tldraw/tldraw`, `@tldraw/ui`
  - [chore] remove benchmark [#1489](https://github.com/tldraw/tldraw/pull/1489) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - [tiny] add isPageId [#1482](https://github.com/tldraw/tldraw/pull/1482) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/polyfills`, `@tldraw/primitives`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))

#### 📝 Documentation

- [fix] remove docs scripts [#1651](https://github.com/tldraw/tldraw/pull/1651) ([@steveruizok](https://github.com/steveruizok))
- (2/2) [docs] Fix links to API. [#1654](https://github.com/tldraw/tldraw/pull/1654) ([@TodePond](https://github.com/TodePond))
- (1/2) [docs] Restore some missing changes [#1652](https://github.com/tldraw/tldraw/pull/1652) ([@TodePond](https://github.com/TodePond))
- [docs] Remove embeds page [#1653](https://github.com/tldraw/tldraw/pull/1653) ([@TodePond](https://github.com/TodePond))
- docs: remove not accepting contributions notice [#1647](https://github.com/tldraw/tldraw/pull/1647) ([@gabrielchl](https://github.com/gabrielchl))
- [docs] Add table of contents to Editor page [#1642](https://github.com/tldraw/tldraw/pull/1642) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- remove docs (again) [#1643](https://github.com/tldraw/tldraw/pull/1643) ([@steveruizok](https://github.com/steveruizok))
- [1/2] Move docs to brivate [#1640](https://github.com/tldraw/tldraw/pull/1640) ([@steveruizok](https://github.com/steveruizok))
- [docs] Allow sidebar to be scrolled on short screens [#1632](https://github.com/tldraw/tldraw/pull/1632) ([@TodePond](https://github.com/TodePond))
- [docs] Add feedback when you search [#1633](https://github.com/tldraw/tldraw/pull/1633) ([@TodePond](https://github.com/TodePond))
- [docs] Separate some pages out of the Docs section [#1626](https://github.com/tldraw/tldraw/pull/1626) ([@TodePond](https://github.com/TodePond))
- [docs] Fix wrong cursor when hovering buttons [#1630](https://github.com/tldraw/tldraw/pull/1630) ([@TodePond](https://github.com/TodePond))
- [docs] Tighten up wording & structure of Usage page [#1624](https://github.com/tldraw/tldraw/pull/1624) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [docs] Tighten up Editor page introduction [#1622](https://github.com/tldraw/tldraw/pull/1622) ([@TodePond](https://github.com/TodePond))
- [docs] Tighten up Introduction page [#1621](https://github.com/tldraw/tldraw/pull/1621) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [docs] Simplify paths for uncategorised pages [#1619](https://github.com/tldraw/tldraw/pull/1619) ([@TodePond](https://github.com/TodePond))
- Auto content refresh for docs site [#1606](https://github.com/tldraw/tldraw/pull/1606) ([@steveruizok](https://github.com/steveruizok))
- Remove `@tldraw/utils` from the docs site [#1596](https://github.com/tldraw/tldraw/pull/1596) ([@TodePond](https://github.com/TodePond))
- [docs] Add barebones note about translations [#1593](https://github.com/tldraw/tldraw/pull/1593) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Change app to editor in docs [#1592](https://github.com/tldraw/tldraw/pull/1592) ([@TodePond](https://github.com/TodePond))
- add presence to yjs example [#1582](https://github.com/tldraw/tldraw/pull/1582) ([@steveruizok](https://github.com/steveruizok))
- fix: properly remove awareness from store [#1565](https://github.com/tldraw/tldraw/pull/1565) ([@shahriar-shojib](https://github.com/shahriar-shojib) [@steveruizok](https://github.com/steveruizok))
- Add anchor targets to our headings. [#1571](https://github.com/tldraw/tldraw/pull/1571) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix README typo [#1451](https://github.com/tldraw/tldraw/pull/1451) ([@fossinating](https://github.com/fossinating) [@steveruizok](https://github.com/steveruizok))
- Update examples links to point to examples folder. [#1522](https://github.com/tldraw/tldraw/pull/1522) ([@steveruizok](https://github.com/steveruizok))
- Update docs links + guides + build [#1422](https://github.com/tldraw/tldraw/pull/1422) ([@TodePond](https://github.com/TodePond))
- Update codesandbox + example link [#1368](https://github.com/tldraw/tldraw/pull/1368) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`
  - [improvement] custom shapes example [#1660](https://github.com/tldraw/tldraw/pull/1660) ([@steveruizok](https://github.com/steveruizok))
  - Add tsdocs to Editor methods [#1581](https://github.com/tldraw/tldraw/pull/1581) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [Docs] Change some editor properties to methods [#1553](https://github.com/tldraw/tldraw/pull/1553) ([@TodePond](https://github.com/TodePond))
  - [Docs] Change some internal methods to public [#1554](https://github.com/tldraw/tldraw/pull/1554) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Styles API docs [#1641](https://github.com/tldraw/tldraw/pull/1641) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - TLSchema readme [#1506](https://github.com/tldraw/tldraw/pull/1506) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- speed up playwright and add visual regression tests [#1638](https://github.com/tldraw/tldraw/pull/1638) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Disable nightly/on-demand webdriver scripts [#1366](https://github.com/tldraw/tldraw/pull/1366) ([@orangemug](https://github.com/orangemug))
- Adds CI for webdriver tests [#1343](https://github.com/tldraw/tldraw/pull/1343) ([@orangemug](https://github.com/orangemug))
- Added initial webdriver tests [#1337](https://github.com/tldraw/tldraw/pull/1337) ([@orangemug](https://github.com/orangemug))
- `@tldraw/editor`
  - update editor tests [#1547](https://github.com/tldraw/tldraw/pull/1547) ([@steveruizok](https://github.com/steveruizok))
  - Add DSL to make writing shape-layout test cases much easier [#1413](https://github.com/tldraw/tldraw/pull/1413) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/ui`
  - Add playwright tests [#1484](https://github.com/tldraw/tldraw/pull/1484) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- [chore] update wdio-vscode-service [#1346](https://github.com/tldraw/tldraw/pull/1346) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tlschema`, `@tldraw/ui`
  - Incorporate signia as @tldraw/state [#1620](https://github.com/tldraw/tldraw/pull/1620) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/polyfills`, `@tldraw/tldraw`, `@tldraw/ui`
  - Revert "Update dependencies (#1613)" [#1617](https://github.com/tldraw/tldraw/pull/1617) ([@SomeHats](https://github.com/SomeHats))
  - Update dependencies [#1613](https://github.com/tldraw/tldraw/pull/1613) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - update use-gesture [#1453](https://github.com/tldraw/tldraw/pull/1453) ([@ds300](https://github.com/ds300))

#### Authors: 13

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David ([@fossinating](https://github.com/fossinating))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Judicael ([@judicaelandria](https://github.com/judicaelandria))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Mohammad Kazemi ([@mokazemi](https://github.com/mokazemi))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Shahriar Shojib ([@shahriar-shojib](https://github.com/shahriar-shojib))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
