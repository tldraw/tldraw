# v3.11.0 (Thu Mar 20 2025)

#### 🐛 Bug Fix

- upgrade yarn to 4.7 [#5687](https://github.com/tldraw/tldraw/pull/5687) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 1

- alex ([@SomeHats](https://github.com/SomeHats))

---

# v3.10.0 (Tue Mar 11 2025)

#### 🐛 Bug Fix

- CTA analytics [#5542](https://github.com/tldraw/tldraw/pull/5542) ([@TodePond](https://github.com/TodePond))

#### Authors: 1

- Lu Wilson ([@TodePond](https://github.com/TodePond))

---

# v3.9.0 (Mon Mar 03 2025)

#### 🐛 Bug Fix

- Update discord links [#5500](https://github.com/tldraw/tldraw/pull/5500) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))

#### Authors: 4

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.8.0 (Wed Feb 12 2025)

### Release Notes

#### support react 19 ([#5293](https://github.com/tldraw/tldraw/pull/5293))

- tldraw now supports react 19

---

#### 💄 Product Improvements

- support react 19 [#5293](https://github.com/tldraw/tldraw/pull/5293) ([@SomeHats](https://github.com/SomeHats) [@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))

#### Authors: 3

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))

---

# v3.4.0 (Thu Oct 24 2024)

#### 🐛 Bug Fix

- roll back changes from bad deploy [#4780](https://github.com/tldraw/tldraw/pull/4780) ([@SomeHats](https://github.com/SomeHats))
- Update CHANGELOG.md \[skip ci\] ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]))

#### Authors: 2

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))

---

# v3.1.0 (Wed Sep 25 2024)

#### 🐛 Bug Fix

- npm: make our React packages consistent [#4547](https://github.com/tldraw/tldraw/pull/4547) ([@mimecuvalo](https://github.com/mimecuvalo) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Clean up `apps` directory [#4548](https://github.com/tldraw/tldraw/pull/4548) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))

---

# v3.0.0 (Fri Sep 13 2024)

### Release Notes

#### Detect multiple installed versions of tldraw packages ([#4398](https://github.com/tldraw/tldraw/pull/4398))

- We detect when there are multiple versions of tldraw installed and let you know, as this can cause bugs in your application

---

#### 🐛 Bug Fix

- [SORRY, PLEASE MERGE] 3.0 megabus [#4494](https://github.com/tldraw/tldraw/pull/4494) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### 💄 Product Improvements

- inline nanoid [#4410](https://github.com/tldraw/tldraw/pull/4410) ([@SomeHats](https://github.com/SomeHats))

#### 🛠️ API Changes

- Detect multiple installed versions of tldraw packages [#4398](https://github.com/tldraw/tldraw/pull/4398) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 3

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.2.0 (Tue Jun 11 2024)

#### 🏠 Internal

- Don't check api.json files into git [#3565](https://github.com/tldraw/tldraw/pull/3565) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 1

- alex ([@SomeHats](https://github.com/SomeHats))

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

#### Show a broken image for files without assets ([#2990](https://github.com/tldraw/tldraw/pull/2990))

- Better handling of broken images / videos.

---

#### 📚 SDK Changes

- New migrations again [#3220](https://github.com/tldraw/tldraw/pull/3220) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- use native structuredClone on node, cloudflare workers, and in tests [#3166](https://github.com/tldraw/tldraw/pull/3166) ([@si14](https://github.com/si14))

#### 🏠 Internal

- Remove namespaced-tldraw/tldraw.css [#3068](https://github.com/tldraw/tldraw/pull/3068) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fixes

- Show a broken image for files without assets [#2990](https://github.com/tldraw/tldraw/pull/2990) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 4

- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- updatereadmes ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- Update readmes / docs for 2.0 [#3011](https://github.com/tldraw/tldraw/pull/3011) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.5 (Thu Feb 29 2024)

### Release Notes

#### tldraw_final_v6_final(old version).docx.pdf ([#2998](https://github.com/tldraw/tldraw/pull/2998))

- The `@tldraw/tldraw` package has been renamed to `tldraw`. You can keep using the old version if you want though!

---

#### 🏠 Internal

- tldraw_final_v6_final(old version).docx.pdf [#2998](https://github.com/tldraw/tldraw/pull/2998) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 1

- alex ([@SomeHats](https://github.com/SomeHats))
