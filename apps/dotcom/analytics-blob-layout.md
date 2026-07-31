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
| `blob16`          | user id — raw, empty when N/A              | new                          |
| `blob17`–`blob20` | reserved for future header fields          | —                            |

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
const USER_SLOT = 15 // blob16
const MAX_PAYLOAD_BLOBS = 13 // blob3..blob15

export function writeDataPoint(
	env: Environment,
	name: TLDataPointName,
	{ subject, userId, blobs, doubles }: DataPoint
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

The alias map is exported from the core module, so Grafana and `fetch-screenshot-metrics.ts` consume one mapping instead of hand-writing `blob16 AS user` in every panel:

```ts
export const COLUMN_ALIASES = {
	index1: 'subject',
	blob1: 'event',
	blob2: 'env',
	blob16: 'user',
} as const
```

### What the split fixes

- **`blob3` stops being ambiguous.** It means one thing per domain, and the domain is a column, so `WHERE domain = 'room'` scopes the payload columns instead of a twenty-name `IN` list on `blob1`. The two competing conventions — specific event in `blob1` versus domain name in `blob1` with the type in `blob3` — both become legible under the same rule, which is why neither has to be migrated.
- **Doubles get a rule for free.** They are domain-owned and typed exactly like blobs, decided in one file per domain rather than at each call site. This was an open question under the single-writer design; it closes by construction.
- **Call sites stop being able to get it wrong.** A domain writer takes named fields, so a payload can't be built in the wrong order, and adding an event means editing the one file that defines that domain's layout. That is friction, and it is the point.
- **The domain never enters the dataset at all.** An event name already determines its domain, so a column holding it would be a second copy of `EVENT_DOMAINS` that could disagree with it. The map is exported instead, typed `Record<TLDataPointName, TLAnalyticsDomain>` so that adding a datapoint name without assigning it a domain is a type error rather than a quiet gap. A dashboard grouping by domain applies the map; the alternative — pasting a list of event names into each panel's `WHERE` — goes stale the next time a domain gains an event, which is the same failure mode as the panel bug noted below.

### Migration cost

None. Every domain writer emits exactly the bytes its call sites emit today, so this is a code-shape change and not a wire-format change: no query changes, no cutover date, no version-marker blob. Old rows read as `''` on `blob16`, which renders as "unknown" rather than as wrong data, and panels can adopt the new dimension whenever someone wants it.

That is the whole reason the header keeps `blob1` and `blob2` where they are. The original proposal ordered the slots `env, doType, event, room, user, payload…`, which reads better and fixes the same defect, but moves `event` to `blob3` and `env` to `blob1`. Those two columns are the `WHERE` clause of essentially every panel. With 90-day retention, `WHERE blob2 = 'production-tldraw-multiplayer'` after a cutover still matches old rows and silently matches nothing new — it doesn't error, it returns a shrinking window of stale data for 90 days. `blob1` and `blob2` aren't part of the defect; they're already fixed and universal. Reordering them is aesthetic, and it is the entire cost of the migration.

Anchoring the new header fields to the top of the range is deliberate for the same reason. The schema is fixed at exactly 20 blobs, so the top is a stable anchor; "just after the payload" is a guess at how wide payloads will get. Reserving 13 payload slots against a current maximum of five means these positions should never have to move. The cost is that the layout reads oddly on paper — payload before header — and that is invisible everywhere except `COLUMN_ALIASES`, because no call site names a position. Padding the gap with empty strings costs effectively nothing: the per-datapoint blob budget is 16 KB, raised from 5 KB in June 2025.

### Why the header keeps a user slot

The tempting version of a domain split is that each domain owns its own identity columns too — the room domain puts a user id wherever it likes, the user domain somewhere else. That reintroduces the varying-column defect one level up: "everything about user X" is a cross-domain question, and answering it would mean knowing every domain's user column and `OR`-ing them together.

So identity is header, not payload. `index1` covers the room side for every domain at once (see below), and one fixed user slot covers the other. Fixed slots with empty strings are free.

Two events already carry a user id in a payload position: `rate_limited`'s `blob3` and `user_durable_object`'s `blob4`. `rate_limited` writes it to `blob16` as well, leaving the existing position populated so current panels keep working; the duplication drops out whenever those panels are rewritten. The user DO is left alone: it is legacy code on its way out, so it keeps the payload it has and gains nothing.

There is no separate room blob either. The original proposal had both `index1` and a room-key blob holding the same derived DO id; `index1` is selectable in queries, so the second copy earns nothing. Both omissions are the same rule: a column that another column already determines is a copy that can disagree, not a dimension.

### The two identity fields are asymmetric

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
- **Dropping the `key:value` prefixes on the screenshot blobs.** `fetch-screenshot-metrics.ts` reads those values as-is, including the prefix. Orthogonal to ordering.

Two dashboard bugs are worth fixing regardless, since they are wrong today rather than wrong after a migration:

- Several panels use bare `count()`/`sum()` where sampling requires `sum(_sample_interval)`.
- **Events** panel 13 has no `blob2` filter, so it silently mixes production, staging and every PR environment.

## Resolved while implementing

- **Events with no subject.** `postgres.ts` only sees `env`, so it has no object to index on, and it omits `subject` entirely — "no index" reads as "not object-scoped" rather than as a sentinel. The replicator is a singleton and writes its constant DO id: inert, but it keeps `index1` meaning one thing everywhere.
- **Where the domain writers live.** Each stays next to the code it instruments — `logEvent` on the three DOs, `writeScreenshotTelemetry` in `routes/tla/thumbnailRender.ts`, the pool client in `postgres.ts` — with only the core writer shared in `utils/analytics.ts`. An `analytics/` directory holding all six would have moved code without changing it.
- **Payloads wider than their range.** The core writer truncates at `blob15` rather than overflowing into the header: losing a payload dimension is recoverable, mislabelling every row's user is not.
- **Whether the domain is a column.** It isn't, and it isn't a parameter either — see above. `EVENT_DOMAINS` is exported for consumers instead.
- **`room_size_mb` now carries a subject.** It used to write directly rather than through the room DO's `writeEvent`, on the grounds that it feeds distribution and percentile queries rather than lookups. But an index costs a percentile query nothing, and it makes the outliers a distribution turns up attributable to a room, so it goes through `writeEvent` like everything else.
