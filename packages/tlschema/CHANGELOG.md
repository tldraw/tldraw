# v3.3.0 (Wed Oct 09 2024)

### Release Notes

#### [sync] Set instance.isReadonly automatically ([#4673](https://github.com/tldraw/tldraw/pull/4673))

- Puts the editor into readonly mode automatically when the tlsync server responds in readonly mode.
- Adds the `editor.getIsReadonly()` method.
- Fixes a bug where arrow labels could be edited in readonly mode.

#### Disable debug mode in development by default ([#4629](https://github.com/tldraw/tldraw/pull/4629))

- Turns off debug mode by default in local development.

---

#### 🐛 Bug Fix

- Disable debug mode in development by default [#4629](https://github.com/tldraw/tldraw/pull/4629) ([@ds300](https://github.com/ds300))

#### 💄 Product Improvements

- [sync] Set instance.isReadonly automatically [#4673](https://github.com/tldraw/tldraw/pull/4673) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v3.1.0 (Wed Sep 25 2024)

#### 🐛 Bug Fix

- npm: make our React packages consistent [#4547](https://github.com/tldraw/tldraw/pull/4547) ([@mimecuvalo](https://github.com/mimecuvalo) [@MitjaBezensek](https://github.com/MitjaBezensek))
- docs: cleanup/add readmes/licenses [#4542](https://github.com/tldraw/tldraw/pull/4542) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
- Clean up `apps` directory [#4548](https://github.com/tldraw/tldraw/pull/4548) ([@SomeHats](https://github.com/SomeHats))
- licenses: add MIT and update GB ones to match US [#4517](https://github.com/tldraw/tldraw/pull/4517) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.0.0 (Fri Sep 13 2024)

### Release Notes

#### Detect multiple installed versions of tldraw packages ([#4398](https://github.com/tldraw/tldraw/pull/4398))

- We detect when there are multiple versions of tldraw installed and let you know, as this can cause bugs in your application

#### [api] Widen snapshots pit of success ([#4392](https://github.com/tldraw/tldraw/pull/4392))

- Improved loadSnapshot to preserve page state like camera position and current page if no session snapshot is provided.

#### Custom embeds API ([#4326](https://github.com/tldraw/tldraw/pull/4326))

Adds the ability to customize the embeds that are supported. You can now customize or reorder the existing embeds, as well as add completely new ones.

#### Rename `StoreOptions.multiplayerStatus` ([#4349](https://github.com/tldraw/tldraw/pull/4349))

- Renames `StoreOptions.multiplayerStatus` to `StoreOptions.collaboration.status`.

#### remove onEditorMount prop ([#4320](https://github.com/tldraw/tldraw/pull/4320))

- **Breaking:** the `onEditorMount` option to `createTLStore` is now called `onMount`

#### Move from function properties to methods ([#4288](https://github.com/tldraw/tldraw/pull/4288))

- Adds eslint rules for enforcing the use of methods instead of function properties and fixes / disables all the resulting errors.

---

#### 🐛 Bug Fix

- [SORRY, PLEASE MERGE] 3.0 megabus [#4494](https://github.com/tldraw/tldraw/pull/4494) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- consistent function style [#4468](https://github.com/tldraw/tldraw/pull/4468) ([@SomeHats](https://github.com/SomeHats))
- Update READMEs. [#4377](https://github.com/tldraw/tldraw/pull/4377) ([@steveruizok](https://github.com/steveruizok))
- Fix some broken links in the docs [#4340](https://github.com/tldraw/tldraw/pull/4340) ([@steveruizok](https://github.com/steveruizok))

#### 💄 Product Improvements

- inline nanoid [#4410](https://github.com/tldraw/tldraw/pull/4410) ([@SomeHats](https://github.com/SomeHats))
- [api] Widen snapshots pit of success [#4392](https://github.com/tldraw/tldraw/pull/4392) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- Custom embeds API [#4326](https://github.com/tldraw/tldraw/pull/4326) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🛠️ API Changes

- Detect multiple installed versions of tldraw packages [#4398](https://github.com/tldraw/tldraw/pull/4398) ([@SomeHats](https://github.com/SomeHats))
- Rename `StoreOptions.multiplayerStatus` [#4349](https://github.com/tldraw/tldraw/pull/4349) ([@steveruizok](https://github.com/steveruizok))
- remove onEditorMount prop [#4320](https://github.com/tldraw/tldraw/pull/4320) ([@SomeHats](https://github.com/SomeHats))
- Move from function properties to methods [#4288](https://github.com/tldraw/tldraw/pull/4288) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.4.0 (Mon Jul 22 2024)

### Release Notes

#### Finesse sync api ([#4212](https://github.com/tldraw/tldraw/pull/4212))

- Fixed a bug with…

#### Make asset.fileSize optional ([#4206](https://github.com/tldraw/tldraw/pull/4206))

- Made the `fileSize` property of `TLImageAsset` and `TLVideoAsset` optional

#### Explicitly type shape props and defaults ([#4191](https://github.com/tldraw/tldraw/pull/4191))

- Explicitly declare type types of default shapes etc. and shape props for better documentation

#### [1/4] Blob storage in TLStore ([#4068](https://github.com/tldraw/tldraw/pull/4068))

Introduce a new `assets` option for the store, describing how to save and retrieve asset blobs like images & videos from e.g. a user-content CDN. These are accessible through `editor.uploadAsset` and `editor.resolveAssetUrl`. This supplements the existing `registerExternalAssetHandler` API: `registerExternalAssetHandler` is for customising metadata extraction, and should call `editor.uploadAsset` to save assets. Existing `registerExternalAssetHandler` calls will still work, but if you're only using them to configure uploads and don't want to customise metadata extraction, consider switching to the new `assets` store prop.

#### Flip images ([#4113](https://github.com/tldraw/tldraw/pull/4113))

- Adds the ability to flip images.

#### Make arrow sequence not retroactive ([#4090](https://github.com/tldraw/tldraw/pull/4090))

- Fixed a bug with...

#### Add `setDefaultValue` to `StyleProp` ([#4044](https://github.com/tldraw/tldraw/pull/4044))

- Adds a method for changing the default style of a `StyleProp` instance.

---

#### 🐛 Bug Fix

- Cloudflare sync template [#4179](https://github.com/tldraw/tldraw/pull/4179) ([@SomeHats](https://github.com/SomeHats))
- Demo server bookmark unfurl endpoint [#4062](https://github.com/tldraw/tldraw/pull/4062) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fixes

- Make arrow sequence not retroactive [#4090](https://github.com/tldraw/tldraw/pull/4090) ([@ds300](https://github.com/ds300))

#### 💄 Product Improvements

- [3/5] Automatically enable multiplayer UI when using demo sync [#4119](https://github.com/tldraw/tldraw/pull/4119) ([@SomeHats](https://github.com/SomeHats))
- Flip images [#4113](https://github.com/tldraw/tldraw/pull/4113) ([@steveruizok](https://github.com/steveruizok))

#### 🎉 New Features

- Add `setDefaultValue` to `StyleProp` [#4044](https://github.com/tldraw/tldraw/pull/4044) ([@steveruizok](https://github.com/steveruizok))

#### 🛠️ API Changes

- Finesse sync api [#4212](https://github.com/tldraw/tldraw/pull/4212) ([@ds300](https://github.com/ds300))
- Make asset.fileSize optional [#4206](https://github.com/tldraw/tldraw/pull/4206) ([@steveruizok](https://github.com/steveruizok))
- Explicitly type shape props and defaults [#4191](https://github.com/tldraw/tldraw/pull/4191) ([@SomeHats](https://github.com/SomeHats))
- [2/4] Rename sync hooks, add bookmarks to demo [#4094](https://github.com/tldraw/tldraw/pull/4094) ([@SomeHats](https://github.com/SomeHats))
- [1/4] Blob storage in TLStore [#4068](https://github.com/tldraw/tldraw/pull/4068) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.3.0 (Tue Jun 25 2024)

### Release Notes

#### Dynamic size mode + fill fill ([#3835](https://github.com/tldraw/tldraw/pull/3835))

- Adds a dynamic size user preferences.
- Removes double click to reset scale on text shapes.
- Removes double click to reset autosize on text shapes.

#### assets: make option to transform urls dynamically / LOD ([#3827](https://github.com/tldraw/tldraw/pull/3827))

- Assets: make option to transform urls dynamically to provide different sized images on demand.

---

#### 📚 SDK Changes

- Dynamic size mode + fill fill [#3835](https://github.com/tldraw/tldraw/pull/3835) ([@steveruizok](https://github.com/steveruizok) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- assets: make option to transform urls dynamically / LOD [#3827](https://github.com/tldraw/tldraw/pull/3827) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 4

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.2.0 (Tue Jun 11 2024)

### Release Notes

#### bookmark: fix up double request and rework extractor ([#3856](https://github.com/tldraw/tldraw/pull/3856))

- Bookmarks: fix up double request and rework extractor code.

#### Snapshots pit of success ([#3811](https://github.com/tldraw/tldraw/pull/3811))

- Add a brief release note for your PR here.

#### Add heart geo shape ([#3787](https://github.com/tldraw/tldraw/pull/3787))

- Adds a heart shape to the geo shape set.

#### rework canBind callback ([#3797](https://github.com/tldraw/tldraw/pull/3797))

#### Breaking changes
The `canBind` flag now accepts an options object instead of just the shape in question. If you're relying on its arguments, you need to change from `canBind(shape) {}` to `canBind({shape}) {}`.

#### Bindings ([#3326](https://github.com/tldraw/tldraw/pull/3326))

#### Breaking changes
- The `start` and `end` properties on `TLArrowShape` no longer have `type: point | binding`. Instead, they're always a point, which may be out of date if a binding exists. To check for & retrieve arrow bindings, use `getArrowBindings(editor, shape)` instead.
- `getArrowTerminalsInArrowSpace` must be passed a `TLArrowBindings` as a third argument: `getArrowTerminalsInArrowSpace(editor, shape, getArrowBindings(editor, shape))`
- The following types have been renamed:
    - `ShapeProps` -> `RecordProps`
    - `ShapePropsType` -> `RecordPropsType`
    - `TLShapePropsMigrations` -> `TLPropsMigrations`
    - `SchemaShapeInfo` -> `SchemaPropsInfo`

#### Camera options ([#3282](https://github.com/tldraw/tldraw/pull/3282))

- SDK: Adds camera options.

#### embed: allow embeds like YouTube to link back to its site ([#3609](https://github.com/tldraw/tldraw/pull/3609))

- Embeds: fix being able to click on links that go back to the embed's site (e.g. YouTube)

#### Separate text-align property for shapes ([#3627](https://github.com/tldraw/tldraw/pull/3627))

- Separates the text align property for text shapes and labels.

#### Add desmos graph embed type ([#3608](https://github.com/tldraw/tldraw/pull/3608))

- (feature) add desmos embed

#### Expose migrations, validators, and versions from tlschema ([#3613](https://github.com/tldraw/tldraw/pull/3613))

Previously, we weren't exporting migrations & validators for our default shapes. This meant that it wasn't possible to make your own tlschema with both our default shapes and some of your own (e.g. for custom multiplayer). This fixes that by exposing all the migrations, validators, and versions from tlschema, plus `defaultShapeSchemas` which can be passed directly to `createTLSchema`

#### fix migration exports ([#3586](https://github.com/tldraw/tldraw/pull/3586))

- Expose `createShapePropsMigrationIds`, `defaultEditorAssetUrls`, `PORTRAIT_BREAKPOINT`, `useDefaultColorTheme`, & `getPerfectDashProps`

---

#### 🐛 Bug Fix

- Lokalise: Translations update [#3649](https://github.com/tldraw/tldraw/pull/3649) ([@TodePond](https://github.com/TodePond))

#### 📚 SDK Changes

- Snapshots pit of success [#3811](https://github.com/tldraw/tldraw/pull/3811) ([@ds300](https://github.com/ds300))
- Add heart geo shape [#3787](https://github.com/tldraw/tldraw/pull/3787) ([@steveruizok](https://github.com/steveruizok))
- rework canBind callback [#3797](https://github.com/tldraw/tldraw/pull/3797) ([@SomeHats](https://github.com/SomeHats))
- Force `interface` instead of `type` for better docs [#3815](https://github.com/tldraw/tldraw/pull/3815) ([@SomeHats](https://github.com/SomeHats))
- Bindings [#3326](https://github.com/tldraw/tldraw/pull/3326) ([@SomeHats](https://github.com/SomeHats))
- Camera options [#3282](https://github.com/tldraw/tldraw/pull/3282) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- embed: allow embeds like YouTube to link back to its site [#3609](https://github.com/tldraw/tldraw/pull/3609) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Separate text-align property for shapes [#3627](https://github.com/tldraw/tldraw/pull/3627) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Expose migrations, validators, and versions from tlschema [#3613](https://github.com/tldraw/tldraw/pull/3613) ([@SomeHats](https://github.com/SomeHats))
- Automatic undo/redo [#3364](https://github.com/tldraw/tldraw/pull/3364) ([@SomeHats](https://github.com/SomeHats))
- fix migration exports [#3586](https://github.com/tldraw/tldraw/pull/3586) ([@SomeHats](https://github.com/SomeHats))

#### 🖥️ tldraw.com Changes

- bookmark: fix up double request and rework extractor [#3856](https://github.com/tldraw/tldraw/pull/3856) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Add desmos graph embed type [#3608](https://github.com/tldraw/tldraw/pull/3608) ([@not-first](https://github.com/not-first) [@steveruizok](https://github.com/steveruizok))

#### 📖 Documentation changes

- make sure everything marked @public gets documented [#3892](https://github.com/tldraw/tldraw/pull/3892) ([@SomeHats](https://github.com/SomeHats))
- Bindings documentation [#3812](https://github.com/tldraw/tldraw/pull/3812) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- Update READMEs, add form link [#3741](https://github.com/tldraw/tldraw/pull/3741) ([@steveruizok](https://github.com/steveruizok))
- Don't check api.json files into git [#3565](https://github.com/tldraw/tldraw/pull/3565) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 8

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- fakerr ([@not-first](https://github.com/not-first))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.1.0 (Tue Apr 23 2024)

### Release Notes

#### Color tweaks (light and dark mode) ([#3486](https://github.com/tldraw/tldraw/pull/3486))

- Adjusts colors

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

#### Add white ([#3321](https://github.com/tldraw/tldraw/pull/3321))

- Adds secret white color.

---

#### 📚 SDK Changes

- Color tweaks (light and dark mode) [#3486](https://github.com/tldraw/tldraw/pull/3486) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- New migrations again [#3220](https://github.com/tldraw/tldraw/pull/3220) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Stickies: release candidate [#3249](https://github.com/tldraw/tldraw/pull/3249) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo) [@TodePond](https://github.com/TodePond) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Add white migration [#3334](https://github.com/tldraw/tldraw/pull/3334) ([@steveruizok](https://github.com/steveruizok))
- Add white [#3321](https://github.com/tldraw/tldraw/pull/3321) ([@steveruizok](https://github.com/steveruizok))
- use native structuredClone on node, cloudflare workers, and in tests [#3166](https://github.com/tldraw/tldraw/pull/3166) ([@si14](https://github.com/si14))

#### 🏠 Internal

- Display none for culled shapes [#3291](https://github.com/tldraw/tldraw/pull/3291) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Remove dependabot config since it only controls version updates? [#3057](https://github.com/tldraw/tldraw/pull/3057) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🧪 Tests

- [fix] Routes check on e2e tests [#3022](https://github.com/tldraw/tldraw/pull/3022) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 7

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.5 (Thu Feb 29 2024)

### Release Notes

#### Setup papercuts ([#2987](https://github.com/tldraw/tldraw/pull/2987))

- Add a brief release note for your PR here.

#### fix structured clone reference in drawing ([#2945](https://github.com/tldraw/tldraw/pull/2945))

- Fixes a reference to structuredClone that caused a crash on older browsers.

---

#### 🐛 Bug Fix

- Setup papercuts [#2987](https://github.com/tldraw/tldraw/pull/2987) ([@ds300](https://github.com/ds300))
- Prevent iframe embedding for dotcom (except on tldraw.com) [#2947](https://github.com/tldraw/tldraw/pull/2947) ([@steveruizok](https://github.com/steveruizok))
- fix structured clone reference in drawing [#2945](https://github.com/tldraw/tldraw/pull/2945) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- bump typescript / api-extractor [#2949](https://github.com/tldraw/tldraw/pull/2949) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.4 (Wed Feb 21 2024)

### Release Notes

#### Faster validations + record reference stability at the same time ([#2848](https://github.com/tldraw/tldraw/pull/2848))

- Add a brief release note for your PR here.

#### [Snapping 2/5] Fix line-handle mid-point snapping ([#2831](https://github.com/tldraw/tldraw/pull/2831))

- Simplify the contents of `TLLineShape.props.handles`

---

#### 💥 Breaking Change

- Add line IDs & fractional indexes [#2890](https://github.com/tldraw/tldraw/pull/2890) ([@SomeHats](https://github.com/SomeHats))
- [Snapping 2/5] Fix line-handle mid-point snapping [#2831](https://github.com/tldraw/tldraw/pull/2831) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- [handles] Line shape handles -> points [#2856](https://github.com/tldraw/tldraw/pull/2856) ([@steveruizok](https://github.com/steveruizok))
- Lokalise: Translations update [#2830](https://github.com/tldraw/tldraw/pull/2830) ([@TodePond](https://github.com/TodePond) [@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fix

- Faster validations + record reference stability at the same time [#2848](https://github.com/tldraw/tldraw/pull/2848) ([@ds300](https://github.com/ds300))
- [Snapping 1/5] Validation & strict types for fractional indexes [#2827](https://github.com/tldraw/tldraw/pull/2827) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- Check tsconfig "references" arrays [#2891](https://github.com/tldraw/tldraw/pull/2891) ([@ds300](https://github.com/ds300))
- dev: swap yarn test and test-dev for better dx [#2773](https://github.com/tldraw/tldraw/pull/2773) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 6

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.3 (Tue Feb 13 2024)

### Release Notes

#### i18n: add HR 🇭🇷 ([#2778](https://github.com/tldraw/tldraw/pull/2778))

- i18n: add Croatian / Hrvatski.

#### arrows: separate out handle behavior from labels ([#2621](https://github.com/tldraw/tldraw/pull/2621))

- Arrow labels: provide more polish on label placement

#### dev: add test-dev command for easier testing of packages ([#2627](https://github.com/tldraw/tldraw/pull/2627))

- Adds easier testing command for individual packages.

#### Improved duplication ([#2480](https://github.com/tldraw/tldraw/pull/2480))

- Add a brief release note for your PR here.

#### i18n: sort languages by name, not by locale code ([#2625](https://github.com/tldraw/tldraw/pull/2625))

- Sorts the locale list by locale name, not code.

#### arrows: add ability to change label placement ([#2557](https://github.com/tldraw/tldraw/pull/2557))

- Adds ability to change label position on arrows.

#### [hot take] Make dark mode colours pop more ([#2478](https://github.com/tldraw/tldraw/pull/2478))

- Tweaked dark mode colour styles to make them pop more.

#### [fix] disable vertical edge resizing for text on mobile ([#2456](https://github.com/tldraw/tldraw/pull/2456))

- Add a brief release note for your PR here.

#### [Minor] change Simplified Chinese label to Chinese ([#2434](https://github.com/tldraw/tldraw/pull/2434))

- Changed the label for the Simplified Chinese language from `Chinese - Simplified` to `简体中文`, following the convention of other languages.
- Updated the API and relevant documentation through build scripts.

#### [improvement] account for coarse pointers / insets in edge scrolling ([#2401](https://github.com/tldraw/tldraw/pull/2401))

- Add `instanceState.insets` to track which edges of the component are inset from the edges of the document body.
- Improve behavior around edge scrolling

---

#### 🚀 Enhancement

- [dx] use Biome instead of Prettier, part 2 [#2731](https://github.com/tldraw/tldraw/pull/2731) ([@si14](https://github.com/si14))
- [dx] use Biome instead of Prettier, part 1 [#2729](https://github.com/tldraw/tldraw/pull/2729) ([@si14](https://github.com/si14))
- Improved duplication [#2480](https://github.com/tldraw/tldraw/pull/2480) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- arrows: add ability to change label placement [#2557](https://github.com/tldraw/tldraw/pull/2557) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
- [improvement] account for coarse pointers / insets in edge scrolling [#2401](https://github.com/tldraw/tldraw/pull/2401) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- i18n: add HR 🇭🇷 [#2778](https://github.com/tldraw/tldraw/pull/2778) ([@mimecuvalo](https://github.com/mimecuvalo))
- arrows: separate out handle behavior from labels [#2621](https://github.com/tldraw/tldraw/pull/2621) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- i18n: sort languages by name, not by locale code [#2625](https://github.com/tldraw/tldraw/pull/2625) ([@mimecuvalo](https://github.com/mimecuvalo))
- Make sure correct dark mode colours get used in exports [#2492](https://github.com/tldraw/tldraw/pull/2492) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- [hot take] Make dark mode colours pop more [#2478](https://github.com/tldraw/tldraw/pull/2478) ([@TodePond](https://github.com/TodePond) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- [fix] disable vertical edge resizing for text on mobile [#2456](https://github.com/tldraw/tldraw/pull/2456) ([@mimecuvalo](https://github.com/mimecuvalo))
- [Minor] change Simplified Chinese label to Chinese [#2434](https://github.com/tldraw/tldraw/pull/2434) ([@peilingjiang](https://github.com/peilingjiang))

#### 🏠 Internal

- Unbiome [#2776](https://github.com/tldraw/tldraw/pull/2776) ([@si14](https://github.com/si14))
- Update the project to Node 20 [#2691](https://github.com/tldraw/tldraw/pull/2691) ([@si14](https://github.com/si14))
- make CI check for yarn install warnings and fix the peer deps ones we have [#2683](https://github.com/tldraw/tldraw/pull/2683) ([@si14](https://github.com/si14))
- dev: add test-dev command for easier testing of packages [#2627](https://github.com/tldraw/tldraw/pull/2627) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add docs [#2470](https://github.com/tldraw/tldraw/pull/2470) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Bump Yarn to 4.0.2 and add version constraints [#2481](https://github.com/tldraw/tldraw/pull/2481) ([@si14](https://github.com/si14))

#### Authors: 10

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
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

#### Add url validation ([#2428](https://github.com/tldraw/tldraw/pull/2428))

- Add validation to urls.

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

---

#### 💥 Breaking Change

- [tech debt] Primitives renaming party / cleanup [#2396](https://github.com/tldraw/tldraw/pull/2396) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix validation when pasting images. [#2436](https://github.com/tldraw/tldraw/pull/2436) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
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

### Release Notes

#### Lokalise: Translations update ([#2342](https://github.com/tldraw/tldraw/pull/2342))

Added Czech translations.
Updated translations for German, Korean, Russian, Ukrainian, Traditional Chinese.

---

#### 💥 Breaking Change

- bump to beta [#2364](https://github.com/tldraw/tldraw/pull/2364) ([@steveruizok](https://github.com/steveruizok))
- Change licenses to tldraw [#2167](https://github.com/tldraw/tldraw/pull/2167) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Lokalise: Translations update [#2342](https://github.com/tldraw/tldraw/pull/2342) ([@TodePond](https://github.com/TodePond))

#### Authors: 2

- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.19 (Tue Dec 12 2023)

### Release Notes

#### Fix migrations. ([#2302](https://github.com/tldraw/tldraw/pull/2302))

- Fix migrations of `instance_page_state`.

#### [improvements] arrows x enclosing shapes x precision. ([#2265](https://github.com/tldraw/tldraw/pull/2265))

- Improves the logic about when to draw "precise" arrows between the center of bound shapes.

#### Add prettier caching ([#2212](https://github.com/tldraw/tldraw/pull/2212))

- Speed up formatting of files via `yarn format`.

---

#### 💥 Breaking Change

- No impure getters pt 1 [#2189](https://github.com/tldraw/tldraw/pull/2189) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- [improvements] arrows x enclosing shapes x precision. [#2265](https://github.com/tldraw/tldraw/pull/2265) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix migrations. [#2302](https://github.com/tldraw/tldraw/pull/2302) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🏠 Internal

- Add prettier caching [#2212](https://github.com/tldraw/tldraw/pull/2212) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### Authors: 3

- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.18 (Fri Nov 10 2023)

### Release Notes

#### [feature] multi-scribbles ([#2125](https://github.com/tldraw/tldraw/pull/2125))

- [feature] multi scribbles

---

#### 🚀 Enhancement

- [feature] multi-scribbles [#2125](https://github.com/tldraw/tldraw/pull/2125) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Revert "bump prerelease from alpha to beta" [#2192](https://github.com/tldraw/tldraw/pull/2192) ([@ds300](https://github.com/ds300))
- bump prerelease from alpha to beta [#2148](https://github.com/tldraw/tldraw/pull/2148) ([@ds300](https://github.com/ds300))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.17 (Tue Oct 17 2023)

#### 🚀 Enhancement

- Same first page id for all editors [#2071](https://github.com/tldraw/tldraw/pull/2071) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- bump nanoid [#2078](https://github.com/tldraw/tldraw/pull/2078) ([@ds300](https://github.com/ds300))

#### Authors: 2

- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.16 (Wed Oct 11 2023)

#### 🚀 Enhancement

- Remove dot com ui styles [1/2] [#2039](https://github.com/tldraw/tldraw/pull/2039) ([@steveruizok](https://github.com/steveruizok))
- prevent hover indicator from showing when pointer isn't over the canvas [#2023](https://github.com/tldraw/tldraw/pull/2023) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fix

- [fix] Page state migration [#2040](https://github.com/tldraw/tldraw/pull/2040) ([@steveruizok](https://github.com/steveruizok))
- [fix] migrations for page state [#2038](https://github.com/tldraw/tldraw/pull/2038) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- [fix] broken docs link [#2062](https://github.com/tldraw/tldraw/pull/2062) ([@steveruizok](https://github.com/steveruizok))
- Remove fixup script [#2041](https://github.com/tldraw/tldraw/pull/2041) ([@steveruizok](https://github.com/steveruizok))
- Publish api.json [#2034](https://github.com/tldraw/tldraw/pull/2034) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 2

- alex ([@SomeHats](https://github.com/SomeHats))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.15 (Fri Oct 06 2023)

### Release Notes

#### Migrate snapshot ([#1843](https://github.com/tldraw/tldraw/pull/1843))

- [editor] add `Store.migrateSnapshot`

#### [fix] embeds switching / tldraw embed ([#1792](https://github.com/tldraw/tldraw/pull/1792))

- [fix] tldraw embeds

#### Editor commands API / effects ([#1778](https://github.com/tldraw/tldraw/pull/1778))

- tbd

#### [feature] Add val town embed ([#1777](https://github.com/tldraw/tldraw/pull/1777))

- (feature) val town

#### `ShapeUtil.getGeometry`, selection rewrite ([#1751](https://github.com/tldraw/tldraw/pull/1751))

- [editor] Remove `ShapeUtil.getBounds`, `ShapeUtil.getOutline`, `ShapeUtil.hitTestPoint`, `ShapeUtil.hitTestLineSegment`
- [editor] Add `ShapeUtil.getGeometry`
- [editor] Add `Editor.getShapeGeometry`

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

#### Add cloud shape ([#1708](https://github.com/tldraw/tldraw/pull/1708))

- Adds a cloud shape.

---

#### 💥 Breaking Change

- Revert "Editor commands API / effects" [#1783](https://github.com/tldraw/tldraw/pull/1783) ([@steveruizok](https://github.com/steveruizok))
- Editor commands API / effects [#1778](https://github.com/tldraw/tldraw/pull/1778) ([@steveruizok](https://github.com/steveruizok))
- `ShapeUtil.getGeometry`, selection rewrite [#1751](https://github.com/tldraw/tldraw/pull/1751) ([@steveruizok](https://github.com/steveruizok))
- More cleanup, focus bug fixes [#1749](https://github.com/tldraw/tldraw/pull/1749) ([@steveruizok](https://github.com/steveruizok))
- Remove helpers / extraneous API methods. [#1745](https://github.com/tldraw/tldraw/pull/1745) ([@steveruizok](https://github.com/steveruizok))
- tldraw zero - package shuffle [#1710](https://github.com/tldraw/tldraw/pull/1710) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- Fix arrow handle snapping, snapping to text labels, selection of text labels [#1910](https://github.com/tldraw/tldraw/pull/1910) ([@steveruizok](https://github.com/steveruizok))
- Migrate snapshot [#1843](https://github.com/tldraw/tldraw/pull/1843) ([@steveruizok](https://github.com/steveruizok))
- [feature] Add val town embed [#1777](https://github.com/tldraw/tldraw/pull/1777) ([@steveruizok](https://github.com/steveruizok))
- Add cloud shape [#1708](https://github.com/tldraw/tldraw/pull/1708) ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fix

- [fix] embeds switching / tldraw embed [#1792](https://github.com/tldraw/tldraw/pull/1792) ([@steveruizok](https://github.com/steveruizok))
- [fix] dark mode [#1754](https://github.com/tldraw/tldraw/pull/1754) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
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

#### [improvement] store snapshot types ([#1657](https://github.com/tldraw/tldraw/pull/1657))

- [dev] Rename `StoreSnapshot` to `SerializedStore`
- [dev] Create new `StoreSnapshot` as type related to `getSnapshot`/`loadSnapshot`

#### Styles API docs ([#1641](https://github.com/tldraw/tldraw/pull/1641))

--

#### Styles API follow-ups ([#1636](https://github.com/tldraw/tldraw/pull/1636))

--

#### `ShapeUtil` refactor, `Editor` cleanup ([#1611](https://github.com/tldraw/tldraw/pull/1611))

- [editor] renames `defaultProps` to `getDefaultProps`
- [editor] removes `outline`, `outlineSegments`, `handles`, `bounds`
- [editor] renames `renderBackground` to `backgroundComponent`

#### Styles API ([#1580](https://github.com/tldraw/tldraw/pull/1580))

-

#### (1/2) Timeout collaborator cursors ([#1525](https://github.com/tldraw/tldraw/pull/1525))

- Brought back cursor timeouts. Collaborator cursors now disappear after 3 seconds of inactivity.

#### (1/2) Cursor Chat - Presence ([#1487](https://github.com/tldraw/tldraw/pull/1487))

- [dev] Added support for cursor chat presence.

#### [improvement] Embed shape cleanup ([#1569](https://github.com/tldraw/tldraw/pull/1569))

- [editor] Remove unused props for `TLEditorShape`
- [editor] Adds `canUnmount` property to embed definitions

#### mini `defineShape` API ([#1563](https://github.com/tldraw/tldraw/pull/1563))

[dev-facing, notes to come]

#### hoist opacity out of props ([#1526](https://github.com/tldraw/tldraw/pull/1526))

[internal only for now]

#### [feature] add vertical align to note shape ([#1539](https://github.com/tldraw/tldraw/pull/1539))

- Adds vertical align prop to note shapes

#### tlschema cleanup ([#1509](https://github.com/tldraw/tldraw/pull/1509))

- [editor] Remove `app.createShapeId`
- [tlschema] Cleans up exports

#### Rename tlstore to store ([#1507](https://github.com/tldraw/tldraw/pull/1507))

- Replace @tldraw/tlstore with @tldraw/store

#### Rename tlvalidate to validate ([#1508](https://github.com/tldraw/tldraw/pull/1508))

- Rename tlvalidate to validate

#### Cleanup @tldraw/ui types / exports ([#1504](https://github.com/tldraw/tldraw/pull/1504))

- [editor] clean up / unify types

#### [1/3] initial highlighter shape/tool ([#1401](https://github.com/tldraw/tldraw/pull/1401))

[internal only change layout ground work for highlighter]

#### [tiny] add isPageId ([#1482](https://github.com/tldraw/tldraw/pull/1482))

- [tlschema] Add `isPageId`

#### [refactor] update record names ([#1473](https://github.com/tldraw/tldraw/pull/1473))

- [editor] rename record types

#### [chore] refactor user preferences ([#1435](https://github.com/tldraw/tldraw/pull/1435))

- Add a brief release note for your PR here.

#### Add migration for horizontal alignment ([#1443](https://github.com/tldraw/tldraw/pull/1443))

- Add support for legacy alignment options.

#### Stricter ID types ([#1439](https://github.com/tldraw/tldraw/pull/1439))

[internal only, covered by #1432 changelog]

#### [refactor] restore createTLSchema ([#1444](https://github.com/tldraw/tldraw/pull/1444))

- [editor] Simplifies custom shape definition
- [tldraw] Updates props for <TldrawEditor> component to require a `TldrawEditorConfig`.

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

#### [feature] add laser pointer ([#1412](https://github.com/tldraw/tldraw/pull/1412))

- Adds the laser pointer tool.

#### Vertical text alignment for geo shapes ([#1414](https://github.com/tldraw/tldraw/pull/1414))

- This adds vertical text alignment property to geo shapes.

#### [fix] Don't synchronize isReadOnly ([#1396](https://github.com/tldraw/tldraw/pull/1396))

- Removes the isReadOnly value from the `user_document_settings` record type.

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

#### [perf] make ensureStoreIsUsable scale better ([#1362](https://github.com/tldraw/tldraw/pull/1362))

- Add a brief release note for your PR here.

#### [chore] Bump nanoid ([#1349](https://github.com/tldraw/tldraw/pull/1349))

- Remove unused userId and instanceId props from AppOptions

#### Rework the assets package for strategy-specific imports ([#1341](https://github.com/tldraw/tldraw/pull/1341))

- [dev] If you're using the `@tldraw/assets` package, you need to update your code to `import { getAssetUrlsByImport } from '@tldraw/assets/imports'` instead of `import { getBundlerAssetUrls } from '@tldraw/assets`

---

#### 💥 Breaking Change

- [improvement] store snapshot types [#1657](https://github.com/tldraw/tldraw/pull/1657) ([@steveruizok](https://github.com/steveruizok))
- `ShapeUtil` refactor, `Editor` cleanup [#1611](https://github.com/tldraw/tldraw/pull/1611) ([@steveruizok](https://github.com/steveruizok))
- Styles API [#1580](https://github.com/tldraw/tldraw/pull/1580) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- mini `defineShape` API [#1563](https://github.com/tldraw/tldraw/pull/1563) ([@SomeHats](https://github.com/SomeHats))
- hoist opacity out of props [#1526](https://github.com/tldraw/tldraw/pull/1526) ([@SomeHats](https://github.com/SomeHats))
- Independent instance state persistence [#1493](https://github.com/tldraw/tldraw/pull/1493) ([@ds300](https://github.com/ds300))
- tlschema cleanup [#1509](https://github.com/tldraw/tldraw/pull/1509) ([@steveruizok](https://github.com/steveruizok))
- Rename tlstore to store [#1507](https://github.com/tldraw/tldraw/pull/1507) ([@steveruizok](https://github.com/steveruizok))
- Rename tlvalidate to validate [#1508](https://github.com/tldraw/tldraw/pull/1508) ([@steveruizok](https://github.com/steveruizok))
- Cleanup @tldraw/ui types / exports [#1504](https://github.com/tldraw/tldraw/pull/1504) ([@steveruizok](https://github.com/steveruizok))
- Add support for project names [#1340](https://github.com/tldraw/tldraw/pull/1340) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [refactor] User-facing APIs [#1478](https://github.com/tldraw/tldraw/pull/1478) ([@steveruizok](https://github.com/steveruizok))
- [refactor] update record names [#1473](https://github.com/tldraw/tldraw/pull/1473) ([@steveruizok](https://github.com/steveruizok))
- [chore] refactor user preferences [#1435](https://github.com/tldraw/tldraw/pull/1435) ([@ds300](https://github.com/ds300))
- [refactor] restore createTLSchema [#1444](https://github.com/tldraw/tldraw/pull/1444) ([@steveruizok](https://github.com/steveruizok))
- [refactor] remove `createTLSchema` [#1440](https://github.com/tldraw/tldraw/pull/1440) ([@steveruizok](https://github.com/steveruizok))
- [refactor] Remove `TLShapeDef`, `getShapeUtilByType`. [#1432](https://github.com/tldraw/tldraw/pull/1432) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
- [refactor] record migrations [#1430](https://github.com/tldraw/tldraw/pull/1430) ([@steveruizok](https://github.com/steveruizok))
- [fix] Don't synchronize isReadOnly [#1396](https://github.com/tldraw/tldraw/pull/1396) ([@ds300](https://github.com/ds300))
- [chore] Bump nanoid [#1349](https://github.com/tldraw/tldraw/pull/1349) ([@ds300](https://github.com/ds300))
- Rework the assets package for strategy-specific imports [#1341](https://github.com/tldraw/tldraw/pull/1341) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- Styles API follow-ups [#1636](https://github.com/tldraw/tldraw/pull/1636) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- [fix] yjs presence [#1603](https://github.com/tldraw/tldraw/pull/1603) ([@steveruizok](https://github.com/steveruizok))
- (1/2) Timeout collaborator cursors [#1525](https://github.com/tldraw/tldraw/pull/1525) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- (1/2) Cursor Chat - Presence [#1487](https://github.com/tldraw/tldraw/pull/1487) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [feature] add vertical align to note shape [#1539](https://github.com/tldraw/tldraw/pull/1539) ([@steveruizok](https://github.com/steveruizok))
- [1/3] initial highlighter shape/tool [#1401](https://github.com/tldraw/tldraw/pull/1401) ([@SomeHats](https://github.com/SomeHats))
- [feature] add laser pointer [#1412](https://github.com/tldraw/tldraw/pull/1412) ([@steveruizok](https://github.com/steveruizok))
- Vertical text alignment for geo shapes [#1414](https://github.com/tldraw/tldraw/pull/1414) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- update exports for user presence [#1583](https://github.com/tldraw/tldraw/pull/1583) ([@steveruizok](https://github.com/steveruizok))
- [improvement] Embed shape cleanup [#1569](https://github.com/tldraw/tldraw/pull/1569) ([@steveruizok](https://github.com/steveruizok))
- Add migration for horizontal alignment [#1443](https://github.com/tldraw/tldraw/pull/1443) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Stricter ID types [#1439](https://github.com/tldraw/tldraw/pull/1439) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- [perf] make ensureStoreIsUsable scale better [#1362](https://github.com/tldraw/tldraw/pull/1362) ([@ds300](https://github.com/ds300))
- [chore] move schema construction to tlschema package [#1334](https://github.com/tldraw/tldraw/pull/1334) ([@ds300](https://github.com/ds300))
- [feature] `check-box` geo shape [#1330](https://github.com/tldraw/tldraw/pull/1330) ([@steveruizok](https://github.com/steveruizok))
- readmes [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@steveruizok](https://github.com/steveruizok))
- [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
- [fix] pick a better default language [#1201](https://github.com/tldraw/tldraw/pull/1201) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- derived presence state [#1204](https://github.com/tldraw/tldraw/pull/1204) ([@ds300](https://github.com/ds300))
- [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
- transfer-out: transfer out [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- restore styles sets exports [#1512](https://github.com/tldraw/tldraw/pull/1512) ([@steveruizok](https://github.com/steveruizok))
- [tiny] add isPageId [#1482](https://github.com/tldraw/tldraw/pull/1482) ([@steveruizok](https://github.com/steveruizok))
- avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))

#### 📝 Documentation

- Styles API docs [#1641](https://github.com/tldraw/tldraw/pull/1641) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- TLSchema readme [#1506](https://github.com/tldraw/tldraw/pull/1506) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Incorporate signia as @tldraw/state [#1620](https://github.com/tldraw/tldraw/pull/1620) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### Authors: 5

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.12 (Mon Apr 03 2023)

#### 🐛 Bug Fix

- add vietnamese to language menu, and strings that were missing from lokalise [#1578](https://github.com/tldraw/tldraw-lite/pull/1578) ([@TodePond](https://github.com/TodePond))
- add community translations [#1559](https://github.com/tldraw/tldraw-lite/pull/1559) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- Make sure all types and build stuff get run in CI [#1548](https://github.com/tldraw/tldraw-lite/pull/1548) ([@SomeHats](https://github.com/SomeHats))
- make sure error annotations can't throw [#1550](https://github.com/tldraw/tldraw-lite/pull/1550) ([@SomeHats](https://github.com/SomeHats))
- Use the users preferred language on startup [#1507](https://github.com/tldraw/tldraw-lite/pull/1507) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- add pre-commit api report generation [#1517](https://github.com/tldraw/tldraw-lite/pull/1517) ([@SomeHats](https://github.com/SomeHats))
- [chore] restore api extractor [#1500](https://github.com/tldraw/tldraw-lite/pull/1500) ([@steveruizok](https://github.com/steveruizok))
- Asset loading overhaul [#1457](https://github.com/tldraw/tldraw-lite/pull/1457) ([@SomeHats](https://github.com/SomeHats))
- [improvement] docs / api cleanup [#1491](https://github.com/tldraw/tldraw-lite/pull/1491) ([@steveruizok](https://github.com/steveruizok))
- David/publish good [#1488](https://github.com/tldraw/tldraw-lite/pull/1488) ([@ds300](https://github.com/ds300))
- [chore] alpha 10 [#1486](https://github.com/tldraw/tldraw-lite/pull/1486) ([@ds300](https://github.com/ds300))
- [chore] package build improvements [#1484](https://github.com/tldraw/tldraw-lite/pull/1484) ([@ds300](https://github.com/ds300))
- [chore] bump for alpha 8 [#1485](https://github.com/tldraw/tldraw-lite/pull/1485) ([@steveruizok](https://github.com/steveruizok))
- stop using broken-af turbo for publishing [#1476](https://github.com/tldraw/tldraw-lite/pull/1476) ([@ds300](https://github.com/ds300))
- [chore] add canary release script [#1423](https://github.com/tldraw/tldraw-lite/pull/1423) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Fix some circular reference issues. [#1433](https://github.com/tldraw/tldraw-lite/pull/1433) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [chore] upgrade yarn [#1430](https://github.com/tldraw/tldraw-lite/pull/1430) ([@ds300](https://github.com/ds300))
- Github -> GitHub [#1450](https://github.com/tldraw/tldraw-lite/pull/1450) ([@TodePond](https://github.com/TodePond))
- repo cleanup [#1426](https://github.com/tldraw/tldraw-lite/pull/1426) ([@steveruizok](https://github.com/steveruizok))
- Run all the tests. Fix linting for tests. [#1389](https://github.com/tldraw/tldraw-lite/pull/1389) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### Authors: 6

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu[ke] Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# @tldraw/tlschema

## 2.0.0-alpha.11

### Patch Changes

- fix some package build scripting
- Updated dependencies
  - @tldraw/tlstore@2.0.0-alpha.11
  - @tldraw/tlvalidate@2.0.0-alpha.10
  - @tldraw/utils@2.0.0-alpha.10

## 2.0.0-alpha.10

### Patch Changes

- 4b4399b6e: redeploy with yarn to prevent package version issues
- Updated dependencies [4b4399b6e]
  - @tldraw/tlstore@2.0.0-alpha.10
  - @tldraw/tlvalidate@2.0.0-alpha.9
  - @tldraw/utils@2.0.0-alpha.9

## 2.0.0-alpha.9

### Patch Changes

- Release day!
- Updated dependencies
  - @tldraw/tlstore@2.0.0-alpha.9
  - @tldraw/tlvalidate@2.0.0-alpha.8
  - @tldraw/utils@2.0.0-alpha.8

## 2.0.0-alpha.8

### Patch Changes

- Updated dependencies [23dd81cfe]
  - @tldraw/tlstore@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Bug fixes.
- Updated dependencies
  - @tldraw/tlstore@2.0.0-alpha.7
  - @tldraw/tlvalidate@2.0.0-alpha.7
  - @tldraw/utils@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Add licenses.
- Updated dependencies
  - @tldraw/tlstore@2.0.0-alpha.6
  - @tldraw/tlvalidate@2.0.0-alpha.6
  - @tldraw/utils@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Add CSS files to tldraw/tldraw.
- Updated dependencies
  - @tldraw/tlstore@2.0.0-alpha.5
  - @tldraw/tlvalidate@2.0.0-alpha.5
  - @tldraw/utils@2.0.0-alpha.5

## 2.0.0-alpha.4

### Patch Changes

- Add children to tldraw/tldraw
- Updated dependencies
  - @tldraw/tlstore@2.0.0-alpha.4
  - @tldraw/tlvalidate@2.0.0-alpha.4
  - @tldraw/utils@2.0.0-alpha.4

## 2.0.0-alpha.3

### Patch Changes

- Change permissions.
- Updated dependencies
  - @tldraw/tlstore@2.0.0-alpha.3
  - @tldraw/tlvalidate@2.0.0-alpha.3
  - @tldraw/utils@2.0.0-alpha.3

## 2.0.0-alpha.2

### Patch Changes

- Add tldraw, editor
- Updated dependencies
  - @tldraw/tlstore@2.0.0-alpha.2
  - @tldraw/tlvalidate@2.0.0-alpha.2
  - @tldraw/utils@2.0.0-alpha.2

## 0.1.0-alpha.11

### Patch Changes

- Fix stale reactors.
- Updated dependencies
  - @tldraw/tlstore@0.1.0-alpha.11
  - @tldraw/tlvalidate@0.1.0-alpha.11
  - @tldraw/utils@0.1.0-alpha.11

## 0.1.0-alpha.10

### Patch Changes

- Fix type export bug.
- Updated dependencies
  - @tldraw/tlstore@0.1.0-alpha.10
  - @tldraw/tlvalidate@0.1.0-alpha.10
  - @tldraw/utils@0.1.0-alpha.10

## 0.1.0-alpha.9

### Patch Changes

- Fix import bugs.
- Updated dependencies
  - @tldraw/tlstore@0.1.0-alpha.9
  - @tldraw/tlvalidate@0.1.0-alpha.9
  - @tldraw/utils@0.1.0-alpha.9

## 0.1.0-alpha.8

### Patch Changes

- Changes validation requirements, exports validation helpers.
- Updated dependencies
  - @tldraw/tlstore@0.1.0-alpha.8
  - @tldraw/tlvalidate@0.1.0-alpha.8
  - @tldraw/utils@0.1.0-alpha.8

## 0.1.0-alpha.7

### Patch Changes

- - Pre-pre-release update
- Updated dependencies
  - @tldraw/tlstore@0.1.0-alpha.7
  - @tldraw/tlvalidate@0.1.0-alpha.7
  - @tldraw/utils@0.1.0-alpha.7

## 0.0.2-alpha.1

### Patch Changes

- Fix error with HMR
- Updated dependencies
  - @tldraw/tlstore@0.0.2-alpha.1
  - @tldraw/tlvalidate@0.0.2-alpha.1
  - @tldraw/utils@0.0.2-alpha.1

## 0.0.2-alpha.0

### Patch Changes

- Initial release
- Updated dependencies
  - @tldraw/tlstore@0.0.2-alpha.0
  - @tldraw/tlvalidate@0.0.2-alpha.0
  - @tldraw/utils@0.0.2-alpha.0
