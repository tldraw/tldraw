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

## Measured volume

From the Cloudflare dashboard on 3 August 2026. These are the numbers every decision below turns on.

**The worker** (`tldraw-multiplayer`, last 24 hours):

|                    |                                               |
| ------------------ | --------------------------------------------- |
| Invocations        | 8M                                            |
| Subrequests        | 5M                                            |
| Requests/sec       | 125.5                                         |
| Errors             | 7                                             |
| CPU time p50 / p99 | 1.98 ms / 18.35 ms                            |
| Client disconnects | ~72k (59k cancelled, 13k stream disconnected) |

**The durable objects**, which is where the volume actually is:

| Namespace                                | Requests |
| ---------------------------------------- | -------- |
| `tldraw-multiplayer_TLFileDurableObject` | 55.05M   |
| `…_TLStatsDurableObject`                 | 4.51M    |
| `…_TLUserDurableObject`                  | 220k     |
| `…_TLPostgresReplicator`                 | 127k     |

That table covers 1–3 August: the account usage panel reports 73.73M durable object requests for those dates, and the namespace rows sum to about the same. Over ~2.6 days it puts the room durable object at **~21M requests/day** against the worker's 8M — the websocket side is roughly 2.6× the HTTP side, and durable object invocations produce trace events too (`hibernatable_web_socket` is one of the Workers Trace Event types).

Call it **~31M events/day, ~950M/month** across the worker and its objects.

Two caveats. Per-event size is assumed at ~1 KB, which is a guess that scales everything below linearly. And the durable object window is inferred from that sum rather than read off a label, so the per-day figure is worth ±20%.

### What that costs to ship

At `head_sampling_rate = 1` with both logs and traces enabled:

|                | Cloudflare export | Grafana | Total             |
| -------------- | ----------------- | ------- | ----------------- |
| Unsampled      | ~$94              | ~$1,040 | **~$1,130/month** |
| At 5% sampling | ~$4               | ~$44    | **~$48/month**    |

Cloudflare bills 950M events per signal less the 10M included, at $0.05/million. Grafana takes ~1,900 GB across both signals less the 50 GB allowance, at ~$0.55/GB (process, write and retain combined), plus the $19 platform fee. At 2 KB/event the unsampled figure roughly doubles; the sampled one stays under $100.

So turning production observability on at the current preview settings — rate 1, and `persist` unset so it defaults to true — is a four-figure monthly change, not a config tweak. Sampled at 1–5% it is $50–100/month and worth having.

## Sinks

Two, from one emit point, because the three drivers do not want the same retention:

- **Workers Logs → Grafana**, for interactive search. Serves debugging and the first pass of any abuse investigation, at a sampling rate chosen for cost.
- **A durable sink** for the audit trail, where retention is exact and policy-driven rather than capped by a vendor default.

The volume figures settle something the earlier draft left as a principle. Access records cannot ride in the Grafana stream, because that stream has to be sampled to be affordable and head sampling drops whole invocations — the access line goes with the invocation that emitted it, silently, and disproportionately under load. Un-sampling it costs ~$1,100/month.

They do not need to. An access event is a _session_, not a message: ~72k disconnects/day, against 31M invocations. That is three orders of magnitude smaller, which is what makes a dedicated sink both affordable and complete.

## The hard part: erasure

Everything above is routine. The requirement that shapes the design is being able to answer a deletion request, because immutable append-only storage and per-subject erasure pull against each other. Two ways:

**An audit table in Postgres.** `DELETE FROM access_log WHERE "userId" = $1` and it is done. Joins to `file` and `user` directly, retention is a cron, and queries are ordinary SQL. The cost is a write on the connect path, in a worker that is already careful about pool lifetime — `getPublishedFileInfo` destroys its pool per call specifically so idle pools don't accumulate.

**Object storage plus pseudonymisation.** Write a per-user pseudonym rather than the user id, and keep the pseudonym-to-user mapping in Postgres. Deleting the mapping row makes every log entry for that user unlinkable without rewriting a single object. Storage stays cheap, immutable and append-only. The cost is that every investigation goes through the mapping table, and that "unlinkable" has to be a defensible answer for whatever policy this is being held to.

At ~72k accesses/day the Postgres option is comfortably viable — under one write per second on average, batched through the queue consumer rather than issued on the connect path. That was the open question about connect volume, and the measured answer removes the main objection to the simpler design. Both options still need a real retention period before either can be built.

## Open questions

- **Retention period**, which the compliance driver has to name. It determines the sink as much as the schema does.
- **Whether erasure is a hard requirement**, and if so whether an unlinkable record satisfies it. This is a policy answer, not an engineering one.
- **Whether IP is recorded**, and hashed or raw. It is the field most useful for abuse work and the most sensitive to keep.
- **Whether anonymous access is in scope.** Shared files and legacy rooms admit clients with no user id, so those rows can only be keyed on session and IP.
