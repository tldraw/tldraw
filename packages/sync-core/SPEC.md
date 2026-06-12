# @tldraw/sync-core behavior specification

This document states the rules that `@tldraw/sync-core` implements. It is written to drive testing: each rule has a stable ID (e.g. `D4`, `RP7`), each rule is independently observable through the public API (or the documented internal API where noted), and the unit tests should be an expression of these rules. When a test and this document disagree, one of them is wrong — figure out which and fix it.

Sections marked **internal** describe supporting machinery that has its own contract worth testing directly, even though SDK users rarely touch it.

## 1. Model and vocabulary

- The **room** (`TLSyncRoom`, wrapped by `TLSocketRoom`) is the authoritative server-side copy of a document. The **client** (`TLSyncClient`) keeps a local `Store` synchronized with it.
- The **document clock** is a monotonically increasing integer owned by the room's storage. It advances at most once per storage transaction that writes.
- A **tombstone** records the deletion of a document id at a clock value, so reconnecting clients can be told what was deleted. **Tombstone history** starts at a clock value; clients older than that get a full **wipe** instead of an incremental diff.
- A **network diff** (`NetworkDiff`) is a compact, one-way map of record id to `put`/`patch`/`remove` ops. An **object diff** (`ObjectDiff`) is the nested per-key form used inside `patch` ops.
- A **forward diff** (`TLSyncForwardDiff`) is the storage-level shape `{ puts, deletes }`, where a put is either a full record or a `[before, after]` tuple.
- A **push** is a client request to apply changes; the server answers with a **push result**: `commit` (applied verbatim), `discard` (no effect), or `rebaseWithDiff` (applied with modifications).
- **Speculative changes** are local changes the client has applied optimistically but the server has not yet confirmed.
- **Presence** records (cursors etc.) live in the room's in-memory `PresenceStore`, never in document storage.
- A **session** is one client connection to the room, keyed by session id, with a lifecycle of `AwaitingConnectMessage` → `Connected` → `AwaitingRemoval`.

## 2. Protocol constants and errors (PV)

- **PV1** `getTlsyncProtocolVersion()` returns 8.
- **PV2** `TLSyncErrorCloseEventCode` is 4099. It is the WebSocket close code used for all fatal, non-retriable sync errors; the close reason carries a `TLSyncErrorCloseEventReason` string.
- **PV3** `TLRemoteSyncError` has `name: 'RemoteSyncError'`, `message: 'sync error: <reason>'`, and exposes the reason as `.reason`.

## 3. Computing diffs: `diffRecord` (D)

- **D1** `diffRecord(prev, next)` returns an `ObjectDiff` describing how to turn `prev` into `next`, or `null` when there is nothing to change (including when `prev === next`).
- **D2** A key present in `prev` but missing from `next` produces `['delete']`. A key present in `next` but missing from `prev` produces `['put', value]`.
- **D3** `props` and `meta` are the only nested keys at the top level: changes inside them are expressed as `['patch', ...]` ops. Any other top-level key whose values are not both arrays or both strings is compared with deep equality and produces a whole-value `['put', next]` on change — even when both values are plain objects.
- **D4** Inside a nested diff (within `props`/`meta` or deeper), object values are recursively patched; `null` and primitive values are put.
- **D5** When both values are strings (at any level, including top-level keys) and `next` starts with `prev`, the diff is `['append', addedSuffix, prev.length]`. Other string changes are puts. With `legacyAppendMode` enabled, string appends become puts instead; array appends (D7) are unaffected by `legacyAppendMode`.
- **D6** Same-length arrays: if no items changed, no op. If at most `max(length/5, 1)` items changed, the op is `['patch', { [index]: op }]` where each changed index gets a recursive diff when both old and new items are truthy objects, and a put otherwise. If more items changed, the whole array is put.
- **D7** Different-length arrays: when the shared prefix is unchanged and the array grew, the op is `['append', addedItems, prev.length]`. Any change in the shared prefix (including truncation) puts the whole array.

## 4. Applying diffs: `applyObjectDiff` (AD)

- **AD1** `applyObjectDiff(object, diff)` never mutates its input. It returns the original object (same reference) when no op had an effect, otherwise a shallow-cloned copy with the ops applied. Unchanged nested values keep their identity in the copy.
- **AD2** A `put` is applied only when the new value is not deep-equal to the current value.
- **AD3** An `append` is applied only when the current value is an array/string of the matching type whose length equals the op's offset. On any mismatch the op is silently ignored.
- **AD4** A `patch` is applied only when the current value is a truthy object; it recurses with AD1 semantics. Patching a missing or primitive value is silently ignored.
- **AD5** A `delete` removes the key when present.
- **AD6** Patching a non-object (`null`, primitives) returns the input unchanged.
- **AD7** Arrays are cloned as arrays; ops keyed by numeric strings index into them.

## 5. Converting diffs (ND)

- **ND1** `getNetworkDiff(recordsDiff)` maps `added` to `put` ops, `updated` to `patch` ops (computed with `diffRecord`, entries that compute to no diff are omitted), and `removed` to `remove` ops. It returns `null` when the result would be empty.
- **ND2** `toNetworkDiff(forwardDiff)` maps plain-record puts to `put` ops, `[before, after]` puts to `patch` ops (omitted when `diffRecord` finds no difference), and deletes to `remove` ops. Unlike ND1 it always returns an object, possibly empty.

## 6. Validation helpers (RV) — internal

- **RV1** `diffAndValidateRecord(prev, next, type)` returns `undefined` when the records produce no diff — and in that case does not validate at all.
- **RV2** When there is a diff, the _new_ state is validated; a validator throw is rethrown as `TLSyncError` with reason `INVALID_RECORD`.
- **RV3** `applyAndDiffRecord(prev, patch, type)` applies the patch (AD rules); if the result is reference-identical to `prev` it returns `undefined`. Otherwise it returns `[actualDiff, newState]` where `actualDiff` is recomputed from `prev` to the patched state (it may differ from the input patch, e.g. ops that had no effect are dropped). Validation follows RV2.
- **RV4** `validateRecord(state, type)` validates, wrapping throws as `TLSyncError`/`INVALID_RECORD`.

## 7. Message chunking (CH)

- **CH1** `chunk(msg, maxSize)` returns `[msg]` when `msg.length < maxSize` (strictly less — a message exactly at `maxSize` is chunked).
- **CH2** Chunks are prefixed `<n>_` where `n` counts down the chunks remaining after this one; the first chunk carries the highest number and the start of the message, and concatenating the chunk bodies in order reconstructs the message.
- **CH3** Each chunk's total length is at most `maxSize`, except that every chunk carries at least one character of content even when the prefix alone exceeds `maxSize`.
- **CH4** `JsonChunkAssembler.handleMessage`: input starting with `{` while idle is parsed immediately and returned as `{ data, stringified }`. Invalid JSON in this case throws synchronously (callers treat a throw as a fatal session error).
- **CH5** Input starting with `{` mid-sequence returns `{ error: 'Unexpected non-chunk message' }`; the partial sequence and the JSON message are both discarded and the assembler resets to idle.
- **CH6** Chunk inputs accumulate, returning `null` until the final (`0_`) chunk arrives, then the joined body is JSON-parsed and returned; a parse failure is returned as `{ error }`. Either way the assembler resets to idle.
- **CH7** A chunk whose countdown number is inconsistent with its position returns `{ error: 'Chunks received in wrong order' }`. A non-JSON, non-chunk message returns an `Invalid chunk` error. Both reset to idle.
- **CH8** Chunk bodies may contain any character, including line terminators like U+2028/U+2029 (the chunk regex uses dot-all).

## 8. `interval` (IN)

- **IN1** `interval(cb, ms)` invokes `cb` every `ms` milliseconds until the returned dispose function is called.

## 9. `MicrotaskNotifier` (MN) — internal

- **MN1** `notify(...args)` defers delivery to a microtask; each registered listener is called with the notification's arguments, in registration order.
- **MN2** Registration is itself deferred by one microtask: a listener does not receive notifications issued _before_ `register` was called, but does receive notifications issued after it (even in the same synchronous block).
- **MN3** The returned unsubscribe is synchronous and immediate; calling it before the registration microtask runs prevents the registration entirely; calling it twice is safe. Listeners are held in a `Set`, so registering the same function twice deduplicates: it fires once per notification, and either registration's unsubscribe removes it.
- **MN4** A listener that throws is caught and logged; remaining listeners still run.

## 10. Storage contract (SS)

These rules hold for both `InMemorySyncStorage` and `SQLiteSyncStorage`. The shared test suite runs against both implementations.

- **SS1** When constructed without a snapshot (and, for SQLite, with no pre-existing data), storage seeds from `DEFAULT_INITIAL_SNAPSHOT`: one `document` record, one `page` record, clock 0.
- **SS2** `transaction(callback, opts?)` runs `callback(txn)` synchronously and returns `{ documentClock, didChange, result, changes? }`, where `result` is the callback's return value.
- **SS3** `didChange` is true exactly when the document clock advanced during the transaction.
- **SS4** A callback that returns a promise causes the transaction to throw.
- **SS5** A callback that throws rolls back every write made in the transaction — documents, tombstones, schema, and the clock — and rethrows; no change notification fires.
- **SS6** After a transaction that advanced the clock, `onChange` listeners are notified on a microtask with `{ id, documentClock }`, where `id` is the transaction's `opts.id` (undefined when not given). Read-only transactions do not notify. Unsubscribing stops future notifications. An `onChange` callback passed to the constructor is registered the same way.
- **SS7** The `changes` field is populated only when `emitChanges: 'always'` is passed, and contains the forward diff of everything that changed during the transaction. These implementations apply changes verbatim, so `emitChanges: 'when-different'` never emits.
- **SS8** `txn.getClock()` returns the clock at transaction start; after the first write it returns the incremented value. The storage-level `getClock()` always returns the committed clock.
- **SS9** The clock increments exactly once per writing transaction, no matter how many writes occur.
- **SS10** `txn.get(id)` returns the record, or `undefined` when absent.
- **SS11** `txn.set(id, record)` asserts `id === record.id`, stores the record with `lastChangedClock` set to the transaction's clock, and clears any tombstone with that id.
- **SS12** `txn.delete(id)` of an existing record removes it and writes a tombstone at the transaction's clock. Deleting an absent id is a complete no-op: no tombstone, no clock advance.
- **SS13** `txn.entries()`/`keys()`/`values()` iterate the documents. Consuming any of these iterators after the transaction has ended throws.
- **SS14** `txn.getSchema()`/`setSchema(schema)` read and write the persisted serialized schema.
- **SS15** `txn.getChangesSince(c)` returns `undefined` when `c` equals the current clock. A `c` greater than the current clock is treated as `-1` (everything changed). The result's `wipeAll` is true when `c < tombstoneHistoryStartsAtClock`; in that case `puts` contains every document and `deletes` is empty. Otherwise `puts` contains documents with `lastChangedClock > c` (strict) and `deletes` the tombstone ids with clock `> c`.
- **SS16** `getSnapshot()` returns `{ documentClock, tombstoneHistoryStartsAtClock, documents, tombstones, schema }` reflecting all committed transactions.
- **SS17** Snapshot fallbacks at construction: `documentClock ?? clock ?? 0`; `tombstoneHistoryStartsAtClock ?? documentClock`.
- **SS18** When the tombstone count exceeds `MAX_TOMBSTONES` (5000), a throttled (1s, trailing-only) prune deletes the oldest tombstones — the overflow plus `TOMBSTONE_PRUNE_BUFFER_SIZE` (1000) more, never splitting a clock value — and advances `tombstoneHistoryStartsAtClock` to the oldest surviving tombstone's clock.

## 11. `InMemorySyncStorage` specifics (IM)

- **IM1** At construction the document clock is clamped _up_ to the maximum `lastChangedClock`/tombstone clock found in the snapshot, even when the snapshot's `documentClock` is lower.
- **IM2** `tombstoneHistoryStartsAtClock` is clamped _down_ to the document clock.
- **IM3** Snapshot tombstones are discarded at construction when `tombstoneHistoryStartsAtClock` equals the document clock (no usable history).
- **IM4** Stored records are dev-frozen, both when loaded from a snapshot and on `set`.
- **IM5** When the snapshot has no schema, the earliest tldraw schema version is assumed (`createTLSchema().serializeEarliestVersion()`).
- **IM6** Duplicate document ids in a snapshot: the last entry wins.

## 12. `SQLiteSyncStorage` specifics (SQ)

- **SQ1** Construction creates/migrates the `documents`, `tombstones`, and `metadata` tables, honoring the wrapper's `tablePrefix`. Data persists across re-instantiation over the same database.
- **SQ2** Constructed _with_ a snapshot, existing data is wiped and replaced. Constructed _without_ one: pre-existing data is kept untouched; an empty database seeds from `DEFAULT_INITIAL_SNAPSHOT`. A `StoreSnapshot` is accepted and converted (SL1).
- **SQ3** Unlike IM1–IM3, the snapshot's `documentClock` and `tombstoneHistoryStartsAtClock` are taken verbatim (no clamping against document/tombstone clocks), and tombstones are loaded even when the history window is empty.
- **SQ4** `SQLiteSyncStorage.hasBeenInitialized(wrapper)` is true exactly when the metadata table exists and holds a non-empty schema string; it respects the table prefix and returns false (rather than throwing) on a missing table.
- **SQ5** `SQLiteSyncStorage.getDocumentClock(wrapper)` returns the persisted clock, or `null` when storage is uninitialized.
- **SQ6** Document state is stored as JSON-encoded BLOBs. Databases created by the v1 schema (TEXT column) are migrated to BLOB preserving data; fresh databases start at migration version 2.

## 13. `computeTombstonePruning` (TP) — internal

- **TP1** Returns `null` when the tombstone count is at or below `maxTombstones`.
- **TP2** The cutoff starts at `pruneBufferSize + count − maxTombstones` and is extended forward while it would split tombstones sharing a clock value; `idsToDelete` is the first `cutoff` entries (input must be sorted by clock ascending).
- **TP3** `newTombstoneHistoryStartsAtClock` is the clock of the oldest surviving tombstone, or `documentClock` when everything is deleted.

## 14. SQLite wrappers (NW, DO)

- **NW1** `NodeSqliteWrapper` passes `exec` and `prepare` through to the underlying database (`node:sqlite` `DatabaseSync` or `better-sqlite3`); prepared statements support `all`, `iterate`, and `run` with bindings and can be reused.
- **NW2** `NodeSqliteWrapper.transaction` wraps the callback in `BEGIN`/`COMMIT`, returns the callback's result, and on a throw issues `ROLLBACK` and rethrows the original error.
- **DO1** `DurableObjectSqliteSyncWrapper.prepare` returns a statement that re-executes the stored SQL with the given bindings on every `iterate`/`all`/`run` call; `exec` forwards to `sql.exec`; `transaction` delegates to the Durable Object's `transactionSync`.

## 15. Snapshot loading and conversion (SL)

- **SL1** `convertStoreSnapshotToRoomSnapshot` passes a `RoomSnapshot` (anything with a `documents` key) through by reference; a `StoreSnapshot` becomes a room snapshot with clock 0, every document at `lastChangedClock` 0, and no tombstones.
- **SL2** `loadSnapshotIntoStorage` requires the (converted) snapshot to have a schema and throws otherwise.
- **SL3** Documents deep-equal to the stored state are skipped (their `lastChangedClock` is preserved); changed and new documents are written; stored documents absent from the snapshot are deleted (tombstoned).
- **SL4** The snapshot's schema is persisted and `schema.migrateStorage` then migrates all loaded records up to the room's current schema version.

## 16. `ServerSocketAdapter` (SA)

- **SA1** `isOpen` is true exactly when the wrapped socket's `readyState` is 1.
- **SA2** `sendMessage(msg)` JSON-stringifies the message and sends it; when configured, `onBeforeSendMessage(msg, stringified)` is invoked before the send.
- **SA3** `close(code?, reason?)` passes through to the wrapped socket.

## 17. `ClientWebSocketAdapter` (CW)

- **CW1** Constructed with a `getUri` function (sync or async); a connection attempt starts immediately. `http(s)` URIs are converted to `ws(s)`. `getUri` is re-invoked for every attempt, so it can return fresh auth tokens.
- **CW2** `connectionStatus` starts as `'offline'`; when the socket opens it becomes `'online'` and status listeners receive `{ status: 'online' }`.
- **CW3** A socket close with code `TLSyncErrorCloseEventCode` (4099) produces status `'error'` with the close reason (or `'UNKNOWN_ERROR'` when empty); all other closes and socket errors produce `'offline'`.
- **CW4** Status listeners are notified only on actual status changes; an `'error'` arriving while already `'offline'` is suppressed.
- **CW5** A close with code 1006 on a socket that never opened logs a one-time warning about the URL likely not supporting WebSockets.
- **CW6** `sendMessage`: when online, the message is JSON-stringified, chunked (CH1–CH3), and each chunk sent; when a socket exists but is not online, the message is dropped with a console warning; with no socket it is silently dropped. After `close()` it throws.
- **CW7** Incoming socket messages are JSON-parsed and forwarded to `onReceiveMessage` listeners; listeners can unsubscribe.
- **CW8** `restart()` closes the current socket (notifying `'offline'`) and starts a reconnection attempt.
- **CW9** `close()` disposes the adapter: `restart`, `sendMessage`, and listener registration then throw; `close` itself is idempotent.
- **CW10** Events from orphaned sockets (a socket replaced after `restart`/offline handling) are ignored — they cannot change status.

## 18. `ReconnectManager` (RM) — internal

- **RM1** Reconnection delays follow exponential backoff with exponent 1.5, bounded by `ACTIVE_MIN_DELAY` (500ms) and `ACTIVE_MAX_DELAY` (2s) when the tab is visible, and `INACTIVE_MIN_DELAY` (1s) and `INACTIVE_MAX_DELAY` (5min) when hidden.
- **RM2** A successful connection resets the intended delay to `ACTIVE_MIN_DELAY`.
- **RM3** The window `offline` event closes the active socket (which triggers the reconnect cycle).
- **RM4** Reconnect hints (window `online`, the document becoming visible) call `maybeReconnected`: a socket that is OPEN is left alone; one that is CONNECTING for less than `ATTEMPT_TIMEOUT` (1s) is rechecked later; one CONNECTING for longer is closed and retried; otherwise the backoff is reset and a reconnect attempt happens immediately (honoring the minimum delay).
- **RM5** `close()` cancels all timers and event listeners.

## 19. `TLSyncClient` — connection lifecycle (CL)

- **CL1** If the socket is already online at construction, a connect message is sent immediately; otherwise it is sent when the socket first reports `'online'`.
- **CL2** The connect message carries a fresh unique `connectRequestId`, the store's serialized schema, protocol version 8, and `lastServerClock` (−1 before any server contact, afterwards the last seen server clock).
- **CL3** `onLoad` fires on the first message received from the server, of any type.
- **CL4** A `connect` response whose `connectRequestId` does not match the latest request is ignored.
- **CL5** On a `connect` response with `hydrationType: 'wipe_presence'`, the client reverts its speculative changes, removes all presence records, applies the server's diff, then re-applies the speculative changes on top and pushes them as a new push request.
- **CL6** With `hydrationType: 'wipe_all'`, all document records are additionally wiped before the server's diff is applied; speculative changes still re-apply on top afterwards.
- **CL7** After connecting, `onAfterConnect` is called with `{ isReadonly }` from the connect message, and the current presence state (if any) is pushed.
- **CL8** When the socket goes `'offline'`, the client resets: presence records are removed from the store, pending and unsent pushes are dropped, and the client waits to reconnect. When the socket reports `'error'`, `onSyncError(reason)` fires and the client closes permanently.
- **CL9** While connected, a ping is sent every 5 seconds; if nothing has been heard from the server for 10 seconds, the client warns and restarts the socket.
- **CL10** A `pong` (or any server message) refreshes the server-interaction timestamp.
- **CL11** When `didCancel` is provided and returns true, the next event causes the client to close instead of processing.
- **CL12** `close()` disposes all listeners and timers and removes the `window.tlsync` debugging reference (which construction installs).
- **CL13** An `incompatibility_error` server message is legacy: it is logged as an error and otherwise ignored.

## 20. `TLSyncClient` — pushing changes (CP)

- **CP1** Store changes with source `'user'` and scope `'document'` are folded into the speculative diff immediately. Remote and non-document changes are not pushed.
- **CP2** While connected, those changes also accumulate into an unsent diff which is sent as a push request on the network throttle; multiple changes coalesce into a single push containing the squashed diff. Changes that cancel out (create then delete) result in no push at all.
- **CP3** While not connected, changes accumulate only in the speculative diff; nothing is sent, and the accumulated changes are pushed after the next successful connect (CL5).
- **CP4** Each sent push increments the client clock by exactly one and carries it as `clientClock`.
- **CP5** Presence pushes: the first send is `['put', record]`, subsequent sends are `['patch', diff]` against the last pushed state; an unchanged presence sends nothing; document and presence changes ride in the same push request when both are pending. After a reconnect, presence is re-put in full.
- **CP6** In `'solo'` presence mode the presence signal is not pushed at all (document changes still are); the network throttle drops from 30fps to 1fps.
- **CP7** When the store reports possible corruption, pushes stop.

## 21. `TLSyncClient` — receiving and rebasing (CR)

- **CR1** `data`, `patch`, and `push_result` events are buffered and processed on the throttle; they are dropped entirely when the client is not connected to the room.
- **CR2** Rebase processes the buffer atomically inside a remote-change batch: speculative changes are reverted (without running store side effects), buffered server events are applied, then any still-pending and unsent local changes are re-applied on top and become the new speculative diff. Changes applied during a rebase do not generate new push requests.
- **CR3** A `push_result` must match the oldest pending push's `clientClock`: `commit` applies that push's diff as confirmed; `discard` drops it; `rebaseWithDiff` applies the server's modified diff instead.
- **CR4** A `push_result` with no pending pushes, or with a mismatched `clientClock`, is an error: the store is checked for usability and the connection resets.
- **CR5** `lastServerClock` advances to the last buffered event's `serverClock` and is used for the next reconnect.
- **CR6** Applying a network diff is value-aware: a `put` equal to the stored record is a no-op for listeners, a `patch` for a missing record is skipped, and a `remove` of a missing record is skipped.
- **CR7** `custom` events invoke `onCustomMessageReceived(data)` with `this` bound to null.

## 22. `TLSyncRoom` — construction (RC)

- **RC1** The room serializes its schema with a JSON round-trip (so it contains no `undefined` values).
- **RC2** A schema with more than one `presence`-scoped type throws at construction.
- **RC3** Construction runs `schema.migrateStorage` in a storage transaction, migrating any pre-existing storage data up to the room's schema version. Re-running on already-migrated data changes nothing.
- **RC4** Storage `onChange` notifications carrying a foreign transaction id make the room broadcast the new changes to all connected clients. The room's own transactions (id `'TLSyncRoom.txn'`) do not re-broadcast this way.
- **RC5** If an external change leaves the storage unable to produce an incremental diff (`wipeAll`), the room closes every session so clients reconnect and re-hydrate.
- **RC6** The idle timeout defaults to `SESSION_IDLE_TIMEOUT` (20s) and is configurable via `clientTimeout`. A finite positive timeout starts a periodic prune interval of `min(2000, timeout/4)` ms; `Infinity` or 0 disables the interval (pruning then only happens on message activity).
- **RC7** `close()` closes every session's socket and stops background work; `isClosed()` reports it.

## 23. `TLSyncRoom` — connect handshake (HS)

- **HS1** `handleNewSession` registers the session in `AwaitingConnectMessage` state and assigns a presence id; a session re-registered under the same id keeps its previous presence id.
- **HS2** Protocol negotiation accepts versions 5 through 8: 5 and 6 are accepted with `requiresLegacyRejection` (6's close protocol), 7 is accepted with `supportsStringAppend: false`, 8 natively. Anything below 5 (or missing) is rejected `CLIENT_TOO_OLD`; anything above 8 is rejected `SERVER_TOO_OLD`.
- **HS3** A connect message without a schema, with a schema the server cannot migrate from, or whose migrations include any non-record-scope or down-less migration, is rejected `CLIENT_TOO_OLD`.
- **HS4** The connect response echoes `connectRequestId` and `isReadonly`, carries the server's schema and current clock, and `hydrationType: 'wipe_all'` when storage cannot produce an incremental diff since the client's `lastServerClock` (including when that clock is in the future), else `'wipe_presence'`.
- **HS5** The connect response diff contains every _other_ session's presence record — the connecting session's own presence is excluded — plus the document changes since the client's `lastServerClock` (the full document set in the `wipe_all` case), all down-migrated when the client's schema is older.
- **HS6** A successful handshake moves the session to `Connected`.

## 24. `TLSyncRoom` — push handling (RP)

- **RP1** Pushes from sessions that are not `Connected` are ignored.
- **RP2** A `put` whose record type is not a known document type rejects the session with `INVALID_RECORD`. A record that fails schema validation also rejects with `INVALID_RECORD` (closing the socket with code 4099).
- **RP3** A `put` of a new id stores the record and broadcasts a `put`; a `put` over an existing record stores the new state but broadcasts a `patch` containing only the computed difference; a `put` equal to the stored record changes nothing.
- **RP4** A `patch` for a missing (e.g. concurrently deleted) record is silently ignored.
- **RP5** A `patch` is applied to the stored record (AD rules) and the result validated; the broadcast patch is the recomputed effective diff, not the client's input.
- **RP6** A `remove` of an existing record deletes it (creating a tombstone) and broadcasts the removal; a `remove` of a missing record is ignored.
- **RP7** The push result is `commit` when the applied network diff equals the requested document diff exactly (a presence-only push therefore commits), `discard` when a requested document diff produced no change, and `{ rebaseWithDiff }` carrying the actual (per-session-migrated) diff otherwise.
- **RP8** Applied changes are broadcast as a `patch` to every other connected session, never echoed to the pusher (who gets the push result instead).
- **RP9** For read-only sessions the document portion of a push is ignored wholesale (resulting in `discard`); the presence portion is still processed.
- **RP10** Presence ops are applied to the in-memory presence store under the session's presence id, with `id` and `typeName` forced server-side; they are broadcast to other sessions and never touch document storage or the document clock. `onPresenceChange` fires on a microtask after presence changes.
- **RP11** A push (or ping) updates the session's `lastInteractionTime`; a ping is answered with `pong`.
- **RP12** A `TLSyncError` thrown while handling a message (validation, migration) rejects only that session with the error's reason.
- **RP13** When the storage layer reports that it modified the transaction's changes (`emitChanges: 'when-different'`), the room broadcasts the storage's actual changes and the pusher receives them as `rebaseWithDiff`. (The built-in storages never do this; the rule is observable with a custom storage.)

## 25. `TLSyncRoom` — messaging and broadcast (RB)

- **RB1** Data messages (`patch`, `push_result`) to a session are debounced: the first is sent immediately wrapped as `{ type: 'data', data: [msg] }`; messages within the following `DATA_MESSAGE_DEBOUNCE_INTERVAL` (1000/60 ms) are buffered and flushed together as one `data` message. The array handed to the socket is not mutated afterwards, so sockets may serialize lazily.
- **RB2** Non-data messages flush any buffered data messages first, preserving order — except `pong`, which skips the flush.
- **RB3** Sending to a session whose socket is closed cancels that session.
- **RB4** Broadcasts are migrated per session (MG1); a migration failure rejects only the affected session, and the broadcast proceeds for the others.
- **RB5** `sendCustomMessage` delivers `{ type: 'custom', data }` to a connected session; sending to an unknown or not-yet-connected session logs a warning and does nothing.

## 26. `TLSyncRoom` — session lifecycle (SES)

- **SES1** `pruneSessions`: a `Connected` session idle longer than the idle timeout, or whose socket is closed, is cancelled. An `AwaitingConnectMessage` session older than `SESSION_START_WAIT_TIME` (10s), or whose socket is closed, is removed immediately. An `AwaitingRemoval` session older than `SESSION_REMOVAL_WAIT_TIME` (5s) is removed.
- **SES2** Cancelling (also via `handleClose`) moves the session to `AwaitingRemoval` — keeping its presence id and meta for a quick reconnect — closes the socket, and schedules a follow-up prune.
- **SES3** Removal deletes the session, closes the socket (with code 4099 and the reason when fatal), deletes the session's presence record and broadcasts that deletion to everyone, emits `session_removed`, and emits `room_became_empty` when it was the last session.
- **SES4** `rejectSession` with a reason: legacy sessions (protocol ≤ 6) receive a deprecated `incompatibility_error` message (reason mapped: `CLIENT_TOO_OLD` → `clientTooOld`, `SERVER_TOO_OLD` → `serverTooOld`, `INVALID_RECORD` → `invalidRecord`, anything else → `invalidOperation`) and are then removed without a close code; modern sessions are closed with code 4099 and the reason string. Without a reason it is a plain removal.
- **SES5** `getCanEmitStringAppend()` is false when any connected session has `supportsStringAppend: false`; pushes handled in that state use legacy append mode (D5) so broadcast diffs avoid string-append ops.
- **SES6** `handleResumedSession` registers a session directly in `Connected` state (no handshake): `requiresDownMigrations` is recomputed from the supplied schema, and a supplied presence record is restored into the presence store.
- **SES7** A message from an unknown session id logs a warning and is ignored.

## 27. Migrations over the wire (MG)

- **MG1** Down-migration of outgoing diffs: full-record puts are migrated down; `[before, after]` updates migrate both sides and send the re-computed patch between the migrated versions; deletes pass through. A failure rejects the session `CLIENT_TOO_OLD`.
- **MG2** Up-migration of incoming pushes: put records are migrated up before storing. Patches from older clients are applied to the _down-migrated_ stored record, and the patched result is migrated back up. Migration failures reject the session `CLIENT_TOO_OLD`.
- **MG3** Sessions whose serialized schema deep-equals the server's share the server's schema object and skip migration entirely; same-version clients exchange minimal patches.

## 28. `TLSocketRoom` (SR)

- **SR1** Providing both `storage` and `initialSnapshot` throws. With neither, an `InMemorySyncStorage` seeded from `DEFAULT_INITIAL_SNAPSHOT` is created; `initialSnapshot` (deprecated) accepts both room and store snapshots.
- **SR2** The deprecated `onDataChange` callback is wired to `storage.onChange` (fires on a microtask after document changes, including programmatic ones).
- **SR3** `log` defaults to `{ error: console.error }` only when the `log` key is absent from the options object; an explicitly passed `log: undefined` leaves the room without a logger.
- **SR4** `handleSocketConnect` registers the session (readonly defaults to false), attaches `message`/`close`/`error` listeners when the socket supports `addEventListener`, and creates a chunk assembler for the session.
- **SR5** `handleSocketMessage` assembles chunks (CH rules), then for each complete message: invokes `onAfterReceiveMessage`, forwards to the room, and runs a prune pass (after handling, so a session is never evicted by its own message). Assembly errors close the socket via the error path; a thrown exception rejects the session with `UNKNOWN_ERROR`.
- **SR6** `handleSocketError` and `handleSocketClose` cancel the session (grace period applies per SES2) and clear any pending session-snapshot timer.
- **SR7** `getNumActiveSessions()` counts all sessions including those awaiting connect/removal; `getSessions()` reports `{ sessionId, isConnected, isReadonly, meta }`.
- **SR8** `getRecord(id)` returns a deep clone of the stored record (safe to mutate), or `undefined`.
- **SR9** `getCurrentDocumentClock()` returns the storage clock; `getCurrentSnapshot()` delegates to `storage.getSnapshot` and throws when the storage doesn't support it.
- **SR10** `loadSnapshot` replaces the room contents per SL2–SL4 inside one transaction; connected clients receive the resulting changes (or are force-reconnected on a wipe per RC5).
- **SR11** `close()` closes the room, clears session-snapshot timers, and disposes subscriptions; `closeSession(sessionId, fatalReason?)` behaves as SES4.
- **SR12** With `onSessionSnapshot` configured, a session snapshot is delivered 5 seconds after that session's last message; further messages reset the timer; socket close/error cancels it.
- **SR13** `getSessionSnapshot` returns null unless the session is `Connected`; the snapshot carries the serialized schema, readonly flag, legacy/append flags, presence id, and the presence record with large fields stripped (`scribbles: []`, `chatMessage: ''`, `selectedShapeIds: []`, `brush: null`).
- **SR14** `handleSocketResume` restores a session from a snapshot directly into `Connected` state without attaching socket listeners (hibernation environments deliver events via methods); the resumed session handles pings and pushes normally.
- **SR15** `getPresenceRecords()` returns a map of presence id to presence record for every presence currently in the room.

## 29. `updateStore` (US) — deprecated

- **US1** The updater receives an isolated context over a point-in-time snapshot: `get` returns a deep clone (mutating it does nothing without `put`), `null` for missing or deleted ids.
- **US2** `put` validates the record against the schema (unknown types and invalid records throw). A `put` deep-equal to the snapshot state cancels any pending put for that id; any `put` clears a pending delete.
- **US3** `delete` accepts a record or id, cancels any pending put, and records a delete only for ids that exist in the snapshot.
- **US4** `getAll` returns pending puts plus all snapshot records that are neither deleted nor shadowed, as clones.
- **US5** After the updater resolves (it may be async), all changes commit in a single storage transaction: the document clock advances at most once and `onChange` fires only when something actually changed.
- **US6** Context methods throw after the updater completes (`'StoreUpdateContext is closed'`); `updateStore` on a closed room rejects.
