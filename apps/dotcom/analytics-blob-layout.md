# Analytics Engine blob layout

Status: implemented. The header lives in `utils/analytics.ts`; each domain's payload lives in that domain's own writer.

Context: <https://github.com/tldraw/tldraw/pull/9676#issuecomment-5094393287>, which proposed a v2 layout for the `MEASURE` dataset. This document records what the layout is today and recommends a variant of that proposal: one writer per domain behind a small standard header, chosen so that no existing position moves.

Analytics Engine has no way to name columns. The schema is fixed at `blob1…blob20`, `double1…double20` and exactly one `index1`, and naming only happens at query time via `AS` aliases. So any schema we have has to live in our code.

## The problem

`MEASURE` has accumulated four conventions and no written schema:

- `blob3` means seven different things depending on the event: a client instance id, a user id, an event sub-type (on two different writers), a connection pool name, a queue message type, an R2 operation type, or a `source:…` pair.
- The file DO puts the _specific_ event in `blob1` (`enter`, `room_start`, `on_request_total`, ~30 distinct values). The replicator and user DO do the opposite: one name (`replicator`, `user_durable_object`) with the real type in `blob3`.
- The screenshot surfaces use self-describing `key:value` blobs (`source:og`, `cache:hit`); everything else is bare positional.
- Most events carry no room or user identity at all, so the highest-volume ones — the `on_request_*` timers, `r2_queue_depth`, `postgres_*` — can't be attributed to anything.

Positions are load-bearing in three places: the **Events** and **Events V2** Grafana dashboards, and `internal/scripts/fetch-screenshot-metrics.ts`, the only tracked consumer. That script reads `blob1` and `blob2` as filters, `blob3`–`blob6` as payload, and `double3`.

The root cause is that one function serves every writer. `writeDataPoint` takes a positional `blobs: string[]`, so the meaning of `blob3` is decided independently at each of ~15 call sites, with nothing to compare them against. There is no place where a payload layout is stated, so there is nothing to keep consistent and nothing to break when it drifts.

## Current layout

`writeDataPoint` (`apps/dotcom/sync-worker/src/utils/analytics.ts`) fixes the first two slots for every writer:

| Slot     | Contents                                                                        |
| -------- | ------------------------------------------------------------------------------- |
| `blob1`  | event name (`TLDataPointName`)                                                  |
| `blob2`  | worker name (`env.WORKER_NAME`), defaulting to `development-tldraw-multiplayer` |
| `blob3`+ | caller-supplied payload                                                         |

The worker name sits in the second slot for legacy reasons: the first version of this only wrote the name, and moving it would have made old data hard to query.

### `TLFileDurableObject`

Every event except `room_size_mb` went through `writeEvent`, which sets `index1` to the object's durable object id; `room_size_mb` wrote directly and so carried no index. It goes through `writeEvent` too now, for the reason at the end of this document.

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

## Proposal: one writer per domain, behind a standard header

The layout does not need to be global. What needs to be global is the **header** — the handful of columns every panel filters and groups on. Everything after the header can belong to a domain, because a query that reads a payload column has already filtered to the events that populate it.

`TLDataPointName` is already grouped by domain in its own comments, and three of the four big writers already have a per-domain mapper: `TLFileDurableObject.logEvent`, `TLPostgresReplicator.logEvent` and `TLUserDurableObject.logEvent` each take a typed event union and turn it into blobs. `writeScreenshotTelemetry` goes further and is the shape this proposal generalises — named fields in, positions decided in one place, callers that never see an array:

```ts
export function writeScreenshotTelemetry(
	env: Environment,
	data: { source: 'mcp' | 'og' | 'queue'; boardHash: string; cacheStatus: 'hit' | 'stale' | 'miss'; … }
)
```

So the change is less a rewrite than a promotion: give every domain that treatment, and make the header the only thing they share.

### The header

| Slot              | Contents                                   | Change                       |
| ----------------- | ------------------------------------------ | ---------------------------- |
| `index1`          | subject — id of the DO this row is _about_ | already done for the file DO |
| `blob1`           | event                                      | unchanged                    |
| `blob2`           | env / worker name                          | unchanged                    |
| `blob3`–`blob15`  | domain-owned payload                       | unchanged                    |
| `blob16`–`blob20` | reserved for future header fields          | —                            |

Six domains, taken from the existing grouping: `room`, `user`, `replicator`, `postgres`, `queue`, `screenshot`.

The domain is not a parameter and not a column. An event name already determines its domain, so the mapping is stated once and exported for the query side:

```ts
// utils/analytics.ts — exhaustive, so a new datapoint name without a domain is a type error
export const EVENT_DOMAINS: Record<TLDataPointName, TLAnalyticsDomain> = {
	enter: 'room',
	send_message: 'room',
	…
	postgres_client_end: 'postgres',
	mcp_shared_board_screenshot: 'screenshot',
}
```

The same module owns the header and is the only code in the repo that knows a position:

```ts
const MAX_PAYLOAD_BLOBS = 13 // blob3..blob15

export function writeDataPoint(
	env: Environment,
	name: TLDataPointName,
	{ subject, blobs, doubles }: DataPoint
) { … }
```

Each domain owns `blob3`+ and every double for its own events, behind a writer that takes the domain's event union rather than an array:

```ts
// the room domain's writer, on TLFileDurableObject
logEvent(event: TLServerEvent) {
	switch (event.type) {
		case 'send_message':
			return this.writeEvent('send_message', {
				blobs: [event.messageType],
				doubles: [event.messageLength],
			})
		…
	}
}
```

The alias map is exported from the core module, so Grafana and `fetch-screenshot-metrics.ts` consume one mapping rather than each naming positions itself:

```ts
export const COLUMN_ALIASES = {
	index1: 'subject',
	blob1: 'event',
	blob2: 'env',
} as const
```

### What the split fixes

- **`blob3` stops being ambiguous.** It means one thing per domain, and `EVENT_DOMAINS` says which domain a row belongs to, so a query reading a payload column knows which layout it is reading. The two competing conventions — specific event in `blob1` versus domain name in `blob1` with the type in `blob3` — both become legible under the same rule, which is why neither has to be migrated.
- **Doubles get a rule for free.** They are domain-owned and typed exactly like blobs, decided in one file per domain rather than at each call site. This was an open question under the single-writer design; it closes by construction.
- **Call sites stop being able to get it wrong.** A domain writer takes named fields, so a payload can't be built in the wrong order, and adding an event means editing the one file that defines that domain's layout. That is friction, and it is the point.
- **The domain never enters the dataset at all.** An event name already determines its domain, so a column holding it would be a second copy of `EVENT_DOMAINS` that could disagree with it. The map is exported instead, typed `Record<TLDataPointName, TLAnalyticsDomain>` so that adding a datapoint name without assigning it a domain is a type error rather than a quiet gap. A dashboard grouping by domain applies the map; the alternative — pasting a list of event names into each panel's `WHERE` — goes stale the next time a domain gains an event, which is the same failure mode as the panel bug noted below.

### Migration cost

None. Every domain writer emits exactly the bytes its call sites emit today, so this is a code-shape change and not a wire-format change: no query changes, no cutover date, no version-marker blob.

That is the whole reason the header keeps `blob1` and `blob2` where they are. The original proposal ordered the slots `env, doType, event, room, user, payload…`, which reads better and fixes the same defect, but moves `event` to `blob3` and `env` to `blob1`. Those two columns are the `WHERE` clause of essentially every panel. With 90-day retention, `WHERE blob2 = 'production-tldraw-multiplayer'` after a cutover still matches old rows and silently matches nothing new — it doesn't error, it returns a shrinking window of stale data for 90 days. `blob1` and `blob2` aren't part of the defect; they're already fixed and universal. Reordering them is aesthetic, and it is the entire cost of the migration.

Bounding payloads at `blob15` follows from the same reasoning. The schema is fixed at exactly 20 blobs, so the top of the range is a stable anchor for any header field a later change wants; "just after the payload" is a guess at how wide payloads will get. Reserving 13 payload slots against a current maximum of five means such a field could be added without any payload moving. Nothing pads to reach it — a row is exactly as long as its payload.

### The header carries exactly one identifier

Cloudflare's guidance is that blobs are for low-cardinality dimensions — status, method, country — and that raw UUIDs and full URLs do not belong in them. `index1` is the opposite case: it is the sampling key, and Analytics Engine samples _per index value_. That is what makes a per-room query return that room's events rather than a thinned slice of everything, and it is why the room id belongs there.

An earlier draft of this layout also gave the header a `blob16` user id, so that "everything about user X" would be one query. That was wrong on both counts:

- **Sampling.** A blob is not the sampling key, so filtering on one queries a sampled dataset. For a low-volume user the answer can be empty even though the events happened. The query the slot existed to enable was never going to be reliable.
- **It had almost no producers.** Only two events carry a user id at all — `rate_limited` and `user_durable_object` — and the latter is legacy code on its way out. "Cross-domain" was one live domain, which already writes the id in `blob3`. A header slot that duplicates what its single producer already writes is a copy that can disagree, not a dimension — the same rule that rules out a domain column and a room blob.

So identity is `index1` and nothing else. A room key is a derived DO id rather than the slug, because the slug is a bearer credential — `tldraw.com/f/<id>` is the access — and `idFromName` is one-way, so an id read out of the dataset doesn't open the board.

The cardinality rule is worth applying to the payloads too, and one existing blob fails it: `blob3` on `enter`, `leave`, `last_out`, `room_create` and `room_reopen` is the client `instanceId`, one distinct value per page load, on the highest-volume events in the dataset. This document already records that `localClientId` was displaced from `index1` because it "turned over on every page load and was never queried" — the same value is still in `blob3`. The screenshot surfaces show the shape of the fix: they record a hashed IP only on failures, precisely to keep a per-client dimension off the common path. Changing `instanceId` is a value change to a column panels read, so it is listed as out of scope below rather than done here.

### No value prefixes

`LIKE` and `HAVING` landed in January 2026, so `WHERE blob3 LIKE 'room:%'` does work now. But a prefix makes a value self-_describing_, not self-_locating_: you still have to know which column to read, and Analytics Engine has no array or map functions to scan generically. A prefix is a seatbelt against drift, not a schema.

## Why `index1` is the DO id

Cloudflare already keys its own telemetry on it: `$workers.durableObjectId` identifies the emitting instance in Workers Logs, and a namespace's metrics can be filtered to a single object by id or name. So analytics, logs and CPU/storage all join on one value.

**The index is the subject, not the emitter.** For a DO those coincide, but worker-context writers (the OG route, the queue consumer) are _about_ a room even though no DO emitted them — and they can derive the same value, since `idFromName` is a local derivation with no network cost that does not create or wake the object:

```ts
env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${fileId}`).toString()
```

That gives one uniform join column across every writer, and better sampling: a hot board's renders sample alongside its sync events, which is the tenant isolation the index is designed for. The cost is that a worker-emitted row's index won't match a `$workers.durableObjectId` log line — there isn't one — though it still lines up with that object's DO metrics.

Agreeing on that definition was the one piece of real work the split required. The screenshot surfaces used to index on a hash of the board slug, which joined to nothing. They now index on `getRoomDurableObjectId(env, board.fileId)`, which shares its name derivation with `getRoomDurableObject` so the two can't drift apart and start naming different objects for the same room.

Getting the file id there meant carrying it on the resolved board: resolution is the only step that knows a published slug's file id, and it already reads it. Two consequences fall out of that:

- A surface that never resolved its board — an unparseable MCP input, a queued job for a slug that no longer names a public board — writes **no** subject rather than a sentinel. A sentinel would collect every unrelated failure under one id and read as a real room.
- A shared file's slug _is_ its file id, so those surfaces can name the room even on the pre-resolve drop path. A published board can't, and doesn't try.

This is the one part of the layout that changes the values in a column dashboards already read: `index1` on the screenshot rows was a slug hash and is now a durable object id. Nothing queries it today — the hash joined to nothing, which is the whole reason for the change — but it is a value change rather than an addition, unlike everything else here.

For published boards, derive from `file.id`, not `board.slug`: the latter is the published slug, and `getPublishedFileInfo` already resolves it through `SNAPSHOT_SLUG_TO_PARENT_SLUG` and returns the file id. Deriving from the published slug yields a valid-looking id for an object that doesn't exist.

Analytics Engine allows exactly one index, so this spends it. In the file DO it displaced `localClientId`, which turned over on every page load and was never queried.

## Deliberately out of scope

Two items from the original proposal are left out, because both are value changes rather than additions and would break panels for real:

- **Promoting the replicator and user DO sub-types to `blob1`.** `replicator` and `user_durable_object` as `blob1` with the real type in `blob3` is a genuine inconsistency, but fixing it changes the set of values in `blob1` for those writers. It is also no longer urgent: `blob1` already determines the domain through `EVENT_DOMAINS`, so `blob3` is unambiguous either way. Separate change.
- **Taking the client `instanceId` out of `blob3`.** It is one distinct value per page load on the five highest-volume room events, which is what Cloudflare's cardinality guidance warns against. Removing or bucketing it changes the values in a column the connection panels read. Separate change.
- **Dropping the `key:value` prefixes on the screenshot blobs.** `fetch-screenshot-metrics.ts` reads those values as-is, including the prefix. Orthogonal to ordering.

Two dashboard bugs are worth fixing regardless, since they are wrong today rather than wrong after a migration:

- Several panels use bare `count()`/`sum()` where sampling requires `sum(_sample_interval)`.
- **Events** panel 13 has no `blob2` filter, so it silently mixes production, staging and every PR environment.

## Resolved while implementing

- **Events with no subject.** `postgres.ts` only sees `env`, so it has no object to index on, and it omits `subject` entirely — "no index" reads as "not object-scoped" rather than as a sentinel. The replicator is a singleton and writes its constant DO id: inert, but it keeps `index1` meaning one thing everywhere.
- **Where the domain writers live.** Each stays next to the code it instruments — `logEvent` on the three DOs, `writeScreenshotTelemetry` in `routes/tla/thumbnailRender.ts`, the pool client in `postgres.ts` — with only the core writer shared in `utils/analytics.ts`. An `analytics/` directory holding all six would have moved code without changing it.
- **Payloads wider than their range.** The core writer truncates at `blob15` rather than overflowing into the header: losing a payload dimension is recoverable, mislabelling every row's user is not.
- **Whether the domain is a column.** It isn't, and it isn't a parameter either — see above. `EVENT_DOMAINS` is exported for consumers instead.
- **Whether the header carries a user id.** It doesn't — see the cardinality section. `index1` is the only identifier.
- **`room_size_mb` now carries a subject.** It used to write directly rather than through the room DO's `writeEvent`, on the grounds that it feeds distribution and percentile queries rather than lookups. But an index costs a percentile query nothing, and it makes the outliers a distribution turns up attributable to a room, so it goes through `writeEvent` like everything else.
