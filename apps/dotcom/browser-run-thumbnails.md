# Browser Run thumbnails and MCP screenshots

Issues:

- <https://github.com/tldraw/tldraw/issues/9502>
- <https://github.com/tldraw/tldraw/issues/9497>

tldraw.com can capture PNG thumbnails of public boards by taking a Cloudflare Browser Rendering `/screenshot` of a tldraw-owned render page, called straight through the `BROWSER` binding's `quickAction` Quick Actions method — no `@cloudflare/puppeteer` and no API token (requires `compatibility_date >= 2026-03-24`). There are two consumers, both served by the sync worker:

- an MCP server at `POST /api/app/mcp` exposing a drill-down over four tools: `get_board_info` lists a board's pages (id, name, 0-based index, and whether each has content), `get_page_info` lists one page's clusters of shapes, `get_cluster_info` describes the shapes inside one cluster, and `get_cluster_screenshot` returns a content-fit PNG of one or more clusters. **It requires authentication** — see "Authentication on the MCP server"; and
- a board OG image endpoint, `GET /api/app/social-preview/:prefix/:slug/image`, built for high-traffic paths (link unfurls, crawlers): it serves only from the R2 cache and delegates rendering to a queue consumer, so a request never waits on Browser Run. It lives under the `social-preview` route family alongside the crawler HTML that references it.

Rendering runs through the Browser Rendering `/screenshot` Quick Action, invoked from the worker via the `BROWSER` binding's `quickAction` method (`env.BROWSER.quickAction('screenshot', …)`). Chrome runs in Cloudflare's Browser Rendering fleet, not in the worker isolate. The pipeline never hands the browser a user-provided URL: the worker resolves the board, mints a short-lived signed render job, and the screenshot only ever targets the internal render page with that token. **Rendering is not gated on public viewability — serving is.** A thumbnail is generated for every board, private ones included, so that an owner-facing surface has one to show; the OG image route re-applies the public gate on every request. See "Rendering every board" below for what that means for the render token. The MCP surface exposes page metadata, shape clusters — including their shape records, with rich text flattened to a plain string — and cluster screenshots: no arbitrary selectors or arbitrary URLs, and no board the authenticated caller could not already open in a browser.

## Architecture

0. The request carries an OAuth bearer token, which the worker verifies before it reads the JSON-RPC body at all. Every call needs one; there is no anonymous tier. See "Authentication on the MCP server".
1. A client calls `get_cluster_screenshot` with a board id — the `:slug` of a file (`https://www.tldraw.com/f/:slug`) or of a published board (`https://www.tldraw.com/p/:slug`) — a page (0-based ordinal or stable page id, default the first page), one or more cluster ids, and an optional theme (default light). It typically calls `get_board_info` and `get_page_info` first to discover pages and clusters; those, and `get_cluster_info`, resolve the board the same way.
2. The sync worker resolves the id **against the authenticated caller**, as a file first and as a published-board slug second, so callers never need to know which kind of board they hold. Files resolve the id directly as the `file.id` and are admitted when `hasReadAccessToFile` says so: the caller owns the file, reaches it through the group that owns it, or the file is shared via link. `sharedLinkType` (`view` vs `edit`) is irrelevant to viewing; deleted files are refused, and test-slug files are refused downstream because they require admin auth. Published boards resolve through the `file` row (`getPublishedFileInfo`) and must be published — the published slug is the whole capability there, so no user check narrows or widens it. Boards the caller cannot see fail without spending any Browser Rendering capacity, and **fail identically to boards that do not exist**, so the fallback is not an existence oracle for file ids. A file admitted this way resolves under `access: 'render'`, which is what lets the tools reach an unshared board; published boards stay `access: 'public'`. See "Rendering every board".
3. The worker resolves the requested page from the board snapshot and clusters its shapes. Clustering needs real geometry and text, which only an editor can produce, so the first call for a given page and content version measures it through a render (`measurePageShapes`) and stores the result as a **cluster index** on the file's durable object; every later call for the same content reads that instead of rendering. See "The cluster index" below. It then resolves the cluster ids against those clusters, and builds an R2 cache key from board identity, a content version, the fixed 1200x630 output size, theme, and a digest of the sorted shape ids (`mcp/{kind}/{slug}/{version}/1200x630/{theme}/shapes-{digest}.png`), with the page name in object metadata. The version is the file's `lastPublished` for published boards and the persisted room snapshot's R2 etag for shared files, so republishing or editing rotates every key. A cache hit in the `MCP_DATA_BUCKET` bucket returns without capturing again, and with the cluster index in place it returns without rendering at all — the key still cannot be built before the cluster ids are resolved, but resolving them no longer costs a render.

   **The access check in step 2 gates this read, not just the render.** These keys carry no viewer dimension, so a private board cached for its owner is a single object that anyone naming the right board id would otherwise be handed. Gating the read rather than adding a viewer to the key is also the cheaper of the two fixes: a viewer dimension would multiply the object count by distinct viewers and turn one shared render into one render per caller.

4. On a miss, the worker mints an HMAC-signed render token (`renderTokens.ts`) carrying the board identity, the resolved `pageId`, the requested shape ids, and render parameters, expiring in `THUMBNAIL_RENDER_TOKEN_TTL_MS` (60s). The measure render in step 3 mints one the same way with `mode: 'measure'`; both carry the access gate the board resolved under, and `render`-access tokens are recorded as minted — see "Rendering every board". Page enumeration is capped at `MAX_THUMBNAIL_PAGES` (40), so `pageCount` and the addressable ordinals stop there on very large boards. The snapshot route re-checks that `pageId` still exists at render time: a page deleted inside the token's window fails the render rather than returning a different page's image under the original page's name.
5. The worker calls the Browser Rendering `/screenshot` Quick Action through `env.BROWSER.quickAction`, targeting `{MCP_SCREENSHOT_RENDER_ORIGIN}/__thumbnail-render?token=...`. The render page (`apps/dotcom/client/src/pages/thumbnail-render.tsx`) exchanges the token for snapshot data at `GET /api/app/thumbnail-render/snapshot`, which verifies the signature and expiry before returning records, schema, and render params. Published boards read a frozen R2 snapshot; shared files read the live persisted room snapshot from R2 (`env.ROOMS`) and re-check their gate here, not just when the token was minted, so a board deleted during the token's window stops resolving. The page selects the requested `pageId`, fits the camera to the signed shape ids (or the whole page's content when none are signed) with margins once fonts and image assets have settled, exports with `editor.toImage`, and then displays that PNG as a full-viewport `<img>` and sets `data-thumbnail-ready` — so the screenshot captures the exact export rather than the live editor canvas. Any failure (bad token, snapshot load, export, image decode) sets `data-thumbnail-error` instead. The Quick Action waits for _either_ terminal marker and captures `body[data-thumbnail-ready="true"]`, which only exists on the success path — so a failed render returns as soon as it errors rather than holding Browser Run capacity for the whole timeout. The render and settle budgets (`THUMBNAIL_RENDER_TIMEOUT_MS` 45s, `THUMBNAIL_SETTLE_TIMEOUT_MS` 10s) live in `@tldraw/dotcom-shared` so the worker's deadline and the page's can't drift.
6. The screenshot response body is the PNG bytes. The worker writes them to the shape set's cache key in R2 (for future hits) and returns two MCP content items: a text item with the page name, followed by the image.

### OG images (queue-backed async rendering)

`GET /api/app/social-preview/:prefix/:slug/image` (`:prefix` is `p` for published boards or `f` for shared files) serves a 1200x630 light-theme, content-fit PNG for use in `og:image` tags. The crawler HTML that references it is the existing worker route `/app/social-preview/:prefix/:slug` (`getSocialPreview`, which Vercel routes crawler user-agents to), which puts the board name in the title and bounces human visitors back to the board. It only emits the board `og:image` (and `summary_large_image`) when the board resolves through the same gate the image route applies; for private, deleted, or unpublished boards it names the static site-wide preview image directly, since pointing at a board image route that has nothing to serve would only cost the crawler a redirect to reach the same file. The request path never invokes Browser Run:

The route is a **pure read** — two questions and nothing else:

1. **Is the board publicly viewable?** Resolved through the same gate as the MCP tool: published, or shared via link. Private, deleted, unpublished, or unknown boards get the default tldraw OG image (see the fallback below). This is checked on every request, which is what keeps an unshared board's image unreachable even though the image itself is never deleted.
2. **Does a thumbnail exist?** If so it is served, whatever its state, with `max-age=300` and the object's etag. That is the only thing the version affects — a mismatch is logged as `stale` and served anyway, because an old picture of the board beats the generic tldraw logo, and there is no "too stale to serve". Otherwise, the default-image fallback with `max-age=60`.

**The lifetime is chosen from the share gate, not from cost or freshness.** R2 reads are a rounding error next to rendering, and unfurl platforms cache a card their own side for days whatever we send, so neither pushes the number around. What the lifetime does decide is how long an image can be served without the gate in step 1 being consulted — and since nothing deletes a board's image when it stops being public, that gate is the only thing keeping an unshared board's thumbnail off the internet. So it is minutes rather than the hour it used to be, `stale-while-revalidate` is absent (it would extend serving a day past expiry, the same objection the default-image redirect already answers), and an `etag` with `if-none-match` support makes the resulting revalidations cheap: a cache that still holds the current bytes gets a 304, and every one of those re-runs the gate.

The route is registered with `.all`, because crawlers probe with HEAD before (or instead of) GET: a HEAD gets the same cache headers from an R2 `head` but never reads the body.

**It has no rate limiting, and it enqueues a render in exactly one case.** It used to do both generally. The general enqueue was pointless in the way that matters: unfurl platforms resolve a URL's card once and reuse it for every repost, so the crawler that triggered the render has already cached the default by the time the render lands — a viral link can be fetched once and shown thousands of times, and none of those views come back here. The render was real work whose result nobody fetched. Making the image exist _before_ the board is ever shared is the job of the publish and edit triggers below, not of the request that discovers it missing. With that gone, the per-board limit and the one-hour minimum refresh age that bounded it went too, along with `getOgImageAge`.

What remains is a **repair for published boards with no image at all** (`repairMissingPublishedImage`), and it exists because the two kinds are not symmetric in how many triggers they have. A shared file re-asks on every persist that advances its document clock, so an ask lost to a queue failure or to a pending marker left behind by an earlier one is made good by the next edit. A published board has exactly one trigger — the publish effect — and its snapshot is frozen, so nothing ever edits it into asking again: one lost ask leaves that board's card generic until somebody republishes. The repair fires only on a total miss (never on a stale image), only for `published`, and on HEAD as well as GET since some crawlers only ever probe. It does not contradict the paragraph above — it is not trying to serve the request that triggers it, it is being the thing that asks when nothing else will.

Because it is the one render ask an unauthenticated request can cause, it is bounded twice. The pending marker dedupes it while a job is alive, and a **repair cooldown** (`OG_REPAIR_COOLDOWN_MS`, 1 hour) bounds it after one dies: when a crawler-triggered job burns its whole retry budget, the give-up arms a per-board cooldown that the repair consults before enqueueing. Without it, the give-up clearing the pending marker would let the next crawl re-arm a full retry chain immediately — a published board that deterministically fails to render (a huge board that times out, say) would cost a chain of captures every ~4 minutes for as long as anything an attacker controls fetched its URL. With it, such a board costs one chain per hour. Only the crawler-reason give-up arms the cooldown, and only the repair consults it, so a publish-triggered render that fails transiently still gets one immediate repair on the next crawl, and a genuine republish renders straight away regardless. The publish trigger also _clears_ the cooldown, because an in-place republish reuses the slug: the cooldown is evidence about the snapshot that failed to render, and it must not outlive that snapshot and suppress the new one's repair. A republished board that still cannot render simply re-arms it on the next crawler give-up.

3. The queue consumer (`ogImageQueue.ts`, dispatched from the worker's `queue()` handler) re-resolves the board at render time under `access: 'render'`: a board deleted or unpublished while queued is dropped without rendering, an unshared one still renders (see "Rendering every board"), and the version is re-read so bursts of enqueues coalesce into one capture of the newest content. It loads the snapshot to pick the first page that _has content_ (so a board with an empty first page still unfurls with a meaningful image), mints a render token with `camera: 'content'` and that `pageId`, screenshots it through the same `env.BROWSER.quickAction` path as the MCP tool, and writes the PNG to the cache key the route reads. If the snapshot can't be read it fails there and then rather than paying for a capture that would fail on the render page for the same reason. Genuine transient failures retry up to three times with backoff, then drop. There is no capacity check: thumbnail rendering is uncapped (see "Request limits").

#### Default-image fallback

A board with no usable cached image is sent to the site-wide default (`/social-og.png`, 1200x630, the size the `og:image:width`/`height` meta advertises) with a **302**. The worker does not proxy those bytes: the default is a static asset on the client origin and already cached at the edge, so serving it here would put worker egress in front of every unfurl of an unrendered board. The redirect carries `cache-control: public, max-age=60` with no `s-maxage` and no `stale-while-revalidate`, so nothing pins it under a board's permanent image URL once the real render arrives. Telemetry records it as `not_rendered_yet`.

**The cost is a generic card, not a broken one.** The crawler follows the redirect and gets a valid image — the tldraw logo rather than the board — and then caches that card for days. So what matters is not how the empty case renders but how often it is reached, which is what the publish and edit triggers are for. What remains exposed is a board shared within the debounce window of its first edit, or one dormant since before this shipped.

### Keeping the thumbnail current

Nothing renders on crawler demand any more, so a board's thumbnail has to exist before its first share. Two triggers make that happen, both enqueueing onto the same queue and consumer, and both subject to the same re-resolve and version check at render time. Every queue message carries a `reason` (`publish`, `edit`) that rides through to telemetry; `crawler` survives in the union only as the fallback for messages enqueued before the field existed.

- **Publish.** `publishSnapshot` (the outbox publish effect in `utils/publishSnapshots.ts`, run by `TLFileEffectProcessor`) enqueues a render right after it writes the frozen R2 snapshot, so a published board's image is being made before its link is pasted anywhere. `unpublishSnapshot` deletes the cached image and pending marker instead — the one outbox effect that touches a thumbnail. **Unsharing has no effect of its own**: every board renders whether shared or not, and the share gate is applied at serve time, so there is nothing derived from a board's public state to tear down when it goes private.
- **On edit.** `TLFileDurableObject.persistToDatabase` schedules a render on a persist that actually advanced the document clock. The only states that skip are `legacy` and `deleted` (see "Rendering every board"); shared and private boards both render. There is no sampling and no staleness window — a persist means the board's saved content genuinely differs from what the cached thumbnail shows, which is exactly when a re-render is warranted.

  **The ask is debounced, not throttled.** Each persist pushes the render deadline out by `OG_RENDER_DEBOUNCE_MS` (60s), so a board renders once its editing _settles_ rather than on a cadence while it is still being drawn on — which is what a thumbnail is for. `OG_RENDER_MAX_WAIT_MS` (5 minutes), measured from the first persist since the last render, stops a board that is never left alone from never rendering. The arithmetic lives in `utils/ogRenderDebounce.ts` so it is testable without standing up a durable object; the object supplies the clock and the alarm.

  **The durable alarm is the deadline**, not an approximation of it. Every persist re-arms it, so the two can never disagree and an eviction loses only the in-memory copy: the alarm still fires at exactly the time the debouncer chose, and the board renders once, when it should.

  This replaced a cheaper scheme where the deadline moved in memory and the alarm was left where it was, re-arming itself on each fire. That wrote storage about once per debounce window instead of once per persist, but it meant the alarm was only a _lower bound_ on the deadline — so an evicted object woke early, rendered, and then rendered again when editing actually settled. The cost moved rather than grew: an alarm write per persist (7.5/min for a continuously edited board), against far fewer alarm **invocations**, since the alarm no longer fires mid-session purely to push itself further out. Ten minutes of unbroken editing goes from ~20 wake-ups to 2 — the two renders themselves. `ogRenderDebounce.test.ts` pins both halves.

  `pendingSince`, the max-wait anchor, is still in memory only. Losing it to an eviction restarts the five minute window, which can delay a render but never duplicate one.

- **The debounce is the rate control; the pending marker is not.** `OG_PENDING_MARKER_TTL_MS` (5 minutes) reads like a render interval but isn't one — the consumer deletes the marker as soon as a render lands, so on a healthy board it never lives out its TTL. It is a single-flight that stops a second ask being queued while one is in flight, plus a crash ceiling. The TTL is sized above a job's worst-case retry chain (three captures at the full 45s timeout plus 30s and 60s of backoff, ~3.75 minutes) so the marker cannot lapse while its job is still alive — a lapse would let a second job for the same board overlap the first and clobber its render token record. A test pins that inequality. The 45s per capture is enforced, not assumed: the quick action's navigation and settle timers are per-phase and would sum to roughly twice it, so the worker abandons a capture at the single budget (`abandonAtRenderTimeout` in thumbnailRender.ts). To change how often a board renders, change the debounce.

  **The marker drops asks rather than deferring them,** which matters because nothing upstream retries one. The debouncer resets the moment it fires and neither caller reads the enqueue result, so an ask turned away is simply gone. A capture takes seconds, so an ask landing during one hits this: without help, the board would keep a thumbnail that predates whatever prompted that ask until something happened to ask again.

  What covers it depends on the board kind, because the two kinds differ in whether anything re-asks. A **retry** needs nothing either way — every delivery re-resolves before capturing, so a later attempt picks up the newest content by itself. A **shared file's** dropped ask is deferred by construction, in two halves: a debounced fire's ask is only turned away while a job's marker is alive, which puts its persist a full debounce (60s) before the marker's clear, while the image whose write performs that clear read its snapshot at most a capture (45s) plus the write before it — so the content the ask wanted is already in the image; and a max-wait fire, the one ask the debounce doesn't bound, lands at or past the marker's TTL, because the fire that enqueued the job reset the debouncer's window and the marker's expiry is stamped from that fire's own clock reading — so the enqueue's R2 round trip cannot push the expiry past the window it opened. Tests pin both inequalities. The follow-up render that used to sit on top of this was roughly a fifth of shared-file queue captures in production (measured 2026-08-11 via the `followup` telemetry blob) and bought none of it: on a settled board it merely relocated the render the debounced ask was about to do, and on a still-moving board it rendered a mid-edit state the next debounced render superseded. A **published board** is the kind with no second ask — its snapshot is frozen and nothing edits it into asking again — so a completed render re-resolves afterwards and enqueues a follow-up if the version moved under it (`enqueueFollowUpIfBoardMoved`, `published`-only). A job that gives up permanently clears the marker rather than letting it lapse, so the next ask is acted on immediately.

  The deferral stops at that give-up, though: a job that burnt its retry budget wrote no image, so the asks its marker turned away while it was failing deferred into nothing — a board whose editing stopped during that window keeps its stale thumbnail until the next edit. A residue, not a regression: the follow-up only ever ran after a successful capture, so it never covered the give-up path either.

  Follow-ups deliberately **do not chain**: a board republished without pause would otherwise render continuously — the exact cost the debounce exists to avoid. The ceiling is one extra render per triggered render.

#### Why a debounce and not a throttle

This started as a 30s leading-and-trailing throttle. Measurement killed it. Production runs **~555 persists/min across ~359 boards active in a 10 minute window** — a mean gap between a given board's persists of roughly **39 seconds**, which is _longer_ than the 30s window. A throttle whose window is shorter than the gap between events suppresses almost nothing: its leading edge fired on nearly every persist, so render volume tracked persist volume rather than the interval it was nominally set to.

The debounce is a better fit in shape as well as cost. Cost, for a board edited without pause (verified in `utils/ogRenderDebounce.test.ts`):

| Mechanism                        | Renders per 10-minute editing session | Isolated burst |
| -------------------------------- | ------------------------------------- | -------------- |
| None                             | 76                                    | 1              |
| 30s throttle                     | ~20                                   | 1–2            |
| 1/min rate limit                 | 10                                    | 1              |
| **60s debounce + 5min max wait** | **2**                                 | **1**          |

Note the right-hand column: on a bursty board — which the 39s mean gap says is the common case — every mechanism costs the same one render. The debounce is not a saving there; it is a saving on the heavy tail of sustained editing, and it renders the _finished_ burst rather than its first stroke.

Sizing what remains: Browser Run allows 60 new browser instances per minute per account. With a debounce, spend scales with **editing sessions**, not persists and not wall-clock windows, so the quantity to forecast is distinct shared boards starting an editing session per minute. Both inputs — the link-shared fraction `f` and the session shape — now ride on `persist_success` (`blob3` and `index1`), so they are Analytics Engine questions rather than database ones. See "Open questions", and "What it costs" for what the answer is worth in dollars.

### Request limits

Thumbnail rendering has **no global cap**, deliberately. It is our own derived artifact, triggered by things that already happened (a publish, an edit persisting) rather than by anything a caller can drive, so a global rate limiter there would only ever mean "serve a stale thumbnail to save a render we intend to do anyway". The queue consumer performs no capacity check at all.

What bounds it instead is per-board: the render debounce in front of the edit trigger (`OG_RENDER_DEBOUNCE_MS`, with `OG_RENDER_MAX_WAIT_MS` as its ceiling). That is a freshness rule rather than a budget — it does not know or care what the rest of the system is spending — so total thumbnail spend scales with the number of boards being edited at once. See "Keeping the thumbnail current" for how it is sized against Browser Run's account limits, which are now the real ceiling.

Worth being explicit that **no per-board mechanism can cap total spend**, because total is `active boards × per-board rate`. Cloudflare's rate limit binding cannot close that gap either: limits are applied per Cloudflare location, so a single global key gives `limit × locations`, not `limit`. (The same caveat applies to the MCP global cap below — `MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT = 20` is really 20/min per colo. It bounds a rogue caller, which is its job, but it is not an account-wide spend ceiling.) The levers that actually bound the total are Browser Run's own account limits and raising them.

The limits below are therefore the **only** rate limiting in the pipeline, and they exist for the **MCP endpoint** specifically — the one Browser Run-spending surface an outside caller can drive directly, where a rogue or looping agent is the threat being bounded. They are applied in `sharedBoardScreenshotMcp.ts` (with the fallback budgets in `config.ts`), not in the shared render core, so a new surface built on those helpers cannot pick one up by accident:

- Per account: ~10 Browser Run-spending **calls** per minute, one budget across every such tool (`user:` on `MCP_SCREENSHOT_RATE_LIMITER`).
- Per board: ~2 Browser Run **captures** per minute (`board:` on `MCP_SERVER_BOARD_RATE_LIMITER`), applied only on cache misses.
- Global: ~20 Browser Run **sessions** per minute across all MCP callers (`MCP_SERVER_BROWSER_RATE_LIMITER`, key `global`), captures and measures alike.

The per-account budget is one bucket, and counts calls rather than captures. Both matter. It was three buckets — one per tool family — which made the real per-caller ceiling three times the single number quoted here and in every refusal message. Counting calls is what keeps it meaningful now that most calls spend nothing: with the cluster index in place the ordinary one-screenshot flow (`get_page_info`, `get_cluster_info`, `get_cluster_screenshot`) is still three calls but only two browser sessions — one measure and one capture — where it used to be four. ~10 calls a minute is therefore nearer three finished screenshots a minute in Browser Run terms and rather more than that in tool calls. Worth revisiting on the binding before the flag is widened.

Measures are counted against the **global** budget but deliberately not the per-board one. They are real Browser Run sessions and used to be counted against neither, which is what made the account-wide ceiling several times the one actually enforced. Per-board allows 2 a minute, and a cold drill-down can legitimately measure once and capture once against the same board, so counting measures there would refuse the documented path rather than an abusive one. The global check now runs only when the cluster index misses: a call served from the index creates no session, and metering it would be metering nothing.

Per-board is deliberately far tighter than per-account: no single board may absorb more than 2 captures a minute. Because captures are counted only on cache misses, this does not bound the usual "screenshot several clusters of one board" flow — a repeated capture of the same shapes is a cache hit.

That gap is only expressible because each budget has **its own binding**. A binding carries a single `limit` applied per key, so two budgets wanting different numbers cannot share one however distinct their keys are. The caller and per-board budgets shared `MCP_SCREENSHOT_RATE_LIMITER` while both were 2, which made them look separable when they were not; per-board moved to `MCP_SERVER_BOARD_RATE_LIMITER` (`namespace_id` 1013–1016) when they diverged.

The `MCP_SERVER_` prefix on two of the three is deliberate. Neither budget is about screenshots as such — they bound Browser Run spending by the MCP endpoint, and the cluster tools land on the same allowance, so a name tied to one tool is wrong the moment a second tool spends it.

**The caller budget keyed on `cf-connecting-ip` until the endpoint required authentication.** An account is the better key in both directions: a proxy pool no longer buys a caller more budget, and everyone behind one NAT no longer shares a single one. The binding keeps the name `MCP_SCREENSHOT_RATE_LIMITER` because it is deployed and counting; only the key inside it changed, which resets the buckets once and then behaves. IP-keyed limits still make sense on endpoints with no caller identity — the render page's snapshot route, and the unauthenticated discovery endpoint — and there are none there today.

Two things to know when changing any of these. The numbers live in **two places that must move together** — the constants in `config.ts` (`MCP_PER_USER_RATE_LIMIT` and friends) are only the isolate-local fallback for local dev and tests, and every deployed environment is governed by the Cloudflare binding in `wrangler.toml`, so editing one alone changes nothing where it matters. Unit tests run with no bindings at all, so they pin the fallback constants and can never catch a wrong or shared binding; `wrangler.toml` is the only place to check that. And `period` in those bindings [must be either 10 or 60 seconds](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) — that restriction is on the window, not on `limit`, which is an unconstrained integer. All of these use `period = 60`.

Only the calls that _can_ spend Browser Run are limited. `get_board_info` is not: it resolves a board and reads its snapshot, which is the same work the ordinary board routes already do for that caller, and it never clusters. The clustering tools are limited even though they read as "info" calls, and even though the cluster index means most of them spend nothing — the per-account budget is a ceiling on calls, and whether any given one turns into a render is not something the caller controls. The OG image route's per-board limit (`og-board:`) is gone too, along with the route's enqueue — see "OG images (queue-backed async rendering)" above.

The Cloudflare rate limit bindings are declared in `wrangler.toml` for every environment. When a binding is absent (local dev, tests) the route falls back to an isolate-local guard with the same limits. Changing the global cap means moving the `MCP_SERVER_BROWSER_RATE_LIMITER` bindings in `wrangler.toml` (one per environment) and the isolate-local fallback constant `MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT` in `config.ts` together.

The thing to watch instead of a cap is Browser Rendering's own account limits: a render can hold a session for the full 45s `THUMBNAIL_RENDER_TIMEOUT_MS`, so sustained edit volume is bounded in practice by concurrent-session and new-session-per-minute limits rather than by anything in this worker. Browser Rendering bills by browser duration, so thumbnail spend now scales with editing activity. `fetch-screenshot-metrics.ts` (below) is how that gets watched.

### What it costs

Quick Actions bill [**duration only**](https://developers.cloudflare.com/browser-run/pricing/) — $0.09 per browser hour beyond the 10 hours a month Workers Paid includes. The per-concurrent-browser charge applies to Browser Sessions, which this pipeline does not use, so concurrency is a limit here rather than a line item. A capture that fails on a `waitForTimeout` is not charged at all, which means telemetry's wall-clock `double3` is an upper bound on the bill rather than the bill.

**What it costs today, measured.** The Browser Run dashboard (Compute > Browser Run) for July 2026: **15.22 browser hours across 8.75k Quick Action requests**, all of them `Screenshot` against `www.tldraw.com/__thumbnail-render`, no Browser Sessions at all. Volume was near zero until about July 20 and has run at **~1,000 captures and 1.6–2.6 browser hours a day** since — call it **0.7 renders/min**, against a **$0.47** bill for the month and a **$4–6/month** run rate if that holds. This is the pre-branch pipeline: the edit trigger is not deployed, so what is being measured is publish- and crawler-driven rendering only.

**Those hours are all thumbnails.** Browser Run reports one account-wide figure that both surfaces land in, but the buckets separate them: `dotcom-mcp-data-preview` holds **0 objects**, and the production `dotcom-mcp-data` bucket does not exist yet. Since every MCP capture writes exactly one object and its key carries the board's content version, an empty bucket is an unused surface — so the whole 8.75k is the OG pipeline, and the MCP tool's share of the bill is currently zero. That also makes the object count the standing way to split the two later: MCP captures over the last 30 days are just the object count in that bucket, since the lifecycle rule expires them on exactly that schedule.

The useful number that falls out of it is the **mean capture: 6.3 seconds** (15.22h / 8.75k). That is what the forecast below is priced at, rather than an assumption, and it is worth re-deriving the same way whenever these figures move — two dashboard numbers divided by each other.

At that 6.3 seconds, one render is **~$0.00016 of browser time** and **~$0.000018 of everything else**: three R2 class A writes (the pending marker, the render token record, the PNG — deletes are free), roughly seven class B reads across resolve, cache check, snapshot load and token check, three queue operations, and a couple of worker requests. So ~$160 per million renders against ~$18 for the machinery around them, and the only quantity worth forecasting is the render count.

**Renders scale with editing sessions, and the session shape is now measured.** [PR 9708](https://github.com/tldraw/tldraw/pull/9708) put `index1` (the durable object id) on every file DO event in production, which is exactly what open question 2 needs: `persist_success` rows carry a per-board key, so a board's persists can be bucketed by time and the runs between them counted. Replaying the debounce's own rules over a 30 minute production window (`blob1 = 'persist_success'`, `blob2 = 'production-tldraw-multiplayer'`, grouping by `index1`, splitting a board's persists wherever the gap exceeds `OG_RENDER_DEBOUNCE_MS`, and adding one render per `OG_RENDER_MAX_WAIT_MS` a run survives):

| Quantity                                    | Measured                                  |
| ------------------------------------------- | ----------------------------------------- |
| Boards persisting in the window             | 553                                       |
| Persists                                    | 521/min (independently confirms the ~555) |
| Editing time                                | 69.5 board-minutes per minute             |
| **Renders — sessions settling**             | **34–51/min**                             |
| **Renders — `OG_RENDER_MAX_WAIT_MS` fires** | **0.3–4/min**                             |
| **Total**                                   | **~37–51/min, ~54,000–74,000/day**        |
| Browser hours/month                         | 2,800–3,900                               |
| **Browser Run $/month**                     | **$250–350**                              |

The range is sampling, not uncertainty about the mechanism: Analytics Engine thins high-volume indexes, and a thinned timeline splits runs that were really continuous, so the raw count is an upper bound. The low end divides each board's gaps by its own `_sample_interval` before applying the 30 second rule. Both ends assume nothing — they are the branch's constants applied to production timings. **Call it $250–350/month and plan against ~$300.**

Two things fall out of the measurement that the model got wrong:

- **Renders per persist is 0.07–0.10.** The debounce suppresses about 90% of persists, which is the claim in "Why a debounce and not a throttle", now with a number on it.
- **Editing is far more fragmented than assumed.** The median session spans **8–12 seconds** and the p90 spans 86–216 seconds; in a 10 minute window, 105 of 251 persisting boards persisted exactly once. Sessions are short bursts, not the multi-minute stretches the estimate assumed, which is why the render count is close to one per board-editing-visit.

One caveat on the figure: `persist_success` on `main` carries no `sharedState`, so these counts include `legacy` and `deleted` rooms that the trigger skips. The measurement is an over-count by that fraction, and this branch's `blob3` is what nets it out.

#### The two constants only work as a pair

The same replay run over six hours (3,507 boards) against a grid of both constants, in renders/min and Browser Run $/month:

| Debounce ↓ / max wait → | 5 min           | 10 min      | 15 min      | off         |
| ----------------------- | --------------- | ----------- | ----------- | ----------- |
| 30s                     | 35.7 · $240     | 32.1 · $216 | 31.3 · $211 | 30.5 · $205 |
| **60s (current)**       | **32.3 · $218** | 26.7 · $180 | 25.1 · $169 | 23.3 · $157 |
| 120s                    | 32.0 · $215     | 24.4 · $164 | 22.0 · $148 | 19.0 · $128 |

Read along the first column: at a 5 minute max wait, quadrupling the debounce from 30s to 120s saves almost nothing (35.7 → 32.0). The reason is mechanical — merging two bursts into one longer session pushes that session past `OG_RENDER_MAX_WAIT_MS`, so a settle render is traded for a max-wait render, and `OG_RENDER_MAX_WAIT_MS` puts a floor under what the debounce alone can achieve. The savings live on the diagonal: 60s with a 10 minute max wait is ~25% fewer renders, 120s with 15 minutes is ~38% fewer.

The debounce is at 60s and the max wait stays at 5 minutes, which buys roughly 10%. That is a deliberate choice rather than the cheapest point on the grid: a board edited without pause keeps a five minute old thumbnail rather than a ten minute old one, and the cheaper cells are available whenever spend matters more than that.

**Raising the account limit is still worth doing, and the grid is why.** Browser Run allows 60 new browsers/min. The mean is ~32 renders/min at the current constants, but the limit applies per minute and the distribution has a tail: p99 is ~47/min and the busiest minute observed reached 71–75/min — most likely a wave of rooms persisting together after a deploy or an eviction, which is exactly the shape that breaches a per-minute limit. `enqueueFollowUpIfBoardMoved` no longer adds to it: follow-ups are `published`-only, and publish renders are a rounding error next to the edit volume. So the debounce change moves the mean but barely touches the peak, and the peak is what the limit sees. Past the limit the spend stops growing and the failure rate starts — a rejected render retries three times holding its pending marker, so overload amplifies rather than backs off. **Ask for the increase before the deploy**, and watch renders/min against 60 from the first hour.

**Render page egress is plausibly larger than the browser time, and is not Cloudflare's.** Every capture is a cold browser loading `/__thumbnail-render` from the client origin: the lazy route chunk, the editor bundle, fonts, and whatever image assets the board contains. At a nominal 2 MB transferred that is ~2 TB and a few hundred dollars per million renders — so at the measured ~60,000 renders/day it is ~3.6 TB and **~$540 a month, more than the browser time itself**, and on a different bill. The transferred size of one render is worth measuring before trusting the magnitude, and it is the one cost that can be cut without touching thumbnail freshness.

Two smaller lines, both fixed rather than per-render:

- **~$24/month of durable object alarm writes.** `scheduleOgRender` calls `setAlarm` on every persist and [each `setAlarm` is one row written](https://developers.cloudflare.com/durable-objects/platform/pricing/#sqlite-storage-backend) — ~24M rows/month at $1.00/M. This is the cost the alarm-is-the-deadline design deliberately took on, and it is paid whether or not a render results. See "Keeping the thumbnail current" for what it buys.
- **R2 storage is a rounding error.** The `og/…` keys carry no version, so it is one object per board: the production `thumbnails` bucket currently holds **4.71k objects in 404 MB** (~86 KB a thumbnail, plus the zero-byte markers and token records), which is well under a cent a month. Growth is bounded by board count rather than by render volume, so rendering every board on every edit does not move this line. The `mcp/…` keys do accumulate, which is what their expiration rule is for.

The MCP surface prices separately, since it is driven by callers rather than by editing: at the full `MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT` of 20 captures/min it is ~$135/month, and because Cloudflare rate limits apply per location that is per colo. It bounds a rogue agent, which is its job; it does not bound spend.

If this needs to come down, in order of leverage: shrink what the render page loads, which is the largest line and costs no freshness at all; then raise `OG_RENDER_MAX_WAIT_MS` alongside the debounce, since the grid above says neither constant does much alone; then cap the render rate outright with the dedicated queue described in "Follow-up work". Prioritising by `sharedState` — a longer debounce for private boards than for shared ones — is the option that goes below the floor of one render per board-editing-visit without capping anything, and the durable object already knows which is which at trigger time.

### Telemetry and monitoring

Telemetry is two events in the `MEASURE` dataset, split by concern: the cache is a request-level question and Browser Run spend is a session-level one, and one request can hold zero, one, or two browser sessions (a cluster screenshot on a cache miss measures _and_ captures), so no single row can answer both cleanly.

**`mcp_shared_board_screenshot` — one row per request or queue delivery.** All three surfaces write it with the same blob layout, so one dashboard covers everything; the source blob distinguishes `mcp` (the tool), `og` (the OG image route), and `queue` (the async consumer). Rows record cache status, failure reason, rate-limit decisions, a hashed caller, and the trigger that asked for the render. Cache status is `hit`/`stale`/`miss` when the PNG cache was consulted and `none` when it was not — every info-tool row (those tools have no cache), and screenshot requests refused before the cache read (bad input, rate-limited caller, unresolvable board). A hit-rate-by-source panel should exclude `cache:none`; that is what keeps it reading cache health rather than refusal volume, and what keeps the MCP number comparable to the OG one. Rows carry **no board identity at all** — no index, no slug, no hash, no derived id (see below). Two dimensions are deliberately kept low-cardinality: the failure reason is always a bounded reason code (`invalid_input`, `not_found`, `board_empty`, `page_not_found`, `cluster_not_found`, `shape_not_found`, `rate_limited_user`/`board`/`global`, `board_not_viewable`, `not_rendered_yet`, `snapshot_read_error`, `board_lookup_error`, `browser_failed`, `browser_timeout`, `empty_render`, `not_configured`, `render_error`), never raw `error.message` text; and the hashed caller is written only on **rate-limited** rows — every other row carries `caller:none`. That is deliberately narrower than "any failure": cardinality is about distinct values rather than row count, and most failures are routine model mistakes (a wrong board id, a stale cluster id, a page that moved) that nearly every caller makes eventually, so gating on failure would let the distinct-caller count converge on the number of users. Rate limits fire rarely and only for callers worth naming, which is the question the blob exists to answer. The caller is a hashed **user id** on the MCP surface, which requires authentication; it was a hashed client IP before that, and holds the same blob position so the dashboard panels reading it did not move. The OG surfaces have no caller and always write `none`. Column layout: `blob1` event name, `blob2` worker name, `blob3` source, `blob4` cache status, `blob5` failure reason, `blob6` rate-limit decision, `blob7` hashed caller (or `none`), `blob8` render trigger (`crawler`, `publish`, `edit`, or `none` on the surfaces that have no trigger), `blob9` follow-up state (`true` for the delivery a completed render enqueues because a `published` board — the only kind that follows up — moved during its capture, `false` for a trigger-requested queue delivery, `none` on the surfaces that have no follow-up concept), `blob10` cluster index status (`hit`/`miss` on the three clustering tools, `none` everywhere else — its own dimension rather than folded into `blob4`, because the two caches save different things and one blob mixing them would make either hit rate unreadable), `double1`/`double2` output width/height, `double3` and `double4` always -1 (durations moved to the session event; the sentinels hold these positions so historical rows — which carried capture durations in `double3` — and the panels reading later positions keep their meaning), `double5` rate-limit allowed (1/0), and no `index1`.

**`browser_run_session` — one row per browser session actually created**, written at the render choke point rather than by each surface, so a session cannot exist without landing on this ledger. `count()` is the number of sessions; `sum(double3)` is the spend. Column layout: `blob1` event name, `blob2` worker name, `blob3` source (`mcp` or `queue`; the OG route never creates sessions), `blob4` mode (`measure` for the clustering tools' geometry render, `screenshot` for a capture), `blob5` outcome (`ok`, or the session-level failure codes `browser_failed`, `browser_timeout`, `empty_render` — a session that died still spent its duration), `blob6` render trigger (as above), `double1`/`double2` viewport width/height, `double3` the session's wall-clock ms. No caller and no board identity, deliberately: abuse analysis lives on the request event, and the no-board-identity rule below applies here too. (The `quickAction` screenshot response includes an `X-Browser-Ms-Used` header, but the worker does not currently read it — wall-clock in `double3` is the spend proxy. Wiring the billed number in is a possible follow-up.)

One event outside that dataset matters for sizing: `persist_success` (same `MEASURE` dataset, written by `TLFileDurableObject.logEvent`). It fires on exactly the event that triggers a thumbnail render, so it carries what sizing that render needs: `index1` the **durable object id**, `blob3` the board's `sharedState` (`shared`, `private`, `unknown` for an app file whose record hasn't loaded, `legacy` for a non-app room, `deleted` for a deleted file), and `double1` the retry attempt count. It is written by `getBoardRenderState`, the same method that gates the render, so a board the trigger skips can never be counted as one it renders.

The index is stamped centrally in `writeEvent` for every file DO event, not per call site. Analytics Engine samples by index, so a board that persists rarely keeps data points instead of being sampled away inside the volume of a busy one, and since it has no `uniq()`/`count(distinct)`, distinct boards means `GROUP BY index1` and counting the returned rows.

It is the durable object id rather than the board slug on purpose: `idFromName` is one-way, and for an app file the slug _is_ the authority of `tldraw.com/f/<id>`, so writing it to an account-readable dataset exported to Grafana would put working capabilities in telemetry. Resolving in the useful direction still works from a slug you already hold, via `env.TLDR_DOC.idFromName('/r/' + slug)`.

Only `persist_success` carries that index. The screenshot events deliberately carry none (see "No board identifier leaves this pipeline"), so the two datasets cannot be joined and renders-per-persist is two aggregate counts divided by each other rather than a per-board number.

The one-way-ness is also why `sharedState` has to be recorded at write time rather than recovered later: the dataset cannot be joined back to a file row. Postgres could not answer it anyway — it knows which files are shared, not which are being edited. See "Open questions".

Bounded reason codes say _that_ a board stopped rendering, never _why_, and every one of these surfaces deliberately swallows its own errors (the OG route falls back to the default image, the snapshot route 404s, the MCP tools return a tool error, the queue retries or drops). So each swallow point also reports the underlying error to Sentry through `reportThumbnailError` (`thumbnailShared.ts`), tagged `thumbnail_surface` with a closed set of values: `og_route`, `og_queue`, `thumbnail_snapshot`, `mcp_board_info`, `mcp_screenshot`, `mcp_screenshot_cache_write`, `mcp_cluster_index_read`, `mcp_cluster_index_write`. The last three are never caller-visible failures — the tool answered — but each means a cache stopped absorbing what it exists to absorb, so the tools are back to spending Browser Run on every call. Reporting rides on the handler's `waitUntil` and is itself failure-proof — a missing Sentry env var must never turn a degraded-but-fine response into a 500.

#### No board identifier leaves this pipeline

**No board identity is written anywhere** — not to telemetry, not to a log line, not to a Sentry event. Not the slug, not a hash of it, not a derived durable object id. For a link-shared file the slug _is_ the file id, and `tldraw.com/f/<id>` is the capability to view a board somebody chose to share by link rather than publish; a one-way derivation avoids handing that out, but it is still a per-board dimension in an account-readable dataset, so the simplest guarantee is to record none.

Three routes out, and the third was the sharp one:

- **Telemetry** writes no `index1`. It briefly carried the board's durable object id so renders could be joined to the `persist_success` events that caused them; that join is gone deliberately, and with it the ability to say which board is failing from the dataset alone. These datapoints answer aggregate spend and failure-rate questions.
- **Sentry extras** carried raw `slug`/`boardId` at six call sites, then briefly a derived id. They now carry neither — only `kind`, `prefix`, `page`, `theme`, `attempts` and the like.
- **The request object** is no longer handed to `createSentry` at all. It passes one straight to Toucan with `allowedSearchParams: /(.*)/`, which records the full URL and every query parameter — and on these routes the URL is the sensitive part. `/app/social-preview/f/<id>/image` carries a link-shared file's id in its path, and `/api/app/thumbnail-render/snapshot?token=…` carries a signed render token, which is a live capability to read that board's entire snapshot until it expires. `reportThumbnailError` now takes only the method and user agent from the request; the `thumbnail_surface` tag already says which endpoint it was.

`TLFileDurableObject`'s render log had the same issue and now logs only the enqueue result — no slug and no derived id.

#### Reading a Browser Run failure

`422 Unprocessable Entity` is the status to expect from a failed capture, and on its own it says almost nothing. Cloudflare answers 422 for [every "the page did not cooperate" outcome](https://developers.cloudflare.com/browser-run/faq/): a page that crashed, a render that exhausted the container's memory, and any of the [Quick Action timers](https://developers.cloudflare.com/browser-run/reference/timeouts/) expiring. Our own render page marking `data-thumbnail-error` arrives as one too, because the capture selector (`body[data-thumbnail-ready="true"]`) exists only on the success path — that is the design working, and it is indistinguishable by status from the cases that aren't.

What separates them is the response body, so `runRenderSession` reads it and throws a `BrowserRenderError` carrying the status, Cloudflare's own message (its `errors[].message`, truncated), the wall-clock duration, and the timeout budget. Two things follow:

- **`classifyScreenshotFailure` splits 422 into `browser_timeout` and `browser_failed`** from that body, falling back to "did the call spend essentially the whole budget" when the body names no timer. It used to classify on `error.message` alone, which for a Browser Run failure never contains the word "timeout" — so every timeout was filed as `browser_failed` and the dashboard's timeout rate was structurally always zero.
- **The specifics reach Sentry as event context, not as the message.** Sentry groups on the message, so it stays exactly `Browser Rendering screenshot failed (<status>)` and the varying parts ride on `browser_render_status`, `browser_render_detail`, `browser_render_duration_ms`, `browser_render_timeout_ms`, and `browser_render_reason`. Putting the detail in the message would shatter one recurring issue into a stream of new ones.

The queue consumer reports **once per job, on the delivery that gives up**, rather than once per delivery. A board that fails deterministically fails all `OG_MAX_RENDER_ATTEMPTS` times, so per-delivery reporting filed three events for one problem. A failure that recovers on retry now reports nothing, which is correct — the render landed.

Telemetry goes the other way on purpose: **one datapoint per delivery, and a failed capture records its duration in `double3` like a successful one.** The split is that telemetry counts spend and Sentry counts problems — three deliveries are three lots of Browser Run and one problem. This used to write nothing at all on the retried deliveries and `-1` for the duration on the final one, so a failing board's spend was invisible on a path that has no cap and is watched only by this dataset. A delivery that bails before the capture (an unreadable or empty snapshot) still records `-1`, because it genuinely spent nothing.

If timeouts turn out to dominate, the knob Cloudflare points at is `actionTimeout` (default none, max 5 minutes), which bounds the capture itself rather than the page load; it is not currently set in `getThumbnailScreenshotRequestBody`.

`internal/scripts/fetch-screenshot-metrics.ts` queries the Analytics Engine SQL API and reports request volume, failure rate, timeout rate, cache hit rate, rate-limit blocks, and Browser Run render time per source (wall-clock `double3`, summed over rows that actually rendered — `double4` billed ms is not currently recorded, always -1):

```bash
CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_ANALYTICS_API_TOKEN=... \
npx tsx internal/scripts/fetch-screenshot-metrics.ts --last 24h --worker main-tldraw-multiplayer
```

For alerting, run it with `--check` on a schedule (cron CI job or any monitor that can run a command); it exits non-zero when a threshold is breached:

```bash
npx tsx internal/scripts/fetch-screenshot-metrics.ts --last 1h --check \
  --max-failure-rate 0.2 --max-timeout-rate 0.1 --max-render-minutes 60
```

The API token only needs the "Account Analytics: Read" permission. Ad-hoc dashboard queries can use the same SQL API, e.g. failure breakdown over the last day:

```sql
SELECT blob3 AS source, blob5 AS failure, SUM(_sample_interval) AS requests
FROM MEASURE
WHERE blob1 = 'mcp_shared_board_screenshot' AND timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY source, failure
ORDER BY requests DESC
```

## Configuration

The sync worker needs:

- `BROWSER` binding - the Cloudflare Browser Rendering binding, declared per environment in `wrangler.toml` (`[env.<env>.browser]`). The worker calls its `quickAction` Quick Actions method (`env.BROWSER.quickAction('screenshot', …)`) directly — no `@cloudflare/puppeteer`, no API token. This requires `compatibility_date` `2026-03-24` or later, which the deployed envs use; `[env.dev]` pins an older date the local workerd supports (see Local development). The dev binding is deliberately not `remote`, so plain `wrangler dev` (and the credential-free e2e stack) boots without a `CLOUDFLARE_API_TOKEN`; the binding is then a non-functional local one. Local dev therefore never reaches this binding at all — it renders through `LOCAL_SCREENSHOT_SERVICE_URL` instead (see Local development).
- `LOCAL_SCREENSHOT_SERVICE_URL` - development only. An HTTP screenshot service to use instead of the `BROWSER` binding, set in `[env.dev.vars]` to the client dev server's `/__screenshot` endpoint. Deployed environments leave it unset, which is what keeps them on Browser Run: the renderer is chosen by whether this var is set, not by an environment name, so an environment can only take the local path by configuring one.
- `MCP_SCREENSHOT_ENABLED` - kill switch for the MCP server (`POST /app/mcp`), set to `"true"` in `wrangler.toml` for dev, staging, and production. The worker reads it per request, so setting it to anything else takes the endpoint down (it 404s everything, including `server/discover` and the legacy `initialize` handshake) without a rebuild or a code deploy — flip it in the Cloudflare dashboard under the worker's variables, and it applies to the next request. The next deploy overwrites the dashboard value from `wrangler.toml`, so follow an emergency flip with a config change. An unset var counts as enabled, so preview deploys (which don't set it) behave as they always have. Only the MCP server is gated: OG image rendering has its own path and keeps running.
- `MCP_SCREENSHOT_TOKEN_SECRET` (deploy var, GitHub secret) - HMAC secret for render tokens. Local dev uses the placeholder in `[env.dev.vars]`.
- `MCP_SCREENSHOT_RENDER_ORIGIN` - set in `wrangler.toml` for dev (`http://localhost:3000`), staging, and production. Preview deploys have no `wrangler.toml` entry, so `deploy-dotcom.ts` injects the preview's own client origin (`https://${previewId}-preview-deploy.tldraw.com`) as a deploy var.
- `MCP_SERVER_URL` - the MCP server's public URL: the resource identifier advertised in protected resource metadata and pointed at by the `WWW-Authenticate` challenge. **Not** compared against an incoming token — Clerk stamps no `aud`, so there is no audience binding to check; see "Authentication on the MCP server" for what stands in for one. Set in `wrangler.toml` for dev, staging, and production; previews have no entry, so `deploy-dotcom.ts` injects `https://${previewId}-preview-deploy.tldraw.com/api/app/mcp` as a deploy var. Left unset it would be derived from the request's own `Host` header, which is acceptable for local dev and tests only — see `getMcpResourceUrl`.
- `THUMBNAILS` R2 bucket binding - board thumbnails / OG images (`og/…` keys) and their pending markers. `thumbnails-preview` in dev/preview/staging, `thumbnails` in production.
- `MCP_DATA_BUCKET` binding - R2 bucket for MCP tool output; today that is screenshots (`mcp/…` keys). `dotcom-mcp-data-preview` in dev/preview/staging, `dotcom-mcp-data` in production.

### Why two buckets

Both key spaces used to live in `thumbnails`, separated only by prefix. They are now separate buckets for two reasons:

- **Domain.** `MCP_DATA_BUCKET` is where the MCP surface puts what it produces, and that won't stay limited to board thumbnails. Keying the bucket to the tool rather than to the artifact means the next MCP output type lands somewhere that already fits, instead of accreting inside a bucket named for something it isn't.
- **Retention.** The two caches want opposite lifetimes:
  - **`og/…`** keys (`og/{kind}/{slug}/{theme}.png`) carry no version, so each render overwrites the same object in place and a board costs exactly one object for as long as it exists. Nothing accumulates and nothing deletes one, and the current thumbnail must outlive any lifecycle window — so `THUMBNAILS` gets **no expiration rule**.

    That is also why the key holds nothing but the board and the theme — in particular **not the output dimensions**. This key is the image's sole address, so anything in the path that can change re-addresses every board's image at once and strands the old objects permanently, since there is no lifecycle rule to sweep them. A size change is a replacement rather than a second object, so it belongs in the object's metadata, which overwrites in place. The trade is that a size change serves old-sized images as fresh hits until each board next renders, because the stored `version` tracks board content, not render parameters.

  - **`mcp/…`** keys include the board's content version (`mcp/{kind}/{slug}/{version}/{w}x{h}/{theme}/page-{n}.png`), so every edit strands the previous object and the set grows without bound. A pure regenerable cache, so `MCP_DATA_BUCKET` gets an **expiration rule**.

A prefix-scoped lifecycle rule on a single bucket would also work (`wrangler r2 bucket lifecycle add` takes a prefix positionally), and has the nice property of ageing out the existing backlog in place. It was rejected because a future rule added without a prefix, or with a typo'd one, would silently delete every board's live thumbnail, and R2 expiration has no undo. Separate buckets make that mistake impossible.

#### Nothing deletes a rendered image

Whether an image is deleted when a board stops being publicly viewable depends on which key it is, and the two are **not symmetric**:

- **`og/shared_file/{fileId}/…` is kept.** Its key is the file id, which never changes, so it stays useful for as long as the board exists — an owner-facing surface behind auth wants it, and switching the link back on makes it an immediate cache hit rather than a cold render. Unsharing clears only the pending marker.
- **`og/published/{publishedSlug}/…` is deleted on unpublish.** It depicts a published _snapshot_, and unpublishing destroys the thing it was a picture of. Its key is the published slug rather than the file, so leaving it would strand an object that a regenerated publish link could make permanently unreadable — nothing would ever read or overwrite it again. `deleteOgImage` is scoped by the board passed in, so unpublishing cannot touch the same board's file-keyed image.

The queue consumer applies the same rule when it drops a job for a board that no longer resolves.

The argument for keeping the file-keyed half: an unshared board's thumbnail does depict content that is no longer public, but the image is not public because it exists — it is public because a route serves it, and the only route that does re-checks the share gate on every request (`resolveThumbnailBoard` in `getOgImage`). An unshared board's image is already unreachable while it sits in R2.

Keeping it means an owner-facing surface behind authz — a workspace or project view showing every board's thumbnail — can use the image a board already has, instead of it having been thrown away the moment the board went private. The `og/…` keys carry no version, so retaining them costs one object per board and does not accumulate.

`deleteOgImageCache` is therefore now `clearOgImagePendingMarker`, which drops only the `.pending` marker. That part is still load-bearing: a marker left behind would dedupe away the next legitimate enqueue after a reshare, or after the render that failed.

**Hard deletion is where both halves go.** `TLFileDurableObject.appFileRecordDidDelete` — the same cleanup that removes the room snapshot, the edit history and the published history — deletes the file-keyed image, the published-slug image, the pending and repair-cooldown markers, and every render token record under both boards' prefixes (listed rather than addressed directly, since the keys are per surface and, for MCP, per page and theme). Neither reason for keeping an image survives here: there is no board left to reshare, and no snapshot left to depict. It matters more than tidiness reads, because these keys carry no version, so each board owns exactly one object in a bucket that has **no lifecycle rule and must never get one** — an image left behind by a deleted board is an object nothing will ever read, overwrite, or sweep. MCP screenshots need no equivalent: their keys carry a content version and their bucket expires them.

### Rendering every board

Thumbnails are generated for **every** board, not only publicly viewable ones, so an owner-facing surface (a workspace or project view, behind auth) always has a current image to show. Sharing is a condition of _serving_, not of _rendering_.

That is expressed as an explicit access level, `ThumbnailBoardAccess`, required at every call site of `resolveThumbnailBoard` and `loadBoardSnapshot` rather than defaulted — a default would be wrong for half of them, and silence is the wrong way to choose a gate:

- **`access: 'public'`** — every anonymous-facing surface: the OG image route, the crawler HTML (`getSocialPreview`), and both MCP tools when the board is a published one. A published board must be published; a shared file must currently be shared via link (`isFileAnonymouslyViewable`). This is the only thing keeping a private board's thumbnail off the public internet, and it is re-applied per request rather than inferred from what is in R2 — necessarily, since nothing deletes an image when a board stops being public.
- **`access: 'render'`** — the queue consumer, the render page's snapshot route, and the MCP tools once `hasReadAccessToFile` has admitted the caller for that file. Requires only that the board exists, is not deleted, is not a test file (`isFileRenderable`), and has persisted content.

  On the MCP path the per-user check is what stands in front of `render`, and it runs in the worker before the token is minted rather than at snapshot-read time. The snapshot route re-checks renderability but not the user, because the job carries no `userId` — so a caller who loses access to a board mid-capture still completes it. The exposure is bounded by the 60s token TTL and by the record below; signing a `userId` into the job and re-checking it on read would close it, at the cost of a database round trip on the render path.

Three gates moved together, and all three had to: the durable object's edit trigger (which skipped anything not `shared`/`unknown`), the consumer's `resolveThumbnailBoard`, and `getThumbnailSnapshot`'s read. Relaxing fewer would have produced enqueues that were dropped downstream, or captures whose render page 404'd.

The durable object now skips only two states, and neither is about privacy: `legacy` (not an app file, so no board identity to render) and `deleted` (nothing worth depicting). `shared`, `private` and `unknown` all render.

**What this costs.** `GET /api/app/thumbnail-render/snapshot` previously refused anything not publicly viewable, so a leaked or forged render token exposed nothing that was not already public. It now serves a **private** board's full document — every shape. That makes the token load-bearing in a way it was not before, so two things guard it.

`THUMBNAIL_RENDER_TOKEN_TTL_MS` is **60 seconds**, down from five minutes. Sized against what the token is actually for: the render page fetches the snapshot in its loader, seconds after navigation, and nothing touches the token afterwards — settle, `toImage` and capture all run without it. So the window has to cover browser start plus navigation plus bundle load, not the whole render. The thing that would break a short TTL is not a slow render but Browser Run _queueing_ before the browser starts (new instances are limited to 1/second); at current volume that is three orders of magnitude away.

**A signature alone is no longer sufficient.** Every mint also records the token's hash in R2, and the route requires the record to be present (`recordMintedRenderToken` / `isMintedRenderToken`). A leaked `MCP_SCREENSHOT_TOKEN_SECRET` therefore stops being catastrophic: an attacker can forge signatures for any board, but without write access to our bucket the forgeries have no record and are refused before the board is read. The secret becomes one of two required factors rather than the sole authority over every private board's contents.

Three details of that worth knowing:

- **Only `render` jobs are recorded.** The access level rides inside the signed token: the MCP tool mints `public` for a published board and `render` for a file its caller may see, and the OG pipeline always mints `render`. A `public` job renders a board anyone could already fetch, so a forged token for one grants nothing and a record would buy no security.
- **Keyed per capture**, so records overwrite in place and the space stays bounded by content rather than by traffic. Nothing accumulates, so there is no lifecycle rule to add, and none must ever be added to this bucket.

  What counts as one capture differs by surface, because their concurrency does. The OG pipeline is single-flighted per board by the `.pending` marker, so its renders never overlap and one key per board is right (`render-tokens/{kind}/{slug}/og`) — a board's newest mint invalidating an older in-flight token is then intended, a fresher render superseding one already running.

  The MCP tool has no pending marker, and its per-board limiter deliberately allows two cache-missing captures a minute, so **two captures of one board would share a per-board key and invalidate each other** — as would an edit-triggered render landing during a capture. The loser fails its snapshot fetch with a 403, which surfaces as a generic `browser_failed`, indistinguishable from a real browser crash. So an MCP screenshot is keyed by what it draws: `render-tokens/{kind}/{slug}/mcp/screenshot/{theme}/{pageId}/{shapeSetDigest}`.

  A **measure** render has no content to key on — it exports nothing, and every measure of a page mints an identical job down to the hardcoded light theme — so it is keyed by its own token instead (`…/mcp/measure/{tokenHash}`). It has to be: the clustering tools all measure before they can do anything, so any two of `get_page_info`, `get_cluster_info` and `get_cluster_screenshot` running against one page would otherwise collide, which is the ordinary agent pattern rather than a rare race. A per-token key is the one thing here that would accumulate, so the measure deletes its own record when it finishes (`deleteMintedRenderToken`).

  Two residuals worth knowing. The _same_ MCP capture asked for twice at once still collides, and the later mint wins — the OG case again, one image rendered twice, costing a retry rather than a wrong result. And a token minted before the `surface` field existed is read as `og` and falls back to the old un-namespaced key, which is what keeps renders in flight across that deploy from 403ing on a record that was never going to be there.

- **Records are not deleted after a capture.** Expiry lives in the signed `exp` and is checked before the record is ever consulted, so a leftover record cannot extend a token's life. Deleting would tighten the window from `exp` to the render's duration — worth nothing against an attacker who cannot get a record written at all, and it would cost a `finally` and a third state to reason about.
- **A hash, in `customMetadata`.** The bucket never holds a usable credential, and checking one is a `head` rather than a `get`.

When `THUMBNAILS` is unbound (local dev, tests) the check is skipped, which degrades to signature-only verification — the level this replaces, not a hole beneath it. Every deployed environment binds it.

Still worth doing when the authenticated retrieval endpoint lands: serving the render page as inline `html` with the records embedded would remove this public route altogether.

Cost in Browser Run terms is not the constraint. The sizing here assumed ~30% of edited boards are link-shared, so rendering all of them is roughly 3.3x the previous volume — about 3 renders/min against measured production traffic of ~1/min and an account limit of 60/min.

### One-time ops setup

Before the first deploy of this feature:

1. Create the R2 buckets:

   ```bash
   wrangler r2 bucket create thumbnails-preview
   wrangler r2 bucket create thumbnails
   wrangler r2 bucket create dotcom-mcp-data-preview
   wrangler r2 bucket create dotcom-mcp-data
   ```

2. Add the expiration rule to the MCP data buckets only (30 days is a starting point — these are a regenerable cache, so the only cost of expiring one is a re-render the next time an agent asks for that exact board version):

   ```bash
   wrangler r2 bucket lifecycle add dotcom-mcp-data-preview expire-screenshots --expire-days 30 -y
   wrangler r2 bucket lifecycle add dotcom-mcp-data expire-screenshots --expire-days 30 -y
   ```

   Verify with `wrangler r2 bucket lifecycle list dotcom-mcp-data`. Do **not** add an equivalent rule to `thumbnails`.

3. Enable Browser Rendering on the Cloudflare account (the `BROWSER` binding needs it) and add the `MCP_SCREENSHOT_TOKEN_SECRET` GitHub secret. Until the secret exists the deploy passes an empty string and the MCP tool returns a configuration error instead of failing the deploy.

Migration note: MCP screenshots previously lived under `mcp/…` in the `thumbnails` bucket, where nothing ever deleted them. Those objects are now orphaned — the tool reads and writes the new bucket, and the version in the key means nothing will ever hit them again. Clear them out with a one-off prefix-scoped rule (`wrangler r2 bucket lifecycle add thumbnails expire-legacy-mcp mcp/ --expire-days 1 -y`, removed once the prefix is empty) or by deleting the `mcp/` folder from the dashboard.

Second migration note: the OG key dropped its `{w}x{h}` segment, so anything already written as `og/{kind}/{slug}/1200x630/{theme}.png` is orphaned too. Bounded and small — one object per board ever rendered before this deploy, and each board rewrites at its new key on the next publish or edit — but nothing will read or overwrite the old ones, and this bucket has no lifecycle rule to sweep them. A prefix rule cannot match a middle segment, so clear them by listing and deleting the `og/` keys containing `/1200x630/`, or leave them and accept a fixed one-off cost. Do **not** reach for a lifecycle rule on `thumbnails` to do it.

Third migration note: the MCP buckets were originally named `mcp-screenshots-preview` / `mcp-screenshots`, after the one artifact they held rather than the surface that writes them. R2 has no rename, so the names above are fresh buckets. Nothing needs copying — the preview bucket was created but never written to, and the production one was never created — so the old preview bucket can simply be deleted (`wrangler r2 bucket delete mcp-screenshots-preview`) once this config is deployed.

## Local development

Start the dotcom app from the repo root:

```bash
yarn dev-app
```

The dev-only fixture page renders allowlisted example snapshots without a worker, published file, or token:

```
/dev/browser-run-thumbnail?fixture=layer-panel&x=340&y=120&z=0.82&width=1200&height=630&theme=dark
```

Capture it locally without Cloudflare credentials:

```bash
yarn workspace dotcom browser-run-thumbnail \
  --mode local \
  --base-url http://127.0.0.1:3000 \
  --fixture snapshot-example \
  --output tmp/browser-run-thumbnail/local-thumbnail.png
```

To capture through real Browser Run, use a preview/dev deployment or a tunnel (Browser Run cannot reach `127.0.0.1`):

```bash
CLOUDFLARE_ACCOUNT_ID=... \
CLOUDFLARE_API_TOKEN=... \
yarn workspace dotcom browser-run-thumbnail \
  --mode browser-run \
  --base-url https://your-dev-or-preview-origin.example \
  --fixture layer-panel \
  --output tmp/browser-run-thumbnail/browser-run-thumbnail.png
```

When tunnelling with Vite's host checks, start the client with:

```bash
VITE_ALLOWED_HOSTS=your-tunnel-host.example yarn workspace dotcom exec vite dev --host 127.0.0.1 --port 3000 --strictPort
```

### The local screenshot service

The full worker render path works under `yarn dev-app`: `POST /app/mcp` with `tools/call` returns a real PNG, and the OG image route renders through its queue consumer the same way. Both go through the render page and the token-gated snapshot endpoint exactly as production does — the only substitution is the browser.

Local dev cannot reach Browser Run for two independent reasons. `[env.dev.browser]` is deliberately NOT marked `remote = true`, because a remote binding makes plain `wrangler dev` require a `CLOUDFLARE_API_TOKEN` that the credential-free process-compose stack does not have; and `[env.dev]` pins `compatibility_date` to `2025-06-05`, older than the `2026-03-24` `quickAction` needs, because that date is newer than the workerd bundled with our pinned wrangler. The second reason applies to `wrangler dev --remote` too, since it deploys with the same `[env.dev]` config, and dev's `MCP_SCREENSHOT_RENDER_ORIGIN` is unreachable from Cloudflare regardless.

So instead of a browser binding, `[env.dev.vars]` sets `LOCAL_SCREENSHOT_SERVICE_URL` to the client dev server's `/__screenshot` endpoint. The worker isolate cannot drive a browser, but the dev server is a Node process that already depends on Playwright, so a dev-only vite plugin (`scripts/vite-thumbnail-screenshot-plugin.ts`, `apply: 'serve'`, so it cannot exist in a built client) launches Chromium once and screenshots the render page on request. The worker sends it the same request body it would send Browser Run's Quick Action, so the wait strategy, capture target, and timeout come from `getThumbnailScreenshotRequestBody` for both and cannot drift. The plugin will only ever open `THUMBNAIL_RENDER_PATH` on its own origin — it discards the caller's host and fixes the path, so it cannot be pointed at an arbitrary URL.

This is not Browser Run: different Chrome build, different flags, no billing headers. It makes the local path work, and it is not evidence that a render will succeed in production — a preview deploy is still the check for anything Browser Run-specific, such as font availability in Cloudflare's fleet.

## MCP tools

```ts
get_board_info({
 boardId: string,
})
// → { name: string | null, pageCount: number, pages: { index: number, id: string, name: string, hasContent: boolean }[] }

get_page_info({
 boardId: string,
 page?: number | string, // 0-based page index or stable page id (see get_board_info). default 0
})
// → { name: string, clusterCount: number, clusters: { id: string, label: string, keywords: string[], numberOfShapes: number }[] }

get_cluster_info({
 boardId: string,
 page?: number | string,
 clusterId: string,
})
// → the cluster's label, keywords, and full shape records (rich text flattened to props.text)

get_cluster_screenshot({
 boardId: string,
 page?: number | string,
 clusterIds: string | string[], // one or more cluster ids from get_page_info
 theme?: 'light' | 'dark', // default 'light'
})
// → text (page name) + a 1200x630 content-fit PNG of those clusters
```

Every tool accepts the id of a tldraw.com board the authenticated caller can see: the `:slug` of a file URL (`https://www.tldraw.com/f/:slug`) they own, can reach through its owning group, or that is shared via link — or the `:slug` of a published board URL (`https://www.tldraw.com/p/:slug`). The id is resolved as a file first and a published slug second. Deleted files and test files are refused, as is any board the caller has no access to; all of these answer the same "no board was found with this id" as an id that names nothing at all.

Each `get_cluster_screenshot` call renders one image, so an agent typically calls `get_board_info` once to enumerate pages (using `hasContent` to skip blank ones), `get_page_info` to list a page's clusters, then screenshots the clusters it cares about — one, or several together to see how they sit relative to each other. That whole drill-down costs **one measure render**, not one per call: the first tool to cluster a page stores its clustering and the rest read it (see below). A screenshot on top of that costs one capture, or none if the PNG cache already holds those shapes.

The screenshot layer lives in the dotcom sync worker rather than the interactive `apps/mcp-app` canvas worker because it needs real tldraw.com published-file resolution and storage, not a live editor bridge.

### The cluster index

Three of the four tools have to cluster a page before they can answer anything, and clustering needs two things only an editor can produce: where each shape sits, and what its `ShapeUtil.getText` reports. Getting them means a **measure render** — a full Browser Run session, the same cost as a screenshot. That used to happen on every call, so the documented drill-down (`get_page_info` → `get_cluster_info` → `get_cluster_screenshot`) spent three of them on one page, and `get_cluster_info` — the tool an agent calls most, often several times over the clusters one page listed — paid full price every time.

The answer, though, only moves when the board's content moves. So the first tool to measure a page reduces the render's output to a **cluster index** and stores it; every later call for the same content is served from that.

What is stored, per page (`PageClusterIndex` in `boardTools.ts`): each cluster's id, label, keywords and the ids of its shapes, plus the plain text the editor reported for the shapes that have any. Bounds are deliberately **not** kept — they exist to decide which atoms merge, and that decision is already baked into the cluster membership. The text is kept because it is the one thing that cannot be re-derived: `getShapeText` can approximate it from the stored record, and dropping the editor's answer would quietly change what `get_cluster_info` reports for exactly the shapes the fallback handles worst. Shape _records_ are not stored either; they come from the room snapshot, which every tool call loads anyway.

**Where it lives: the file's own durable object** (`TLFileDurableObject`, table `mcp_cluster_index`, statements in `mcpClusterIndexStorage.ts`), addressed by `ResolvedThumbnailBoard.fileId` — the slug for a shared file, the parent file for a published board. This is the only durable object hop in the MCP request path; the tools otherwise read the persisted snapshot straight out of R2 and never talk to the object that wrote it. It sits there rather than in R2 beside the PNGs because it is content derived from the room, and the room is what that object owns: the row is strongly consistent, it dies with the file, and it needs no expiry policy.

**Invalidation is the cache key**, which carries the same content version the PNG cache uses — the persisted snapshot's R2 etag for a shared file, `lastPublished` for a published board. An edit or a republish rotates it and the stored index stops matching. The primary key is `(kind, pageId)` with the version held as a _value_, so writing a page's index for new content replaces the row for the old content rather than adding to it: a file's cache is bounded by its page count (and enumeration stops at `MAX_THUMBNAIL_PAGES`), not by its edit history. There is no slug in the key — the object is already the board's file, and a published slug can be rotated, which would strand a row nothing ever replaces. `kind` stays, because one file is two boards — the live shared file and the frozen published snapshot — which cluster differently as soon as the two have drifted apart.

**Every path through it falls back to measuring.** A miss, a row from a build whose `CLUSTER_INDEX_FORMAT_VERSION` differs, a payload that does not parse, an index naming a shape that is not on the page, a durable object that throws — all of them are a cache miss, which costs one render and is always correct. That includes the case where `get_page_info` was simply never called: `get_cluster_info` on a cold board measures, stores, and answers. Two limits bound what the cache itself can cost: a page whose index would exceed `MAX_CLUSTER_INDEX_LENGTH` (256K UTF-16 units) is never stored and keeps measuring, and a write that fails is reported to Sentry but never fails the tool that just spent the render.

**Bump `CLUSTER_INDEX_FORMAT_VERSION` when clustering or labelling changes**, not only when the stored shape does. The cache key rotates on edits, not on deploys, so nothing else stops a board that has not been touched since the change from serving groupings the current code would not produce.

The limiters follow the spend: the global Browser Run cap is consulted on the miss path only, since a call served from the index spends nothing to meter. The per-account budget still counts every call, cache hit or not — it is a ceiling on calls rather than on captures, so a caller looping over hits stays bounded.

### Protocol versions

`POST /app/mcp` serves two revisions of MCP at once: `2026-07-28` and `2025-11-25`. `2024-11-05` is no longer served — a client that asks for it during `initialize` is answered with `2025-11-25`, which is that handshake's own way of declining a version, and one that names it in an `MCP-Protocol-Version` header is rejected with `-32022` and the list of versions that are on offer.

The split matters because `2026-07-28` removed the handshake. There is no `initialize`, no session, and no `Mcp-Session-Id`: every request carries its own protocol version, in both the `MCP-Protocol-Version` header and `params._meta`. That header is what picks the era for a request, and the choice reaches only the response envelope and a few status codes — the tools underneath are the same code either way. Modern results carry `resultType: "complete"` and name the server in `_meta`; `tools/list` also carries `ttlMs` and `cacheScope` so clients can cache the tool list instead of re-fetching it. Legacy results carry none of that.

The modern transport also mirrors the routing-relevant body fields into headers — `Mcp-Method` on everything, `Mcp-Name` on `tools/call` — so that a gateway can dispatch without parsing the body. Where a header and the body disagree the request is refused with `-32020` rather than one of them being picked, because the disagreement is the whole problem: one value is what would run, the other is what the network already made its decisions on.

A missing version header is served as legacy rather than refused. Clients from `2025-06-18` on are supposed to send it and plenty don't, and a request without it is wire-identical to one with it, so rejecting would break working clients over a field this server doesn't need.

`server/discover` is the one call that answers whatever version it is asked under, including a version we don't serve: it exists so a client can find out what we speak, and gating that on already speaking it would be circular. `GET` and `DELETE` return 405 — they addressed the old standalone SSE stream and session teardown, which this server never offered and the current revision has removed.

### Authentication on the MCP server

Every request to `POST /api/app/mcp` needs an OAuth 2.1 bearer token, checked before the JSON-RPC body is read — `initialize` included, because MCP's flow expects the unauthenticated call to answer `401` with a pointer to the metadata, which is how a client learns it needs to sign the user in at all. There is no anonymous tier: the endpoint used to serve any caller that named a public board, and requiring a token retires that deliberately. What it buys is per-account rate limits instead of per-IP, attributable Browser Run spend, and the per-user board access check that lets the tools reach a caller's own private boards.

The pieces, all in `mcpAuth.ts`:

- **Clerk is the authorization server; this worker is only a resource server.** It never issues a token. sync-worker was already a Clerk consumer (`@clerk/backend`, `CLERK_SECRET_KEY`, `getAuth.ts`), which is what made this the shorter path — a standalone worker with no existing identity story would more likely want its own authorization server.
- **The authorization server is derived from `CLERK_PUBLISHABLE_KEY`, not configured separately.** The same key drives token verification, so the instance clients are sent to and the instance whose tokens we accept cannot drift apart. Two vars could, and the symptom would be every client completing sign-in and then being refused, with nothing in the logs to distinguish it from a bad token. `MCP_OAUTH_AUTHORIZATION_SERVER` overrides it if that is ever wrong.
- **Protected resource metadata is served at the origin** (`/.well-known/oauth-protected-resource/api/app/mcp`), per RFC 9728. This is why the worker has a **second route pattern** in `wrangler.toml`: it is otherwise routed only `www.tldraw.com/api/*`, and a client that fetches the metadata URL and gets the SPA's `index.html` never discovers the authorization server. That failure is silent on our side — it produces no request to log. The same trap exists in local dev, where the vite proxy needs the path and the preview server's SPA fallback needs to skip it.
- **Tokens are verified against the Clerk instance's JWKS, with `jose`.** Signature, issuer, lifetime (`requiredClaims: ['exp']`, since jose enforces only the claims it is told to) and token type. Not `@clerk/backend`'s `verifyToken`, which verifies Clerk _session_ tokens and refuses an OAuth access token on its header alone (`Invalid JWT type "at+jwt". Expected "JWT"`) — RFC 9068 requires `at+jwt` of an access token, so Clerk's authorization server and its own backend SDK disagree, and a resource server has to do this itself. [#10005](https://github.com/tldraw/tldraw/issues/10005) tracks the v2 SDK, which handles both.
- **`typ: at+jwt` is load-bearing, not pedantry.** It is the only thing separating an OAuth access token from a Clerk _session_ JWT: Clerk stamps no `aud` on either, so nothing can tell them apart by audience. A session token — `typ: JWT` — would otherwise be a valid bearer token here, which would make an ordinary tldraw.com website credential enough to drive this server and the consent step an agent walks a user through decoration.
- **There is no audience check, and its absence is deliberate.** RFC 8707 would bind a token to the resource it was minted for via `aud`, so a token a user granted to somebody else's MCP server could not be replayed here. Clerk does not implement it — it stamps no `aud` whether or not the client sends a `resource` parameter, so there is nothing to compare. What closes the hole instead lives on the authorization server, where the client registry is: with dynamic client registration off, **Only allow pre-registered clients to connect** on and **Block implicitly allowed clients** on — all three confirmed on the instance — a client nobody approved cannot obtain a token for our users at all. **That registry is the whole of the client-authorization story, it is dashboard state, and it is invisible from this repository** — no config entry, no test, no alarm. If any of it is turned off, a self-registered client can call this endpoint with a token its user consented to for something else entirely. Treat it as a standing invariant to confirm before enabling and to re-confirm after any Clerk change; a `client_id` allowlist in `mcpAuth.ts` is the belt to those braces if it is ever wanted, since the claim is on every token.
- **The endpoint and its metadata answer their own CORS**, and are registered ahead of the worker's origin allowlist. That allowlist protects _cookie_-authenticated routes; nothing here reads a cookie. A browser-context client — MCP Inspector on `localhost:6274`, a web connector fetching directly — is on no allowlist and never will be, and behind the check it got a bare `403 Not allowed` with no CORS headers, indistinguishable from "there is no MCP server here". `WWW-Authenticate` is exposed, since a client that cannot read the `resource_metadata` pointer cannot start the sign-in the `401` is inviting. Clients that send no `Origin` at all (Claude Desktop, `mcp-remote`, Cursor) were always fine, which is why this is easy to miss: testing with one of them proves nothing about the others.
- **Refusals are on their own event.** `mcp_server_auth_refusal` carries a bounded `reason` (`no_token`, `invalid_token`, `unconfigured`, `not_allowlisted`) and the client family. Nothing else records them — `mcp_server_tool_call` is written by the tools/call dispatcher, which a refused request never reaches — and during a flag-gated rollout "not signed in" and "signed in and not on the list" are the two numbers worth watching, and they call for entirely different responses.
- **The protocol version floor moved up, and `2024-11-05` was dropped.** That drop is what made any of this possible: MCP had no authorization flow before `2025-03-26`, so a client held to the old version has no conformant way to obtain the token every request now needs. The server now serves `2026-07-28` and `2025-11-25` side by side — see [Protocol versions](#protocol-versions) for how an era is picked and what it changes.
- **`mcp_server_access` decides who is let in.** An authenticated user the flag does not name gets `403` — not `401`, which would have clients loop through sign-in, and not `404`, which would hide an endpoint whose existence is already public in the discovery metadata. The flag is an **allowlist** type, added for this: `FeatureFlagValue` previously offered only boolean and percentage, and a percentage is a pseudo-random bucket (`hash(userId + flagName) < percentage`) that yields _a_ subset of the right size but never _the_ subset someone picked. The eventual bar is any signed-in tldraw.com user; the allowlist is the dial on the way there, not a narrower entitlement.

**One thing to confirm before this is switched on.** Verification validates a **JWT** against the instance's JWKS. If the Clerk OAuth authorization server is configured to issue opaque access tokens instead, they cannot be verified this way at all — that needs `idPOAuthAccessToken.verifySecret`, which arrived in `@clerk/backend` v2, and this worker pins 1.23.7, where there is no OAuth token API. Clerk's **Generate access tokens as JWTs** toggle is on by default and is what keeps this path valid; check it when the instance is set up.

Client registration is the other thing to configure. Clients identify themselves with Client ID Metadata Documents (CIMD): a client's id is an HTTPS URL to a metadata document its vendor hosts, so there is no registration endpoint. Clerk supports this (beta, enabled per account) through **Advertise CIMD support**, **Only allow pre-registered clients to connect**, and **Block implicitly allowed clients** — all three on, with the clients we verify allowlisted. The last two are what make the first safe: advertising CIMD alone admits any client that connects, and the third revokes the ones Clerk auto-allowed on first connect. We don't support dynamic client registration because of security concerns; a client that requires it isn't supported until it updates. [`mcp-server-auth.md`](./mcp-server-auth.md) has the reasoning.

## Remaining follow-up work

- **Move thumbnail rendering onto its own queue and cap it with `max_concurrency`.** This is the only mechanism in this stack that bounds total render rate: per-board rules cannot (total is `boards × rate`), and Cloudflare's rate limit bindings apply per location. Because the consumer captures one screenshot at a time, the arithmetic is exact — at the measured 6.3s capture, `renders/min ≈ 9.6 × max_concurrency`, so 4 is ~38/min and 5 is ~48/min. Its real merit is the failure mode: a capped consumer defers, where an over-limit Browser Run call fails and retries three times, so a cap converts overload into queue depth rather than amplification.

  Two prerequisites, which are why this is a follow-up rather than a config line. **The queue has to be split first** — `tldraw-multiplayer-queue` also carries `asset-upload`, and `max_concurrency` is a per-consumer setting, so capping the shared queue would throttle uploads too. And **`OG_PENDING_MARKER_TTL_MS` has to be re-derived from the cap**: it is sized against a job's retry chain (~3.75 minutes) on the assumption that queue latency is negligible, which is true only while nothing throttles. Once depth can build, a message can wait longer than its marker lives, the marker lapses, the next edit enqueues a second job for the same board, and the two clobber each other's per-board render token record — adding load exactly when the queue is already behind. Either refresh the marker when the job starts or derive its TTL from the cap.

- Schedule `fetch-screenshot-metrics.ts --check` somewhere (cron CI job or an external monitor) and point a dashboard at the SQL queries above; the script and queries exist, the scheduling is an ops decision.
- Shared files render the last persisted room snapshot from R2, which can lag in-memory edits by the persist debounce. If near-real-time accuracy is ever required, add a `getCurrentSnapshot` RPC on `TLFileDurableObject` (modeled on `onDownloadTldr`) instead of reading R2.
- Keep current-viewport screenshots, arbitrary shape selectors, and arbitrary URLs out of the MCP scope; boards stay limited to what the authenticated caller could already open in a browser.

## System map

The pixels come from `editor.toImage` on the render page. The worker calls the Browser Rendering `/screenshot` Quick Action through `env.BROWSER.quickAction`, which navigates the render page, waits for either terminal marker, and captures the success-only `body[data-thumbnail-ready="true"]` element (so `data-thumbnail-error` returns a render failure immediately instead of waiting out the timeout). The render page renders one page, exports it with `editor.toImage`, and displays that PNG as a full-viewport `<img>` — so the screenshot is the exact export. The screenshot response body is the PNG, which the worker writes to R2 and returns. No puppeteer, no API token, no page-side upload endpoint.

```mermaid
flowchart TB
    subgraph entry ["Entry points (sync worker)"]
        BI["get_board_info<br/>(POST /api/app/mcp — no browser)"]
        MCP["get_page_info / get_cluster_info /<br/>get_cluster_screenshot<br/>(POST /api/app/mcp — measure render + capture)"]
        OGR["GET /api/app/social-preview/:prefix/:slug/image<br/>(serves R2 cache only, never waits)"]
        SP["GET /app/social-preview/:prefix/:slug<br/>(crawler HTML: board name + og:image)"]
        QC["Queue consumer<br/>og-image-render (async refresh)"]
    end

    subgraph warm ["Refresh triggers (ahead of the first crawler)"]
        PUB["publish effect<br/>(publishSnapshots.ts via TLFileEffectProcessor)"]
        SPEC["persist on edit<br/>(TLFileDurableObject,<br/>debounced 60s, 5min max wait)"]
    end

    SP -->|og:image references| OGR
    PUB -->|reason: publish| QC
    SPEC -->|reason: edit| QC

    BI --> GATE["Resolve board + share gate<br/>(published or link-shared only)"]
    MCP --> GATE
    QC --> GATE

    GATE --> SNAP2["Load room snapshot<br/>(enumerate pages; board-info returns here)"]
    SNAP2 -->|name, page list| BI
    SNAP2 --> IDX{"Cluster index for this<br/>page + content version?<br/>(TLFileDurableObject SQL)"}
    IDX -->|hit: no render| MCP
    IDX -->|miss| TOKEN["Mint HMAC render token<br/>(board identity, pageId, 60s expiry)"]
    TOKEN --> BR["env.BROWSER.quickAction<br/>(navigate → wait data-thumbnail-ready → PNG)"]

    BR --> PAGE["/__thumbnail-render (client render page)"]
    PAGE --> SNAP["GET /api/app/thumbnail-render/snapshot<br/>token → records + schema + render params"]
    PAGE --> EXPORT["setCurrentPage(pageId) · editor.toImage()<br/>content-fit · display as full-viewport img"]
    EXPORT -->|screenshot captures the img| BR

    BR -->|measure bounds + text| IDX
    BR -->|PNG bytes| WORKER["Worker writes R2 + returns image"]
    WORKER --> R2[("THUMBNAILS bucket (og/… keys)<br/>MCP_DATA_BUCKET (mcp/… keys,<br/>expiring)")]
    WORKER -->|image in hand| MCP
    R2 -->|serve cached| OGR
    R2 -->|serve cached| MCP
```

### Follow-up work

The MCP/OG rework and the Browser Rendering binding migration described above are implemented. Since then:

- Done: the board image endpoint is `GET /api/app/social-preview/:prefix/:slug/image` (worker route `/app/social-preview/:prefix/:slug/image`), so the crawler HTML and its image share one route family.
- Done: `GET /app/og-html/:kind/:slug` and its Vercel route are removed. `getSocialPreview` supersedes it (board name in the title, human bounce-back), which also fixed the live bug where crawler-UA in-app browsers (WhatsApp, Pinterest) bounced back with the bypass param fell through the og-html stub (no redirect) and never reached the board, and made `SOCIAL_PREVIEW_DISABLED` a complete kill switch.
- Done: the shared thumbnail dimension constants (default 1200x630, clamp 200-1600) live in `@tldraw/dotcom-shared`; the worker and the client render page both import them.

Not doing:

- The render token's explicit viewport (`x`/`y`/`z`, used when `camera` is omitted) stays, even though every surface mints `camera: 'content'` and nothing exercises it in production. It was briefly removed as unreachable and put back. The token payload is short-lived and has no stored state, so dropping it costs nothing to undo _on the worker side_ — but the render page ships with the client and the worker deploys separately, so bringing it back would mean landing the client's handling first and waiting for that deploy before the worker could send one. Keeping it holds that door open for the price of three ignored fields.
- `useThumbnailPageSize` stays in `thumbnail-render.tsx`. It is load-bearing for the production render page, not dev-only: the render page displays the export as a full-viewport `<img>` and Browser Run takes a viewport screenshot of it, and the dotcom client has no global `body { margin: 0 }` reset (only `#root { width/height: 100% }` in `index.html`), so without the hook's `margin: 0` the browser's default 8px body margin would offset the image and the screenshot would show a white border and clip the bottom-right of every thumbnail.

## Real thumbnails on first share

Status: phases 2 and 3 are implemented and on; phase 1 is not shipping and phase 4 is still conditional. The mechanics of what shipped are documented above — "Default-image fallback" under the OG images section, "Keeping the thumbnail current" for the publish and edit triggers, and "Request limits" for why the render path is uncapped. This section keeps the rationale and the outstanding work.

### Problem

The first crawler to unfurl a board hits a cold OG-image cache and is sent to the generic tldraw image, and platforms cache that unfurl card on their side for days. So the first share of a board shows the logo rather than the board, and stays wrong long after the render lands seconds later.

The card itself is valid — the crawler follows the redirect and gets a real image — so there is nothing to fix in how the miss is served. The only lever is how often a crawler finds nothing, which means making the thumbnail exist first.

### Strategy

Make the thumbnail exist before the first crawler arrives. No synchronous rendering on crawler paths; the pending marker and the queue stay load-bearing as dedupe.

| Phase                       | Covers                                                | Cost                                                           | Status                |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- | --------------------- |
| 2. Publish hook             | explicit publish/republish, always fresh              | negligible                                                     | done                  |
| 3. Render on every persist  | the create → draw → share flow and revived old boards | ~1 render per editing session, +1 per 5min of unbroken editing | done                  |
| 4. Hop-1 warming (optional) | immediate shares, never-edited-again boards           | negligible                                                     | published boards only |

Phase 1 was a fallback that served the default image's bytes from the worker as a `200` rather than redirecting to them. It is not shipping: it existed to protect crawlers that do not follow an `og:image` redirect, and it bought a generic card either way. Phase 4 is what covers the case it aimed at — a board shared within the debounce window of its first edit.

`getOgImage`'s stale-serve behaviour is the residual backstop: a board whose thumbnail is out of date still gets its own picture, on a short TTL, rather than the site-wide default. The general on-miss enqueue that used to sit alongside it is gone; what survives is phase 4 narrowed to the one case that needs it, a published board with no image at all, since that is the only kind with no second trigger to fall back on (see "OG images (queue-backed async rendering)").

### Beyond OG images

This isn't just a crawler fix. The result is a board thumbnail that's reliably current in R2 — kept fresh by publish and edit triggers rather than rendered synchronously per request — for every shared board, not only the ones a crawler happens to hit. That's the same primitive other surfaces need: board previews in a folder or workspace view, for instance, which today would otherwise need their own render-on-demand path or ship without a real thumbnail. Those surfaces can just read the cached image.

### Phase 0 — measure (still worth doing, no longer a gate)

Pull two numbers from existing telemetry (`mcp_shared_board_screenshot` dataset via `internal/scripts/fetch-screenshot-metrics.ts`; `room_empty`/persist log events):

- daily unique boards with contentful edit sessions
- daily unique boards receiving og-image fetches

This was originally the gate on turning edit-triggered rendering on, because it sized the sampling percentage and the raised global cap. Neither exists now: rendering is uncapped and runs for every board. The numbers are still the ones to watch, but as observation rather than a precondition — they say what thumbnail rendering actually costs per day and whether Browser Rendering's account-level session limits are anywhere near being the binding constraint.

### Full path, from first edit to first-share cache hit

```mermaid
flowchart TB
    EDIT["t=0 — a change lands<br/>in TLFileDurableObject"]
    EDIT --> PERSIST["t≤8s — persist tick advances the<br/>document clock (persistToDatabase)"]
    PERSIST --> DEBOUNCE{"scheduleOgRender<br/>(push deadline out 60s —<br/>THE rate control)"}

    DEBOUNCE -->|"more edits arrive first"| WAIT["alarm fires, sees a newer<br/>deadline, re-arms (no render)"]
    WAIT --> DEBOUNCE
    DEBOUNCE -->|"editing settled, or<br/>5min max wait hit"| GATE{"requestOgRenderForEdit<br/>(share gate; fire-and-forget,<br/>never blocks persistence)"}

    GATE -->|"file record not shared"| SKIP["skip"]
    GATE -->|"shared or unknown"| MARK{"pending marker<br/>already set?"}

    MARK -->|"yes"| DEDUPE["already_pending — no message<br/>(single-flight, not a rate limit)"]
    MARK -->|"no"| ENQ["write marker + enqueue<br/>reason: edit"]

    ENQ --> QUEUE[("queue")]

    QUEUE --> CONSUMER["consumer delivery"]
    CONSUMER -->|"board no longer viewable"| DROPV["drop + delete cached image"]
    CONSUMER -->|"cached version already current"| ACK["ack without rendering<br/>((board, version) idempotency)"]
    CONSUMER -->|"otherwise"| RENDER["re-resolve → render CURRENT content<br/>(no capacity check)"]

    RENDER --> R2[("THUMBNAILS R2<br/>og/… key, version + createdAt")]
    R2 --> SHARE["first share: crawler og:image<br/>fetch is a cache hit"]
```

There are two constants to tune, both in `config.ts`, and the measurement in "What it costs" says they only work as a pair. `OG_RENDER_DEBOUNCE_MS` (60 seconds) sets how long a board must go quiet before its thumbnail is rendered — lower it for fresher thumbnails after short bursts, raise it to absorb more of a session into one render. `OG_RENDER_MAX_WAIT_MS` (5 minutes) caps how long a continuously edited board can go stale. Raising either one alone barely moves total spend, because a longer debounce merges bursts into sessions that then run into the max wait, trading a settle render for a max-wait one; raising both together is what actually reduces renders. `OG_PENDING_MARKER_TTL_MS` is not a dial: it is a single-flight guard and a crash ceiling, cleared as soon as a render lands.

### Phase 4 (conditional) — hop-1 warming

- `getBoardOgImageUrl` in `getSocialPreview.ts` already resolves the board; add: if no fresh cached image (one R2 `head` plus version compare, extracted from `getOgImage`'s check), `ctx.waitUntil(enqueueOgImageRender(env, board, { reason: 'crawler' }))`. Thread `ctx` into the route. This is the one thing that would put `crawler` back in use as a live reason.
- Ship only if phase-3 telemetry shows first-fetch misses are still meaningful (dormant never-edited boards, mostly — the delay that immediate sharers used to beat is gone).

### Explicitly not doing

- Synchronous wait in `getOgImage` — the queue's ~5s default batch linger means a short wait mostly misses, and the phases above remove the need. Revisit only with data showing otherwise.
- An `isEmpty`-based trigger — the `file.isEmpty` column is vestigial (written `true` at creation, never flipped by client or server), so there is no outbox-visible first-content transition.
- A DO-owned render single-flight — the advisory pending marker plus the consumer's version check is the accepted model and stays adequate at these volumes.
- A cap on thumbnail rendering — see "Request limits". Capping our own derived artifact only buys staler thumbnails; the caps belong on the MCP endpoint, which is the surface an outside caller can actually drive.

### Metrics to watch

- og-route cache hit rate (should be high — every shared, edited board should already have an image). This is now an aggregate only: with no `index1` on these events there is no per-board breakdown and no "first fetch per board".
- `not_rendered_yet` rate (should fall to near-zero for edited boards; every one of these is a crawler sent to the default image rather than the board)
- renders/day by `reason`, and total Browser Run minutes — the real spend signal, since the only bound is per-board and nothing caps the total
- ratio of renders to `persist_success` events: the debounce's whole claim is that this stays well below 1, and it is the number that would show the max wait being hit more often than expected. Note this is now **two aggregate counts divided by each other**, not a per-board join — the screenshot events carry no index. A handful of pathological boards and a uniformly high ratio look the same from here
- queue depth, especially through the first days after deploy, when every actively edited board renders for the first time

### Open questions

**These gate the deploy.** The sizing rests on two numbers, and the plausible range spans the account limit, so they want answering before this ships rather than after. Both are answered by telemetry on `persist_success` — in particular by no query against the production database. Question 2 is now answered from production data (see "What it costs"); question 1 still needs this branch's `blob3` deployed, and matters less than it did, since rendering no longer depends on a board being shared.

Deliberately not a Postgres question. Postgres knows which files are `shared`, but not which are being _edited_, and the only way to approximate that there is a predicate on `file.updatedAt` — a sequential scan of a hot table to answer a capacity-planning question. `persist_success` fires on exactly the event that triggers a render, so it can carry both facts itself.

1. **What fraction of actively edited boards are link-shared (`f`)?** This is the multiplier on every render estimate here; the current constants assume `f ≈ 30%`. `sharedState` (`blob3`) records it at persist time, from the same `_fileRecordCache.shared` the render trigger gates on, so it is persist-weighted — which is the weighting render cost actually has, unlike a per-file count.

   ```sql
   -- f = shared / (shared + private). Check the other rows before trusting it: `legacy` (non-app
   -- rooms) and `deleted` never render and are correctly outside the ratio; a large `unknown` means
   -- file records often aren't loaded at persist time and the ratio stands on a thin denominator.
   SELECT blob3 AS shared_state, SUM(_sample_interval) AS persists
   FROM MEASURE
   WHERE blob1 = 'persist_success'
     AND blob2 = 'production-tldraw-multiplayer'
     AND timestamp > NOW() - INTERVAL '1' HOUR
   GROUP BY shared_state
   ```

   For the board-weighted figure instead — distinct shared boards rather than persists — group by `index1` with `blob3 = 'shared'` and count the returned rows.

   ```sql
   -- Persists per board, keyed on the durable object id (one-way, so it identifies a board without
   -- being usable as a board URL). No uniq()/count(distinct) exists in Analytics Engine, so GROUP BY
   -- and count the rows. This is also the input to question 2.
   SELECT index1 AS durable_object_id, SUM(_sample_interval) AS persists
   FROM MEASURE
   WHERE blob1 = 'persist_success'
     AND blob2 = 'production-tldraw-multiplayer'
     AND blob3 = 'shared'
     AND timestamp > NOW() - INTERVAL '1' HOUR
   GROUP BY durable_object_id
   ```

2. **How many editing sessions start per minute? — answered.** [PR 9708](https://github.com/tldraw/tldraw/pull/9708) shipped `index1` on file DO events to production, so this no longer waits on deploying this branch. Replaying the debounce over a 30 minute production window gives **~37–51 renders/min** (the spread is Analytics Engine sampling, which splits runs that were really continuous). See "What it costs" for the method, the resulting $250–350/month, and the two consequences: production would sit at 70–95% of Browser Run's 60/min account limit on day one, and `OG_RENDER_MAX_WAIT_MS` is not the cost dial — it fires for under a tenth of renders, because the median editing session spans about ten seconds.

   The query is raw rows rather than an aggregate, since sessions are a property of the sequence:

   ```sql
   -- Then group by index1 in the client, sort each board's timestamps, and count runs separated by
   -- more than OG_RENDER_DEBOUNCE_MS, adding floor(run length / OG_RENDER_MAX_WAIT_MS) per run.
   -- Divide each board's gaps by its own _sample_interval for the low end of the range.
   SELECT index1, timestamp, _sample_interval
   FROM MEASURE
   WHERE blob1 = 'persist_success'
     AND blob2 = 'production-tldraw-multiplayer'
     AND timestamp > NOW() - INTERVAL '30' MINUTE
   LIMIT 100000
   ```

   Worth re-running before the deploy rather than trusting the number here: it is one window on one afternoon, and it includes `legacy` and `deleted` rooms that never render, which this branch's `blob3` would net out.

3. Browser Run's account limits (120 concurrent browsers, 1 new browser/second) are the real ceiling now that nothing in this worker caps renders. New-browsers-per-minute is the binding one, not concurrency: even at 217 renders/min with ~8s renders that is only ~29 concurrent against a limit of 120. Worth confirming whether `quickAction` bills against those or against the separate REST quota, and watching the Browser Run dashboard's Runs tab through rollout — the failure mode is a render error and three retries (so, amplification rather than backpressure), not a clean 429.
