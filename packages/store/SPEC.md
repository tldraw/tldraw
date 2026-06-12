# @tldraw/store behavior specification

This document states the rules that `@tldraw/store` implements. It is written to drive testing: each rule has a stable ID (e.g. `S4`, `MG2`), each rule is independently observable through the public API (or the documented internal API where noted), and the unit tests should be an expression of these rules. When a test and this document disagree, one of them is wrong — figure out which and fix it.

Sections marked **internal** describe supporting machinery (`ImmutableMap`, `IncrementalSetConstructor`, set utilities) that has its own contract worth testing directly, even though users rarely touch it.

## 1. Model and vocabulary

- A **record** is a plain JSON-serializable object with an `id` and a `typeName`.
- A **RecordType** defines a kind of record: its type name, default properties, validator, scope, and ephemeral keys.
- A **scope** is one of `document` (persisted and synced), `session` (per store instance, not synced), or `presence` (per instance, synced but not persisted).
- The **store** holds records in a reactive map keyed by id. All reads are reactive signals from `@tldraw/state` unless explicitly "without capture".
- An **atomic operation** is a store-level batch: changes inside it are applied in one `@tldraw/state` transaction and produce one round of side-effect callbacks.
- A **RecordsDiff** describes a change-set: `added`, `updated` (`[from, to]` pairs), and `removed`, each keyed by id.
- A **source** is `'user'` (local changes) or `'remote'` (changes applied inside `mergeRemoteChanges`).
- **Side effects** are lifecycle handlers (`before`/`after` × `create`/`change`/`delete`, plus `operationComplete`) registered per type name.
- A **migration** transforms persisted data between schema versions. Migrations live in **sequences**; a **serialized schema** records the version of each sequence so the store knows which migrations a snapshot still needs.

## 2. Records (R)

- **R1** `isRecord(v)` is true exactly for non-null objects with both an `id` and a `typeName` property; false for `null`, `undefined`, primitives, and objects missing either property.
- **R2** Record ids are strings of the form `typeName:uniquePart`.

## 3. RecordType (RT)

- **RT1** `createRecordType(typeName, config)` makes a RecordType with the given `scope` and an optional `validator`; without a validator, records pass through validation unchanged. `RecordType`'s own constructor defaults `scope` to `'document'`.
- **RT2** `create(props)` returns `{ ...defaults, ...props, id, typeName }`: default properties from `createDefaultProperties()`, overridden by the given props. Properties whose value is `undefined` do not override defaults.
- **RT3** `create` uses the given `id` if the props contain a defined one, else generates `typeName:<unique>` via `createId()`; an explicitly undefined `id` is treated as absent (matching RT2). `createId(customUniquePart)` uses the custom part when given.
- **RT4** `clone(record)` deep-clones the record and assigns a fresh id.
- **RT5** `parseId(id)` returns the part after the colon and throws if the id does not belong to this type. `isId(id)` is true exactly for strings starting with `typeName:`; false for `undefined` and other types' ids. `isInstance(record)` checks `record?.typeName === typeName`.
- **RT6** `assertIdType(id, type)` throws for `undefined`, empty, or wrong-type ids, and passes for valid ones.
- **RT7** `withDefaultProperties(fn)` returns a new RecordType with the same type name, validator, scope, and ephemeral keys, whose `create` no longer requires the defaulted properties.
- **RT8** `validate(record, recordBefore?)` calls `validator.validateUsingKnownGoodVersion(recordBefore, record)` when both are available, else `validator.validate(record)`.
- **RT9** `ephemeralKeys` marks properties; `ephemeralKeySet` contains exactly the keys mapped to `true`.

## 4. RecordsDiff (D)

- **D1** `createEmptyRecordsDiff()` returns `{ added: {}, updated: {}, removed: {} }`; `isRecordsDiffEmpty` is true exactly when all three collections are empty.
- **D2** `reverseRecordsDiff` swaps added and removed and reverses each `[from, to]` pair.
- **D3** `squashRecordDiffs(diffs)` combines sequential diffs into one. Per record id: add then update → add with the final value; add then remove → nothing; update then update → one update from the original `from` to the final `to`; update then remove → remove of the original `from`; remove then add → update from the removed value to the added value, unless the added value is reference-identical to the removed one, in which case nothing.
- **D4** `squashRecordDiffs` does not mutate its inputs unless `mutateFirstDiff: true`, in which case the first diff is the (mutated) result. `squashRecordDiffsMutable(target, diffs)` applies diffs onto `target` in place with the same semantics.

## 5. Store: reading and writing (S)

- **S1** A new store is empty unless `initialData` is given; initial data is validated with phase `'initialize'`. Records read from the store are deep-frozen in dev/test builds (DF1).
- **S2** `put([record])` creates records whose ids are not present (validated with phase `'createRecord'`) and updates those that are (phase `'updateRecord'`, with the previous record as the known-good version). `get` returns the stored record; `has` reports presence.
- **S3** `put` skips a record entirely — no store change, no history entry — when the validated result is reference-equal to the currently stored record. (A `validateUsingKnownGoodVersion` implementation that returns the known-good object for equal values, or a `beforeChange` handler returning `prev`, therefore makes equal re-puts complete no-ops.) If every record in a `put` is skipped, no history entry is produced.
- **S4** `update(id, updater)` is `put([updater(current)])`. For a missing id it logs an error and changes nothing (it does not throw).
- **S5** `remove(ids)` deletes the records with those ids; missing ids are ignored. If nothing is actually deleted, no history entry is produced. `clear()` removes all records.
- **S6** `get`/`has` are reactive (capture as parents of the running computed/effect); `unsafeGetWithoutCapture` reads without capturing. `allRecords()` returns all records as an array.
- **S7** `serialize(scope?)` returns the records whose type's scope matches; the default scope is `'document'`; `'all'` includes everything. `store.scopedTypes` maps each scope to the set of type names in it.
- **S8** `getStoreSnapshot(scope?)` is `{ store: serialize(scope), schema: schema.serialize() }`.
- **S9** `loadStoreSnapshot(snapshot)` migrates the snapshot, replaces all current records with the result, and runs the integrity checker — all with side effects disabled (restoring the previous enabled state afterwards). It throws if migration fails, leaving the store unchanged.
- **S10** `migrateSnapshot(snapshot)` returns the migrated snapshot stamped with the current serialized schema, and throws if migration fails.

## 6. Atomic operations and the side-effect flush (AO)

- **AO1** Every store mutation runs inside `store.atomic()` (directly or implicitly via `put`/`remove`/etc.), which wraps a `@tldraw/state` transaction: reactive effects observe all changes of the operation at once, when the outermost atomic completes.
- **AO2** Nested `atomic` calls join the outer operation: their after-events fold into the outer flush, and `mergeRemoteChanges` inside an atomic op throws.
- **AO3** `atomic(fn, runCallbacks = true)`: passing `false` disables the `before*` handlers for the operation. A nested atomic can switch callbacks off but cannot switch them back on if an enclosing operation turned them off.
- **AO4** After-events are deduplicated per record id across the operation: one callback per record, using the first `before` and the final `after`. A record created and then deleted in the same operation produces no callback at all; created then updated produces a single `afterCreate` with the final value.
- **AO5** `afterChange` fires only when the before and after records differ by deep equality. (Putting a structurally-equal copy still records a history entry per S3/H1 — only the callback is suppressed.)
- **AO6** After-handlers run when the outermost atomic's function completes, still inside the transaction. Changes they make trigger another round of after-events, repeating until quiescent. More than 100 rounds throws `Maximum store update depth exceeded`.
- **AO7** `operationComplete` handlers fire after the after-events of an operation settle; if an `operationComplete` handler makes further changes, the flush (including `operationComplete`) runs again until quiescent.
- **AO8** `mergeRemoteChanges(fn)` runs `fn` atomically with source `'remote'`; nested calls inside another `mergeRemoteChanges` just run `fn`. After the merge the integrity checker runs. Changes that side-effect handlers make in response to remote changes are attributed to `'user'`.

## 7. Side effect handlers (SE)

- **SE1** Handlers are registered per type name and called in registration order; each `register*Handler` call returns a remover. `register({ type: { beforeCreate, ... } })` registers many at once and returns one cleanup that removes them all.
- **SE2** `beforeCreate` runs before validation on create; its return value is what gets validated and stored. Multiple handlers chain, each receiving the previous one's output.
- **SE3** `beforeChange` runs before validation on update, receiving `(prev, next, source)`; its return value is stored. Returning `prev` blocks the update (with a reference-preserving validator this makes the put a complete no-op per S3).
- **SE4** `beforeDelete` may return `false` to prevent that record's deletion; other records in the same `remove` call are still deleted.
- **SE5** `afterCreate`/`afterChange`/`afterDelete` run per AO4–AO6 and observe the final state of the operation; all handlers receive the source (`'user'` or `'remote'`).
- **SE6** When side effects are disabled (`setIsEnabled(false)`, `atomic(fn, false)`, `applyDiff(diff, { runCallbacks: false })`, snapshot loads), `before*` handlers pass values through unchanged, `after*` and `operationComplete` handlers do not run, and `beforeDelete` cannot block. An operation may switch side effects off (AO3), but never on while they are disabled: `setIsEnabled(false)` keeps handlers off across subsequent operations until `setIsEnabled(true)`.

## 8. History and listeners (H)

- **H1** `store.history` is an atom that increments by exactly one for each committed change-set, carrying the `RecordsDiff` as its history diff (`historyLength` 1000).
- **H2** `listen(fn, filters?)` registers a listener and returns a remover. Listener notification is asynchronous: accumulated entries are flushed on the next frame, not synchronously with the change.
- **H3** A flush squashes adjacent same-source entries: a listener called after changes `[user, user, remote, user]` receives three entries (`user`, `remote`, `user`), each with the squashed (D3) diff and its source.
- **H4** `filters.source` (`'user' | 'remote' | 'all'`) drops entries from other sources. `filters.scope` (`'document' | 'session' | 'presence' | 'all'`) filters each entry's diff down to records of that scope; if nothing remains, the listener is not called for that entry.
- **H5** `listen` flushes pending history first, so a new listener never sees changes made before it subscribed.
- **H6** While no listeners are attached, accumulated history is discarded rather than retained.
- **H7** `extractingChanges(fn)` returns the squashed diff of exactly the changes made during `fn` (listeners still see those changes normally).
- **H8** `addHistoryInterceptor(fn)` calls `fn(entry, source)` synchronously for every change-set as it happens and returns a remover.
- **H9** `applyDiff(diff)` puts the `added` and `updated` records and removes the `removed` ids. `runCallbacks: false` disables side effects for the application (AO3). Applying a diff and then its `reverseRecordsDiff` (D2) restores the prior state.
- **H10** `applyDiff` with `ignoreEphemeralKeys: true` ignores changes to keys in the type's `ephemeralKeySet` when applying updates to existing records: non-ephemeral changed keys are merged onto the stored record, and an update touching only ephemeral keys is dropped. Updates for records that don't exist are applied in full, as are records in `added`.

## 9. Validation (V)

- **V1** Records are validated on initialization, creation, and update (phases `'initialize'`, `'createRecord'`, `'updateRecord'`). A record whose `typeName` has no RecordType in the schema fails validation with `Missing definition for record type <name>`.
- **V2** Updates pass the previous record to the validator via `validateUsingKnownGoodVersion` when the validator implements it (RT8).
- **V3** A validation throw propagates by default and aborts the whole operation: the transaction rolls back and the store is left unchanged, even for records earlier in the same `put`.
- **V4** With `onValidationFailure`, the handler receives `{ error, store, record, phase, recordBefore }` and its return value is stored instead of throwing.
- **V5** `store.validate(phase)` re-validates every record currently in the store.

## 10. Computed caches (CC)

- **CC1** `store.createComputedCache(name, derive)` returns a cache whose `get(id)` returns `derive(record)` for an existing record and `undefined` for a missing one.
- **CC2** Cached values are computed signals: `derive` runs at most once per record change, and re-runs (with a fresh result) when the record changes.
- **CC3** `areRecordsEqual` controls which record changes invalidate the cache: when the old and new record are "equal", `derive` does not re-run. `areResultsEqual` controls change propagation: an "equal" result keeps the previous value object.
- **CC4** The standalone `createComputedCache(name, derive)` works with any `StoreObject` (a store or `{ store }`), keeping a separate cache per context object, and passes the context to `derive`.
- **CC5** `store.createCache(create)` is the low-level form: `create(id, recordSignal)` returns the signal to cache; `get(id)` on a missing record returns `undefined` without calling `create`.

## 11. Queries: filtered history (QH)

- **QH1** `store.query.filterHistory(typeName)` returns a computed epoch whose history diffs contain only records of that type; it is cached per type name.
- **QH2** Within a flush window the diff is squashed per D3 semantics (add+remove cancels, add+update folds into the add, update+update collapses, update+remove removes the oldest `from`).
- **QH3** Changes to other record types produce no observable change for downstream consumers of the filtered history.

## 12. Queries: indexes (QI)

- **QI1** `store.query.index(typeName, property)` returns a computed `Map` from each distinct property value to the `Set` of ids of records with that value. Records whose value is `undefined` are not indexed.
- **QI2** Indexes are cached per `(typeName, property)` pair.
- **QI3** The index updates when records are added, updated (the id moves between value sets), or removed; a value whose set becomes empty is dropped from the map. Each update carries an `RSIndexDiff` (map of value → `CollectionDiff` of ids) in the computed's history.
- **QI4** If a change does not affect the index (no relevant records, or values unchanged), the index keeps the same map object — downstream consumers observe no change.
- **QI5** A `property` containing backslashes indexes a nested path: `'metadata\\sessionId'` indexes `record.metadata.sessionId`. Missing intermediate objects yield `undefined` (not indexed).

## 13. Queries: ids, records, record, exec (QQ)

- **QQ1** `store.query.ids(typeName, queryCreator?)` returns a computed `Set` of the ids of matching records; with no query it contains all ids of that type. Its history diffs are `CollectionDiff`s.
- **QQ2** The query expression is itself reactive: `queryCreator` may read signals, and when the expression it returns changes (by deep equality), the query rebuilds and emits a correct diff. An expression that is deep-equal to the previous one causes no rebuild.
- **QQ3** Changes that do not affect the result (unrelated types, updates that keep a record matching, irrelevant property changes) leave the same `Set` object in place.
- **QQ4** `records(typeName, queryCreator?)` returns the matching records as an array, with shallow-array equality (same members → no change). `record(typeName, queryCreator?)` returns one matching record or `undefined`.
- **QQ5** `exec(typeName, query)` runs one non-reactive query and returns matching records; with no matches it returns the shared empty array.

## 14. Query execution (QE)

- **QE1** `{ eq: v }` matches strict equality; `{ neq: v }` matches everything except `v`; `{ gt: n }` matches only numbers strictly greater than `n` (non-numeric values never match `gt`).
- **QE2** Multiple properties in one expression are ANDed; the result is the intersection of the per-property matches.
- **QE3** A nested object in the expression matches into the corresponding nested record object, to any depth. If the record's value at that level is missing or not an object, the record does not match.
- **QE4** The empty expression `{}` matches every record of the type: `objectMatchesQuery({}, r)` is true and `ids(type)` contains all ids. (The raw `executeQuery` helper instead returns an empty set for an empty expression; `StoreQueries.ids` special-cases it before calling `executeQuery`.)
- **QE5** `executeQuery` (index-based) and `objectMatchesQuery` (predicate) agree: the set of ids returned equals the set of records matching the predicate, including for nested paths and across record types.

## 15. Schema (SC)

- **SC1** `StoreSchema.create(types, options?)` builds a schema. It throws at creation time for duplicate migration `sequenceId`s, invalid migration sequences (M3), and migrations whose `dependsOn` references a migration that does not exist.
- **SC2** `serialize()` returns `{ schemaVersion: 2, sequences }` mapping each sequence id to the version of its last migration (0 for an empty sequence).
- **SC3** `serializeEarliestVersion()` maps every sequence to version 0.
- **SC4** `getType(typeName)` returns the RecordType and throws for unknown type names.
- **SC5** `upgradeSchema` converts a v1 serialized schema to v2: `storeVersion` becomes `com.tldraw.store`, each record version becomes `com.tldraw.<typeName>`, and each subtype version becomes `com.tldraw.<typeName>.<subType>`. v2 schemas pass through unchanged; schema versions other than 1 or 2 produce an error result.

## 16. Migrations: authoring (M)

- **M1** `createMigrationSequence({ sequenceId, sequence, retroactive? })` validates and returns the sequence; `retroactive` defaults to `true`.
- **M2** A standalone `{ dependsOn }` entry in a sequence is squashed into the next migration in the sequence, prepending to that migration's own `dependsOn`. A standalone entry with no following migration is dropped.
- **M3** `validateMigrations` throws when: the sequence id is empty or contains `/`; a migration id does not have the form `<sequenceId>/<integer>`; the first migration's version is not 1; or versions do not increase in increments of exactly 1.
- **M4** `createMigrationIds(sequenceId, { name: version })` returns `{ name: 'sequenceId/version' }` for each entry. `parseMigrationId('seq/3')` returns `{ sequenceId: 'seq', version: 3 }`.
- **M5** `createRecordMigrationSequence` produces record-scope migrations filtered to the given `recordType`; a per-migration `filter` and a sequence-level `filter` compose (all must pass).

## 17. Migrations: sorting (MS)

- **MS1** `sortMigrations` orders migrations within a sequence by version (`foo/1` before `foo/2`), regardless of input order.
- **MS2** A migration with `dependsOn` sorts after all of its dependencies, across sequences.
- **MS3** Among valid orderings, a migration that others explicitly depend on is scheduled close to (immediately before) its dependents.
- **MS4** Circular dependencies (direct or via the implicit sequence order) throw.

## 18. Migrations: selection (MG)

`getMigrationsSince(persistedSchema)` decides which migrations a snapshot still needs.

- **MG1** For a sequence present in both the persisted schema and the current schema, the migrations after the persisted version are returned, in sorted (MS) order. A persisted version of 0 selects the whole sequence.
- **MG2** A sequence already at the current version contributes nothing; if no sequence contributes anything the result is the empty array.
- **MG3** Sequences in the persisted schema that the current schema does not know are ignored.
- **MG4** A sequence missing from the persisted schema is included in full if it is `retroactive`, and skipped entirely if not.
- **MG5** A persisted version that does not exist in the current sequence produces an error result (`Incompatible schema?`).
- **MG6** Results (success or error) are cached per persisted-schema object identity: calling again with the same object returns the same array instance.
- **MG7** v1 persisted schemas are upgraded (SC5) before comparison.

## 19. Migrations: applying to records (MP)

- **MP1** `migratePersistedRecord(record, persistedSchema, 'up')` applies the needed record-scope migrations in order and returns `{ type: 'success', value }`. The input record is not mutated.
- **MP2** With no migrations to apply, the input record itself is returned as the success value.
- **MP3** A migrator may mutate its argument in place (returning nothing) or return a new record; both work, including in the same sequence.
- **MP4** A migration `filter` skips non-matching records (the migration applies to others).
- **MP5** If any needed migration is store- or storage-scope, the result is an error: `target-version-too-new` going up, `target-version-too-old` going down.
- **MP6** Going `'down'` requires every needed migration to have a `down` migrator (else `target-version-too-old`) and applies them in reverse order.
- **MP7** A migrator that throws produces a `migration-error` result rather than propagating.

## 20. Migrations: applying to snapshots and storage (MA)

- **MA1** `migrateStoreSnapshot(snapshot)` migrates every record and returns the new store object; the input snapshot is not modified unless `mutateInputStore: true`, in which case `snapshot.store` is updated in place (including deletions) and returned.
- **MA2** With no migrations to apply, the snapshot's store is returned as-is.
- **MA3** Store-scope migrations receive the whole record map and may add, change, and delete records.
- **MA4** Storage-scope migrations receive a `SynchronousStorage` (get/set/delete/keys/values/entries) and may use it to read and write records directly.
- **MA5** When migrations are applied, records whose type's scope is not `'document'` are removed from the result (legacy cleanup). A snapshot needing no migrations keeps such records.
- **MA6** An unknown record type encountered during migration, or a migrator that throws, produces a `migration-error` result.
- **MA7** `migrateStorage(storage)` applies the same process to external storage, writing the current serialized schema via `setSchema` and updating only records that actually changed (deep equality).

## 21. Integrity (IC)

- **IC1** `ensureStoreIsUsable()` creates the schema's integrity checker on first use and runs it; it runs automatically after `mergeRemoteChanges` and during `loadStoreSnapshot`.
- **IC2** `markAsPossiblyCorrupted()` sets a flag readable via `isPossiblyCorrupted()`; new stores start unflagged.

## 22. AtomMap (AM)

`AtomMap` is the store's reactive record container: a drop-in `Map` whose reads are reactive.

- **AM1** `get`/`has` are reactive per key: an effect reading a present key re-runs when that key's value changes or the key is deleted, but not when other keys are set, updated, or deleted.
- **AM2** Reading an absent key subscribes to the map's key set, so the reader re-runs when that key is later added (a reader of an absent key may also re-run when the key set otherwise changes — per-key isolation applies to present keys).
- **AM3** `set` adds or updates and returns the map. `update(key, fn)` replaces an existing value and throws for a missing key.
- **AM4** `delete` returns whether the key existed. `deleteMany(keys)` deletes in one transaction (one reaction for the whole batch), returns the `[key, value]` pairs actually deleted, and ignores missing keys.
- **AM5** `clear()` empties the map.
- **AM6** `entries`, `keys`, `values`, `forEach`, `[Symbol.iterator]`, and `size` see exactly the live entries and are reactive. `forEach` honors `thisArg`.
- **AM7** Changes made inside a rolled-back `@tldraw/state` transaction are restored: additions disappear, updates revert, deletions reappear.
- **AM8** `Object.prototype.toString.call(map)` is `[object AtomMap]`.

## 23. AtomSet (AS)

- **AS1** `AtomSet` behaves as a reactive set: `add` (returns the set), `has`, `delete` (returns whether present), `clear`, `size`, `forEach`, `keys`/`values`/iteration yield the elements, and `entries` yields `[value, value]` pairs.
- **AS2** Membership reads are reactive: an effect checking `has(x)` re-runs when `x` is added or removed.

## 24. devFreeze (DF)

- **DF1** In dev/test builds, `devFreeze(object)` recursively freezes the object and its nested objects and returns it; mutation afterwards throws in strict mode.
- **DF2** In dev/test builds it throws (`cannot include non-js data in a record`) for objects with non-plain prototypes (class instances, `Map`s, etc.); arrays, plain objects, null-prototype objects, and structured-clone objects are allowed.
- **DF3** In production builds it returns the object unchanged, without freezing or prototype validation.

## 25. Set utilities (SU)

- **SU1** `intersectSets(sets)` returns the elements present in every set; `[]` yields an empty set; a single set yields a copy.
- **SU2** `diffSets(prev, next)` returns `{ added?, removed? }` with only the populated keys, or `undefined` when the sets have the same members. Membership is by reference for objects.

## 26. IncrementalSetConstructor — internal (ISC)

- **ISC1** `get()` returns `undefined` when there are no net changes: nothing done, adding already-present items, removing absent items, or add/remove round trips that cancel out.
- **ISC2** Otherwise `get()` returns `{ value, diff }`, where `value` is the new set and `diff` is the `CollectionDiff` relative to the original set; the original set is not mutated.
- **ISC3** Re-adding an item removed earlier in the construction restores it (and removes it from `diff.removed`); removing an item added earlier cancels the add.

## 27. ImmutableMap — internal (IM)

`ImmutableMap` is the persistent (HAMT) map under `AtomMap`.

- **IM1** `set` and `delete` return a new map and leave the original unchanged.
- **IM2** `get(k)` returns the value or `undefined`; `get(k, notSetValue)` returns `notSetValue` for missing keys.
- **IM3** Keys may be objects (hashed by identity): distinct object keys with equal contents are distinct keys. A constructor given duplicate keys keeps the last value.
- **IM4** `withMutations(fn)` batches many changes into one new map; if `fn` changes nothing, the same instance is returned.
- **IM5** `deleteAll(keys)` removes all the given keys.
- **IM6** `entries`/`keys`/`values`/iteration yield every entry exactly once, consistent with `size`.
