# Access logging

Status: proposal. Nothing here is implemented.

Context: this came out of the `MEASURE` blob layout work (`analytics-blob-layout.md`), where the question was whether room `enter`/`leave` events should carry a user id and a session id. They shouldn't — not because the record isn't wanted, but because Analytics Engine is the wrong place to keep it. This document is the other half of that answer.

The three drivers are security and abuse investigation, a compliance and audit trail, and debugging live sessions. They want the same record; they differ in how long it has to live and how it gets queried.

## Why not Analytics Engine

`MEASURE` is a metrics store, and three of its properties are disqualifying for an access log:

- **It samples.** Adaptive bit rate thins rows as volume rises, so the record is least complete exactly when traffic is most interesting. You cannot tell which rows are missing, so a query returning nothing does not mean nothing happened — which is the one thing an access log has to be able to say.
- **There is no delete API.** An access log is keyed to people, so erasure requests mean removing a person's rows. Analytics Engine cannot, and retention is the only eraser.
- **Retention is capped at 90 days**, and is not adjustable upward.

The first is a quality problem. The second is a hard blocker, and it is the reason this cannot be solved by widening the blob layout.

Metrics and access logs also want opposite things from cardinality. `MEASURE` deliberately carries one identifier — `index1`, the room's durable object id — and keeps unbounded values out of blobs. An access log is nothing but identifiers.

## What exists today

- **`wrangler.toml:572`** enables Workers Logs and traces at `head_sampling_rate = 1`, to destinations `grafana-logs` and `grafana-traces`. It is scoped to `env.preview`. Production has no observability block, so there is no log stream in production at all.
- **`Logger`** (`src/Logger.ts`) is a debug facility, not a log stream: it is gated on `isDebugLogging(env)` and fans out to the logger durable object and Sentry breadcrumbs. It is for tailing a session by hand, and shouldn't be repurposed.
- **`MEASURE`** carries counts and timings, indexed on the room durable object id.

So the nearest existing lever is the observability block, and extending it to production is the first step whatever else is decided.

## What an access event is

One record per access, emitted as a structured line so the log pipeline can parse it rather than regex it.

| Field       | Notes                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ts`        | Emit time                                                                                                                                                                |
| `event`     | `connect`, `disconnect`, `download`, `history_read`, `publish_read`, `upload`, `invite_accept`                                                                           |
| `fileId`    | The room's file id, the same value `MEASURE` derives its index from                                                                                                      |
| `roomDoId`  | `idFromName('/r/' + fileId)` — joins to `MEASURE.index1`, to `$workers.durableObjectId` in Workers Logs, and to the namespace's own durable object metrics               |
| `userId`    | Null for anonymous access. `TLFileDurableObject.ts:642` closes only when `!auth && !file.shared`, so shared files admit unauthenticated clients                          |
| `sessionId` | `TAB_ID` from the client, one per browser tab, surviving reloads within that tab. Distinguishes concurrent tabs of one user, and pairs a `connect` with its `disconnect` |
| `openMode`  | Read/write vs readonly, and which prefix the access came through                                                                                                         |
| `authState` | `authed` or `anon`, so the mix is queryable without reading identities                                                                                                   |
| `ip`        | See erasure below; the screenshot surfaces already hash it and record it only on failures                                                                                |
| `reason`    | Close reason on `disconnect`, failure reason otherwise                                                                                                                   |

`roomDoId` is what makes this worth doing as a set rather than as scattered log lines: one value joins the access log, the metrics dataset, the worker logs and Cloudflare's own durable object metrics.

## Where access happens

The room durable object's `onRequest` is the main one, but not the only one. From the router in `worker.ts`:

- Room connects: `/app/file/:roomId`, `/${ROOM_PREFIX}/:roomId`, and the two readonly prefixes
- History reads: `/app/file/:roomId/history`, `…/pierre-history`, and the legacy room equivalents
- Downloads: `/app/file/:roomId/download`
- Published board reads: `/app/publish/:roomId`
- Uploads: `/app/uploads/:objectName`
- Invites: `/app/invite/:token/accept`
- Snapshots: `/snapshots`, `/snapshot/:roomId`

The screenshot and OG surfaces already write their own telemetry to `MEASURE` and are anonymous by construction, so they are arguably a separate question.

Emitting from one helper rather than at each route is what keeps the schema honest — the same argument as the domain writers in the blob layout.

## Sinks

Two, from one emit point, because the three drivers do not want the same retention:

- **Workers Logs → Grafana**, for interactive search over days to weeks. Serves debugging and the first pass of any abuse investigation. Extends the existing preview block to production; the sampling rate is a decision, and for access events specifically it should probably stay at 1.
- **Logpush → durable storage**, for the audit trail. Retention is exact and policy-driven rather than capped by a vendor default.

## The hard part: erasure

Everything above is routine. The requirement that shapes the design is being able to answer a deletion request, because immutable append-only storage and per-subject erasure pull against each other. Two ways:

**An audit table in Postgres.** `DELETE FROM access_log WHERE "userId" = $1` and it is done. Joins to `file` and `user` directly, retention is a cron, and queries are ordinary SQL. The cost is a write on the connect path, in a worker that is already careful about pool lifetime — `getPublishedFileInfo` destroys its pool per call specifically so idle pools don't accumulate.

**Object storage plus pseudonymisation.** Write a per-user pseudonym rather than the user id, and keep the pseudonym-to-user mapping in Postgres. Deleting the mapping row makes every log entry for that user unlinkable without rewriting a single object. Storage stays cheap, immutable and append-only. The cost is that every investigation goes through the mapping table, and that "unlinkable" has to be a defensible answer for whatever policy this is being held to.

The second is the standard shape for this problem. The first is simpler and probably fine at tldraw's connect volume. Both need a real retention period before either can be built.

## Open questions

- **Retention period**, which the compliance driver has to name. It determines the sink as much as the schema does.
- **Whether erasure is a hard requirement**, and if so whether an unlinkable record satisfies it. This is a policy answer, not an engineering one.
- **Whether IP is recorded**, and hashed or raw. It is the field most useful for abuse work and the most sensitive to keep.
- **Connect volume**, which decides whether a Postgres write per access is reasonable. Nothing currently measures it directly — `MEASURE`'s `enter` count does, subject to sampling.
- **Whether anonymous access is in scope.** Shared files and legacy rooms admit clients with no user id, so those rows can only be keyed on session and IP.
