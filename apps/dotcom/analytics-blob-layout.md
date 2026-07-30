# Analytics Engine blob layout

Status: proposal. Nothing here is implemented.

Context: <https://github.com/tldraw/tldraw/pull/9676#issuecomment-5094393287>, which proposed a v2 layout for the `MEASURE` dataset. This document records what the layout is today and recommends a variant of that proposal chosen to avoid a migration.

Analytics Engine has no way to name columns. The schema is fixed at `blob1…blob20`, `double1…double20` and exactly one `index1`, and naming only happens at query time via `AS` aliases. So any schema we have has to live in our code.

## The problem

`MEASURE` has accumulated four conventions and no written schema:

- `blob3` means seven different things depending on the event: a client instance id, a user id, an event sub-type (on two different writers), a connection pool name, a queue message type, an R2 operation type, or a `source:…` pair.
- The file DO puts the _specific_ event in `blob1` (`enter`, `room_start`, `on_request_total`, ~30 distinct values). The replicator and user DO do the opposite: one name (`replicator`, `user_durable_object`) with the real type in `blob3`.
- The screenshot surfaces use self-describing `key:value` blobs (`source:og`, `cache:hit`); everything else is bare positional.
- Most events carry no room or user identity at all, so the highest-volume ones — the `on_request_*` timers, `r2_queue_depth`, `postgres_*` — can't be attributed to anything.

Positions are load-bearing in three places: the **Events** and **Events V2** Grafana dashboards, and `internal/scripts/fetch-screenshot-metrics.ts`, the only tracked consumer. That script reads `blob1` and `blob2` as filters, `blob3`–`blob6` as payload, and `double3`.

## Current layout

`writeDataPoint` (`apps/dotcom/sync-worker/src/utils/analytics.ts`) fixes the first two slots for every writer:

| Slot     | Contents                                                                        |
| -------- | ------------------------------------------------------------------------------- |
| `blob1`  | event name (`TLDataPointName`)                                                  |
| `blob2`  | worker name (`env.WORKER_NAME`), defaulting to `development-tldraw-multiplayer` |
| `blob3`+ | caller-supplied payload                                                         |

The worker name sits in the second slot for legacy reasons: the first version of this only wrote the name, and moving it would have made old data hard to query.

### `TLFileDurableObject`

Every event except `room_size_mb` goes through `writeEvent`, which sets `index1` to the object's durable object id. `room_size_mb` writes directly and so carries no index.

| `blob1` (event)                                                                                                                  | `blob3`                 | Doubles                          |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------- |
| `room_create`, `room_reopen`, `enter`, `leave`, `last_out`                                                                       | `instanceId`            | —                                |
| `rate_limited`                                                                                                                   | `userId ?? 'anon-user'` | —                                |
| `send_message`                                                                                                                   | `messageType`           | `messageLength`                  |
| `r2_queue_depth`                                                                                                                 | R2 operation type       | total depth, depth for that type |
| `room_start`, `room_empty`, `fail_persist`, `failed_persist_to_db`, `failed_load_from_db`                                        | —                       | —                                |
| `persist_success`                                                                                                                | —                       | attempts, duration ms            |
| `pierre_incremental_write_chars`                                                                                                 | —                       | payload length                   |
| `room_size_mb`                                                                                                                   | —                       | room size MB                     |
| `on_request_auth`, `on_request_rate_limit`, `on_request_group_check`, `on_request_get_room`, `on_request_total`                  | —                       | elapsed ms                       |
| `get_file_record`, `get_file_record_error`                                                                                       | —                       | elapsed ms                       |
| `db_load_total`, `db_load_total_error`, `db_load_r2_fetch`, `db_load_supabase_fetch`, `db_load_create_from_source`               | —                       | elapsed ms                       |
| `create_from_source_fetch_total`, `create_from_source_r2_put`, `create_from_source_r2_fetch`, `create_from_source_await_persist` | —                       | elapsed ms                       |

All 16 timer events are doubles-only: `timer()` appends elapsed milliseconds as the last double, so one timer can mark several checkpoints.

### Other writers

| `blob1` (event)               | `blob3`                  | `blob4`                                   | `blob5`–`blob7`                     |
| ----------------------------- | ------------------------ | ----------------------------------------- | ----------------------------------- |
| `replicator`                  | `event.type` (11 values) | `event.source`, on `reboot` only          | —                                   |
| `user_durable_object`         | `event.type`             | `event.id` (**user id**)                  | —                                   |
| `postgres_client_connect`     | pool name                | —                                         | —                                   |
| `postgres_client_end`         | pool name                | —                                         | —                                   |
| `postgres_client_error`       | pool name                | SQLSTATE or socket code                   | —                                   |
| `queue_message`               | message type             | outcome (`ack`/`retry`/`handled`/`error`) | —                                   |
| `mcp_shared_board_screenshot` | `source:…`               | `cache:…`                                 | `failure:…`, `rate_limit:…`, `ip:…` |

Of 39 datapoint names, 15 carry a blob payload and 24 are timers or counters with none. The widest payload is `mcp_shared_board_screenshot` at five blobs (`blob3`–`blob7`). **`blob8`–`blob15` are unused by every writer.**

## Proposal: name the fields in code, add identity in the unused range

Two identity fields and a writer type get fixed slots at the top of the range, leaving every current position untouched:

| Slot              | Contents                                         | Change                       |
| ----------------- | ------------------------------------------------ | ---------------------------- |
| `index1`          | id of the DO this datapoint is _about_           | already done for the file DO |
| `blob1`           | event                                            | unchanged                    |
| `blob2`           | env / worker name                                | unchanged                    |
| `blob3`–`blob15`  | event-specific payload                           | unchanged                    |
| `blob16`          | DO type — `file`, `user`, `replicator`, `worker` | new                          |
| `blob17`          | room key — derived DO id, empty when N/A         | new                          |
| `blob18`          | user id — raw, empty when N/A                    | new                          |
| `blob19`–`blob20` | reserved for future identity fields              | —                            |

Positions become an implementation detail of one module. Call sites use names:

```ts
// The single source of truth for the layout. Call sites use names; nothing
// outside this module knows a position.
const IDENTITY_ORDER = ['doType', 'room', 'user'] as const
const IDENTITY_START = 15 // blob16
const MAX_PAYLOAD_BLOBS = 13 // blob3..blob15

type EventIdentity = Partial<Record<(typeof IDENTITY_ORDER)[number], string>>
```

The alias map is exported alongside it, so Grafana and `fetch-screenshot-metrics.ts` consume one mapping instead of hand-writing `blob17 AS room` in every panel:

```ts
export const BLOB_ALIASES = {
	blob1: 'event',
	blob2: 'env',
	blob16: 'do_type',
	blob17: 'room',
	blob18: 'user',
} as const
```

### Why identity goes at the top of the range

The original proposal ordered the slots `env, doType, event, room, user, payload…`. That reads better, and it fixes the same `blob3` defect, but it moves `event` from `blob1` to `blob3` and `env` from `blob2` to `blob1`.

Those two columns are the `WHERE` clause of essentially every panel and of the metrics script. The edit itself is contained — the comment is right that between them the consumers use well under a dozen distinct columns. The problem is the 90-day retention overlap. After a cutover, `WHERE blob2 = 'production-tldraw-multiplayer'` still matches old rows and silently matches nothing new, because `blob2` now holds a DO type. The filter doesn't error, it returns a shrinking window of stale data. Same for `blob1 = 'enter'`. Every panel would need its filters rewritten in lockstep with the deploy, and would then misreport for 90 days as old rows fall out of the new positions.

`blob1` and `blob2` aren't part of the defect. They are already fixed and universal across every writer. Reordering them is aesthetic, and it is the entire cost of the migration.

Anchoring the new slots to the top of the range instead makes the change purely additive:

- No existing query changes, so no cutover date and no version-marker blob.
- Old rows read as `''` on the new columns, which renders as "unknown" rather than as wrong data.
- Panels can adopt the new dimensions one at a time, whenever someone wants them.

The cost is that the layout reads oddly on paper — payload before identity. That is the whole price, and it is invisible everywhere except `BLOB_ALIASES`, because no call site names a position.

Anchoring to the end of the range rather than to the end of the payload is deliberate. Analytics Engine's schema is fixed at exactly 20 blobs, so the top is a stable anchor; "just after the payload" is a guess at how wide payloads will get. Reserving 13 payload slots against a current maximum of five means these positions should never have to move. Padding the gap with empty strings costs effectively nothing: the per-datapoint blob budget is 16 KB, raised from 5 KB in June 2025.

### Identity slots are fixed, not writer-dependent

The tempting version is "room id or user id next, depending on which DO emitted it". That reintroduces exactly the varying-column defect described above. Fixed slots with empty strings are free.

Two of the new fields are already present in payload positions: `rate_limited`'s `blob3` and `user_durable_object`'s `blob4` are both user ids. Under this layout they get written to `blob18` as well, leaving the existing positions populated so current panels keep working. The duplication drops out whenever those panels are rewritten.

### The two identity slots are asymmetric

A room key is a derived DO id, because the slug is a bearer credential — `tldraw.com/f/<id>` is the access. `idFromName` is one-way, so an id read out of the dataset doesn't open the board.

A user id is only an identifier, and user pages are behind authz, so it goes in raw and joins straight to the `user` table, Clerk and support tickets with no derivation step. That does make those rows personal data, and Analytics Engine has no delete API, so retention is what bounds it.

### No value prefixes

`LIKE` and `HAVING` landed in January 2026, so `WHERE blob3 LIKE 'room:%'` does work now. But a prefix makes a value self-_describing_, not self-_locating_: you still have to know which column to read, and Analytics Engine has no array or map functions to scan generically. A prefix is a seatbelt against drift, not a schema.

## Why `index1` is the DO id

Cloudflare already keys its own telemetry on it: `$workers.durableObjectId` identifies the emitting instance in Workers Logs, and a namespace's metrics can be filtered to a single object by id or name. So analytics, logs and CPU/storage all join on one value.

**The index is the subject, not the emitter.** For a DO those coincide, but worker-context writers (the OG route, the queue consumer) are _about_ a room even though no DO emitted them — and they can derive the same value, since `idFromName` is a local derivation with no network cost that does not create or wake the object:

```ts
env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${fileId}`).toString()
```

That gives one uniform join column across every writer, and better sampling: a hot board's renders sample alongside its sync events, which is the tenant isolation the index is designed for. `blob16` still says whether a DO or a worker emitted the row. The cost is that a worker-emitted row's index won't match a `$workers.durableObjectId` log line — there isn't one — though it still lines up with that object's DO metrics.

For published boards, derive from `file.id`, not `board.slug`: the latter is the published slug, and `getPublishedFileInfo` already resolves it through `SNAPSHOT_SLUG_TO_PARENT_SLUG` and returns the file id. Deriving from the published slug yields a valid-looking id for an object that doesn't exist.

Analytics Engine allows exactly one index, so this spends it. In the file DO it displaced `localClientId`, which turned over on every page load and was never queried.

## Deliberately out of scope

Two items from the original proposal are left out, because both are value changes rather than additions and would break panels for real:

- **Promoting the replicator and user DO sub-types to `blob1`.** `replicator` and `user_durable_object` as `blob1` with the real type in `blob3` is a genuine inconsistency, but fixing it changes the set of values in `blob1` for those writers. Separate change.
- **Dropping the `key:value` prefixes on the screenshot blobs.** `fetch-screenshot-metrics.ts` reads those values as-is, including the prefix. Orthogonal to ordering.

Two dashboard bugs are worth fixing regardless, since they are wrong today rather than wrong after a migration:

- Several panels use bare `count()`/`sum()` where sampling requires `sum(_sample_interval)`.
- **Events** panel 13 has no `blob2` filter, so it silently mixes production, staging and every PR environment.

## Open questions

- **Doubles need a rule too.** They're positional, have no self-describing values, and vary per event today. The simplest honest rule: doubles are always event-specific and never queried across events.
- **Events with no subject.** `postgres.ts` only sees `env`, so it has no room or user to index on. Omitting `indexes` entirely there makes "no index" read as "not object-scoped" rather than inventing a sentinel. The replicator, stats and logger DOs are singletons, so their index is a constant — harmless but inert.
