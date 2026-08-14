# Authentication for the board screenshot MCP server

Status: implemented on this branch, not yet enabled
Scope: `apps/dotcom/sync-worker` — the MCP server at `POST /api/app/mcp`

Companion to [`browser-run-thumbnails.md`](./browser-run-thumbnails.md), which documents the server this covers. The reference material now lives there, under "Authentication on the MCP server"; this document is the reasoning behind it, kept because most of it is about choices that are not visible in the result.

## What landed

Everything in the rollout below except verifying each client end to end. The Clerk-side configuration is not code and is now done — see [Open questions](#open-questions) 1, 2 and 8 for the settings and what each is holding up:

- Required auth on every call, with OAuth 2.1 discovery, `401` + `WWW-Authenticate`, and Clerk token verification against the instance's JWKS with `jose` (`mcpAuth.ts`) — signature, issuer, `exp` and `typ: at+jwt`. **There is no audience check**, because Clerk stamps no `aud` on an access token whether or not the client sends a `resource` parameter, so there is nothing to compare; an earlier version of this branch checked anyway and would have refused every token Clerk ever issued. `typ` is what carries the weight instead: it is the only thing separating an OAuth access token from a Clerk _session_ JWT. What stops a token minted for somebody else's MCP server being replayed here lives on the authorization server, where the client registry is — Clerk's **Only allow pre-registered clients to connect**, **Block implicitly allowed clients**, and dynamic client registration off. All three are confirmed on (see [Open questions](#open-questions) 8), and all three are dashboard state with no representation in this repo, which is the standing caveat rather than an open question.
- The advertised protocol versions are `2026-07-28` and `2025-11-25`. `2024-11-05`, `2025-03-26` and `2025-06-18` are all gone; see [Open questions](#open-questions) 10.
- The minted-token record key namespaced by surface, and keyed per capture for MCP — the blocking prerequisite.
- The per-user board access check (`hasReadAccessToFile`), gating the cache read as well as the render, with one not-found message for every way a board can fail to resolve.
- An `allowlist` feature flag type, and `mcp_server_access` using it — one list, absorbing the friends-and-family list from [#9809](https://github.com/tldraw/tldraw/pull/9809). Entries are edited as emails and stored as `{ userId, email }`, resolved against the database at save time; the separate list and the `mcp_friends_and_family` flag are gone.

Client registration is settled: clients identify themselves with Client ID Metadata Documents (CIMD), and we don't support dynamic client registration; a client that lacks CIMD isn't supported until it updates. Token format is settled: access tokens stay JWTs — Clerk's default, kept by a dashboard toggle — so verification is a JWKS check, done with `jose` rather than `@clerk/backend`, whose `verifyToken` refuses an `at+jwt` on its header alone. Questions 8–10 were raised by review of the finished branch and are answered too, but 8 is the one to keep in view: with no `aud` to check, the entire client-authorization story is Clerk dashboard state that nothing here can see.

## Summary

The MCP server at `POST /api/app/mcp` was anonymous by design. It is now behind a signed-in tldraw.com account, using OAuth 2.1 so that MCP clients (Claude, ChatGPT, Cursor) can complete the sign-in themselves.

**The eventual bar is any signed-in tldraw.com user** — no staff restriction, no `@tldraw.com` requirement, no permanent allowlist. **For now, a feature flag restricts access to a specific subset of users**, and the rollout widens from there.

This layer's job is to establish identity and hand a verified `userId` to that flag gate. It does not decide who is eligible.

**Auth is required, not optional.** Every call to `/api/app/mcp` needs a valid token; there is no anonymous tier. This retires the "point any agent at a public tldraw board" use case the server was built for, deliberately.

On top of that, the server checks that the authenticated user **has access to the board they ask for**, rather than only checking that the board is publicly viewable. That second requirement is the larger change of the two, and it is what [Checking board access](#checking-board-access) covers.

## What this changes

Two things move at once, and it's worth separating them because they have different consequences.

**Requiring auth** buys:

- **Per-user rate limits instead of per-IP.** The limits keyed on `cf-connecting-ip` (`ip-shot:`). IP limits are weak in both directions — trivially evaded with a proxy pool, and punishing for anyone behind a shared NAT.
- **Attribution for Browser Rendering spend.** This is the surface that costs real money per cache miss. A spike used to be a hashed IP; with identity it's an account.
- **A path to per-plan quotas**, if screenshot capacity ever becomes something we meter.

It costs every existing anonymous caller. Since the tools only reached boards that were already public, that population loses access to data it could still read by opening a browser — so the case for required auth rests on the operational benefits above and on the access check below, not on protecting board contents from people who can already see them.

**Adding a per-user access check** is the part that makes auth load-bearing. Once the gate is "can this user see this board" rather than "is this board public", identity is doing real work, and the server can serve boards that are not public at all. It does — see the next section for why that was the choice.

The flag stages the rollout: required auth goes on for the flagged population first, then widens. The target is every signed-in user — the flag is the dial, not a narrower entitlement. See [What auth hands to the feature flag gate](#what-auth-hands-to-the-feature-flag-gate).

## Where this started

`sharedBoardScreenshotMcp.ts` is a hand-rolled JSON-RPC handler on a single route, not an MCP SDK server. There are no sessions, no Durable Objects, and no per-caller state. What the starting point looked like:

- **The protocol version was pinned to `2024-11-05`** (`MCP_PROTOCOL_VERSION`). This predates MCP authorization entirely — auth was introduced in `2025-03-26` and reworked in `2025-06-18`. **Upgrading the advertised protocol version was a prerequisite**, not a follow-up: there is no conformant way to bolt auth onto `2024-11-05`, and clients keying off the advertised version won't attempt a flow the server claims not to support.
- **Abuse control already existed and was not naive.** Three tiers of rate limit (per-IP, per-board, global Browser Run cap), a kill switch (`MCP_SCREENSHOT_ENABLED`), and telemetry with deliberately bounded cardinality. [#9667](https://github.com/tldraw/tldraw/pull/9667) confines rate limiting to this endpoint — the one Browser Run-spending surface an outside caller drives directly — and splits it across three bindings so the tiers can hold different numbers. Auth was never going to be the first line of defence here; it's a better key for a defence that was already built.
- **sync-worker was already a Clerk consumer.** `@clerk/backend` ^1.23.7 is a dependency, `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` are in `Environment`, and `utils/tla/getAuth.ts` has `getAuth`/`requireAuth` with an `authorizedParties` allowlist. A much shorter path than starting cold — and the reason for the Option A recommendation below.
- **There were no `.well-known` routes on the worker**, and no OAuth dependency anywhere in the repo. There is still no OAuth dependency: the resource-server side needs none.

## What the MCP spec requires

Verified against the SDK vendored in this repo and current docs, not from memory:

1. Serve OAuth protected resource metadata at `/.well-known/oauth-protected-resource/<path>`, naming the authorization server.
2. Return `401` with `WWW-Authenticate: Bearer resource_metadata="..."` when unauthenticated, so clients can discover where to authenticate.
3. Accept only tokens issued for this resource; reject tokens minted for a different audience (RFC 8707 resource indicators). **This one is not satisfied, and cannot be as things stand** — Clerk issues no `aud`, so the resource server has nothing to compare. The equivalent protection sits on the authorization server instead; see [Open questions](#open-questions) 8.

The authorization server needs authorization code + PKCE, `/.well-known/oauth-authorization-server` metadata, and a way for clients to identify themselves without a pre-shared client ID. That is Client ID Metadata Documents (CIMD): the `client_id` is an HTTPS URL to a metadata document the client's vendor hosts, checked against an allowlist on the authorization server. We don't support dynamic client registration (RFC 7591) because of the security concerns of a public, unauthenticated registration endpoint — the spec deprecated it in favour of CIMD — so a client that requires it isn't supported until it updates. CIMD asks nothing of the resource server and is not tied to protocol version negotiation: the client chooses it from the authorization server's metadata (`client_id_metadata_document_supported`) during the OAuth flow our `401` triggers, before `initialize` ever succeeds. The advertised protocol version is `2025-11-25` — that revision requires nothing of this server beyond `2025-06-18` — with `2025-06-18` and `2025-03-26` still accepted. `2026-07-28` is a different wire protocol — no `initialize` handshake (every request carries its version and capabilities in `_meta`), a required `server/discover` RPC, `resultType` on every result, cacheable list results. Support for it comes in a follow-up PR, dual-era alongside the handshake versions, which the spec explicitly sanctions on one endpoint.

One routing wrinkle flagged as worth confirming early, correctly: the public URL is `/api/app/mcp` while the worker route is `/app/mcp`, so the `/api` prefix is applied upstream. Protected resource metadata must be served at the resource's own origin and path.

**The worker could not serve it.** `wrangler.toml` routes it `www.tldraw.com/api/*` and nothing else, so the metadata URL — which sits at the origin, outside that prefix — reached the SPA instead. Three places needed changing, and each fails silently on its own: a second route pattern for deployments, a vite proxy entry for local dev, and an exclusion in the preview server's SPA fallback, which runs ahead of the proxy and would otherwise answer the metadata URL with `index.html`. A client that gets HTML there treats discovery as failed and never finds the authorization server, and nothing is logged on either side.

## Options

### Option A: Clerk as the authorization server

sync-worker already authenticates users with Clerk, and Clerk can act as an OAuth 2.1 authorization server. The worker serves protected resource metadata and verifies Clerk-issued tokens; Clerk owns `/authorize`, `/token`, consent, and token lifecycle.

Pros: substantially less code, one identity system, no new token store, and it builds on wiring that is already here and already maintained.

Cons: it couples MCP token policy to that instance's configuration. There is a report of Claude.ai connectors failing against Clerk-fronted MCP servers ([anthropics/claude-ai-mcp#164](https://github.com/anthropics/claude-ai-mcp/issues/164) — Claude Code via `mcp-remote` worked, the web connector did not); it's closed without a published resolution, so it may be fixed, but it's someone else's interop to depend on.

### Option B: sync-worker runs its own authorization server

Stand up `@cloudflare/workers-oauth-provider` in the worker, with Clerk as the upstream identity provider. Tokens are ours, scoped to this resource, and revocable independently.

Cons: we operate an authorization server — a KV namespace, grant storage, token lifetime decisions — and reason about two token systems instead of one.

### Recommendation

**Option A**, on the grounds that it adds least machinery to a worker that already speaks Clerk. This is the opposite call from what would suit a standalone worker with no existing identity story; it turns on sync-worker already being a Clerk consumer.

**But the access check changes the weighting, and this should be re-examined rather than assumed.** The proportionality argument for Option A was strongest when the tools only reached public boards: a leaked token bought an attacker nothing they couldn't get from a browser. If [the access check admits private boards](#the-scope-question-this-raised), tokens minted through this flow become credentials for private user content, and Option B's advantages get more valuable — tokens scoped to this resource alone rather than usable against tldraw.com, revocable independently, and dynamic client registration kept off the Clerk instance that guards the main app.

**Private boards are in scope, so that re-examination was owed — CIMD settles it in Option A's favour.** Option B's heaviest advantage was keeping client registration off the Clerk instance that guards the main app; with CIMD there is no registration endpoint on either option (we don't support dynamic client registration). Clerk's side is three settings that belong together — **Advertise CIMD support**, **Only allow pre-registered clients to connect**, and **Block implicitly allowed clients**. The second is load-bearing, since advertising CIMD alone admits any client that connects; the third closes the gap left by clients Clerk auto-allowed the first time they connected. What remains of Option B's case — token issuance independent of tldraw.com's Clerk instance — isn't worth operating an authorization server for while those hold. It is a thinner guarantee than an audience check would have been, and worth restating whenever this weighting is revisited: Option A's whole client-authorization story is dashboard state. What is built stays Option A; only `mcpAuth.ts` knows where a token came from, so it can be swapped if that weighting ever changes.

## Checking board access

The tools used to resolve a board through `resolveSharedBoardById`, which tried it as an anonymously-shared file and then as a published board. Both paths applied a **public-viewability** gate: published boards must be `published`, shared files must pass `isFileAnonymouslyViewable` (exists, not deleted, `shared` via link). The caller was irrelevant to that decision — the same board resolved the same way for everyone.

That is now `resolveSharedBoardForUser`, and the gate is "can **this user** see this board": the user owns the file (`file.ownerId`), the file belongs to a group they can access (`getRole` + `can(role, 'accessFiles')`), or it is shared via link. That is `requireWriteAccessToFile` in `getAuth.ts` minus the `sharedLinkType === 'edit'` requirement; there was no read-access equivalent in the codebase, so `hasReadAccessToFile` was written next to it rather than inlined here.

### The scope question this raised

A user-scoped gate admits boards that are not public — the user's own private files. That is a genuine expansion of what this server does, from "screenshot public boards" to "screenshot any board you can see":

- **Tighten only.** Keep the public-viewability gate and additionally require that the caller is signed in and flag-enabled. Private boards stay unreachable. Smallest change, no new exposure.
- **Extend to the user's own boards.** The tools become useful for private work, which is probably the point of authenticating in the first place.

**The second is what was built** — checking "does this user have access" is otherwise indistinguishable from checking nothing, and it is what makes authenticating worth the cost to existing callers. The consequences run through the rest of this document: it is why the tool mints `render` (and why the token key needed namespacing first), why the cache read is gated, why there is one not-found message, and why the Option A recommendation above is owed a re-examination.

### Most of the render-side work is already done by #9667

[#9667](https://github.com/tldraw/tldraw/pull/9667) builds the private-board render path for its own reasons — thumbnails are generated for every board so owner-facing surfaces always have one — and in doing so it solves the problems this proposal would otherwise have had to. Reading it before starting is worth more than anything in this section:

- **The access level is signed into the render job.** `ThumbnailBoardAccess` is `public` or `render`, carried in `ThumbnailRenderJob.access` and "taken from the resolution rather than the caller, so a surface cannot render under a gate it did not resolve under." The public-only path therefore already has a gate a user-scoped token cannot satisfy — the separation this proposal needs exists.
- **Render tokens are already two-factor for private boards.** Because the snapshot route serves a private board's whole document, a leaked `MCP_SCREENSHOT_TOKEN_SECRET` would have been sufficient to read any board. Every `render` mint now records the token's hash in R2 and the route requires that record, so forged signatures fail without write access to our bucket. The TTL also drops from 5 minutes to 60s.
- **The MCP tool minted `public` and was deliberately not recorded**, on the grounds that it only rendered boards anyone could already fetch, so a record would guard nothing.

So the remaining work was not "build a private-board render path". It was "let the MCP tool mint `render` instead of `public`, once it can prove the caller may see the board" — much smaller, with one hard prerequisite. It now mints `render` for files, and still `public` for published boards, which is what keeps those out of the token records.

### The prerequisite: namespace the minted-token key by surface

`recordMintedRenderToken` keys per board — `render-tokens/{kind}/{slug}` — so each mint overwrites its board's record. That is safe for the OG pipeline because it is single-flighted per board by the `.pending` marker, making a newer mint superseding an older one the intended behaviour.

The MCP tool is **not** single-flighted. Concurrent captures of different pages of one board are explicitly supported and tested. If it starts minting `render` jobs, two such captures land in the same per-board key and invalidate each other's tokens; the loser `403`s on its snapshot fetch and surfaces as a generic `browser_failed`. An edit-triggered render arriving during a capture does the same.

That last detail is what makes this worth treating as blocking rather than as a cleanup: the failure is intermittent, load-dependent, and reported under a reason code that says nothing about the real cause. PR [#9667](https://github.com/tldraw/tldraw/pull/9667) flags the constraint in the doc comment on `recordMintedRenderToken`:

> **If the MCP tool ever mints `render` jobs** — which authenticating those endpoints would invite, since it would let them screenshot private boards — this key must be namespaced by surface first.

**What landed goes several steps further than "by surface."** Surface alone separates MCP from OG, which fixes the edit-triggered-render case, but two concurrent MCP captures of one board would still share a key — the case the tool's own tests exercise. An MCP screenshot is therefore keyed by what it draws, page and theme and shape set: `render-tokens/{kind}/{slug}/mcp/screenshot/{theme}/{pageId}/{shapeSetDigest}`. Board first so hard-delete cleanup can clear a board's records with one prefix listing rather than having to know every surface.

**A measure render needed a different key again, and this was missed the first time round.** Keying by content cannot separate two measures: a measure exports nothing, and every measure of a page mints an identical job down to the hardcoded light theme, so they all collapsed onto one key. That is not a rare race but the ordinary agent pattern — the clustering tools all measure before they can do anything, so any two of `get_page_info`, `get_cluster_info` and `get_cluster_screenshot` aimed at one page raced, and the loser `403`d as a generic `browser_failed`. Measures are keyed by their own token (`…/mcp/measure/{tokenHash}`), which is unique per capture, and each deletes its record when it finishes — a per-token key is the one shape here that would otherwise accumulate.

Two residuals, both deliberate. Two identical _screenshots_ in flight at once still collide, and the later mint wins. Both would have drawn the same image, so the loser costs a repeat rather than a wrong one, and what that repeat actually costs differs by surface: on OG a queue redelivery, which re-resolves at the top, finds the winner's image already at the current version, and acks as a cache hit without spending Browser Run; on MCP a failed tool call, which the agent repeats if it still wants the picture. Neither surface leaves a stale image up to save that, which would trade a redelivery for a thumbnail that stays wrong until the board is next edited. And a token minted before the `surface` field existed reads as `og` and falls back to the old key, without which every OG render in flight across that deploy would `403` until it expired. That old key sits at the board prefix without its trailing slash, so hard-delete cleanup deletes it by name as well as listing the prefix; a prefix listing alone walks straight past it, and nothing else would ever collect them.

### What the access check needed

- **The user access check itself**, which is this document's actual contribution: resolve the board against the caller rather than against the public gate, and mint `render` only when that passes. `hasReadAccessToFile` in `getAuth.ts` is the read-side helper that did not exist — `requireWriteAccessToFile` minus the `sharedLinkType === 'edit'` requirement, returning a boolean where that throws a `StatusError`. The return type is the point: a caller that must not learn whether a file exists cannot use a helper that distinguishes 404 from 403 on its behalf.
- **Gate the cache read, not just the render** — and specifically _not_ by adding a viewer to the cache key. MCP screenshots live in their own bucket, keyed `mcp/{kind}/{slug}/{version}/{w}x{h}/{theme}/page-{n}.png`, with no viewer dimension. A cached private board would otherwise be served to anyone naming the right board id. This falls out of ordering — the check runs before the lookup — but the ordering is load-bearing rather than incidental, and both the code and a test say so. See below for why the two fixes are not equivalent.
- **Keep one not-found message.** The try-file-then-published fallback becomes an existence oracle if "no such board" and "you can't see it" are distinguishable. One `BOARD_NOT_FOUND` constant serves every tool and every failure mode, with a test asserting the two responses are byte-identical.
- **Don't reintroduce board identity into telemetry.** PR #9667 removes it deliberately, since for a link-shared file the slug _is_ the capability to view the board. The hashed-IP dimension became a hashed user id in the same blob position, so the dashboard panels reading it did not move; no board dimension came back.

### Why gating the read beats keying by viewer

The obvious alternative to gating the cache read is putting the viewer in the cache key. It is the more expensive option, and the difference is spend rather than correctness.

Those keys currently collapse every caller onto one object per `(board, version, size, theme, page)`. A viewer dimension multiplies the object count by distinct viewers and drops the hit rate proportionally — and because the per-board limiter counts captures only on misses, a flow that costs nothing today starts spending Browser Run once per viewer. Two people screenshotting the same public board would each pay for their own render of an identical image.

Gating the read on the access check keeps one object per board and spends nothing extra: the check runs before the lookup, and a caller who passes it gets the shared cached object. So the security-motivated fix is also the cheaper one, which is worth stating explicitly because "gate the cache read" reads like a pure correctness choice.

This matters more after the viewport change, not less: caller-specified viewports already fragment the key space, so adding a viewer dimension on top would multiply an already-worse hit rate.

### The viewport change reinforces this

Planned work moves MCP screenshots to caller-specified viewports, leaving fixed-size renders to the image generation flow. That further separates two surfaces which already have different access models — OG images are served to crawlers with no user at all — so the user-scoped gate must stay alongside the shared helpers rather than relaxing them. A private board reaching a link unfurl is the failure this guards against.

Two consequences worth designing around now:

- **Arbitrary viewports are much less cacheable.** The current key space is small and bounded (one entry per page, theme, and version); caller-chosen viewports make near-every call a miss, so Browser Run spend per call rises sharply. That strengthens the case for per-user quotas rather than weakening it, and viewport parameters will need bounding so a caller can't request an absurd render size.
- **The render token gains viewport parameters**, which is the same payload that would gain `userId` for private-board access. Worth doing both in one change to the signed job rather than two.

## How it was built

The auth check sits inside `sharedBoardScreenshotMcp`, after the `isMcpScreenshotEnabled` kill switch (so a disabled server still looks absent rather than unauthorized) and before the JSON-RPC body is read.

- The advertised protocol version is `2025-11-25`, `initialize` echoes the client's when we speak it, and `2025-06-18` and `2025-03-26` stay accepted. `2024-11-05` is not in the supported list, which is the point: it predates MCP authorization, so advertising it would leave a client unable to obtain a token but convinced the server was behaving to spec.
- Protected resource metadata at `/.well-known/oauth-protected-resource/api/app/mcp`, and `401` + `WWW-Authenticate` from the route when no valid token is present. Every call needs one.
- Bearer tokens verified with `jose.jwtVerify` against the Clerk instance's JWKS — signature, issuer, `exp` and `typ: at+jwt`. Not `@clerk/backend`'s `verifyToken`, which verifies Clerk _session_ tokens and refuses an OAuth access token on its header alone (`Invalid JWT type "at+jwt". Expected "JWT"`); [#10005](https://github.com/tldraw/tldraw/issues/10005) tracks the v2 SDK that handles both. There is no `aud` check — see the TL;DR and open question 8.
- The `mcp_server_access` flag is evaluated for the authenticated user; a user it does not name gets `403`.
- The public-viewability gate is replaced by a per-user access check, which gates the cache read as well as the render.
- Rate limits re-keyed from `ip-shot:` to `user:`. `ip-info:` was already gone. IP limits still make sense for endpoints with no caller identity — `/app/thumbnail-render/snapshot` and the discovery endpoint — and there are none there today.
- The hashed-IP telemetry dimension became a hashed user ID in the same blob position, keeping the "failures and rate limits only" shape that bounds its cardinality.

The estimate held up, with one exception. The protocol upgrade, discovery/401 handling, token verification, and the re-keying were each small; the access check was the substantial one. What was not in the estimate: the discovery **routing**, which needed a second wrangler route pattern, a vite proxy entry, and an SPA-fallback exclusion, each failing silently if missed. Client interop testing across Claude desktop and web, ChatGPT, Cursor, and `mcp-remote` remains untouched and still does not compress.

## What auth hands to the feature flag gate

Auth is not the thing deciding who gets in. Auth produces a trustworthy identity; the flag decides which users are switched on. Initially that's a specific subset, widening to all signed-in users. The split is kept clean in the code, which is what lets the rollout widen with a KV edit rather than a deploy — and keeps the auth layer from ever encoding who is eligible.

**The flag system could not express "these specific users," so this added the type.** `FeatureFlagValue` was `BooleanFeatureFlag | PercentageFeatureFlag`: boolean is all-or-nothing, and percentage is a pseudo-random bucket — `hashToPercentage(userId + flagName) < percentage`. A percentage rollout gives you _a_ subset, never _the_ subset you picked. `AllowlistFeatureFlag` (`type: 'allowlist'`, with `users: { userId, email }[]`) is the third case, with admin UI to edit the list.

This was written up as the flag work's problem rather than this one's, and it landed here only because that work has not started and the rollout is blocked without it. The note it replaces is still the useful part: "gate it behind a flag" sounds like it needs no new flag machinery, and here it did.

Two related findings about what the allowlist can key on:

- **`evaluateFlagForUser` takes `userId` only — there is no `email` parameter.** Server-side flag evaluation has no access to email today.
- **Our existing email-based override is client-side.** `commenting_enabled` grants access to `@tldraw.com` emails regardless of the flag, and that check lives in the client (`TldrawApp.ts:96`, `useUser.tsx:38`), not in `featureFlags.ts`. Noted as prior art for _how_ email overrides have been done, not as a model for this gate: MCP callers are Claude and ChatGPT rather than our React app, so anything enforced there isn't enforced at all.

So the flag work picks a key:

- **`userId`** — the token carries it, `evaluateFlagForUser` already takes it, and nothing new is needed beyond the allowlist type itself.
- **`email`** — only if the subset is genuinely maintained as email addresses. The server-side route to email is a Clerk API call (`users.getUser()`, as `requireAdminAccess` does), i.e. a per-request round trip on a path that is otherwise careful about spend. That wants a verified email claim in the Clerk session token, added as part of the flag work so the auth layer just reads it.

`userId` is the cheaper path. Email is more convenient for maintaining a human-readable list, which is a real consideration for a hand-picked subset — worth weighing rather than defaulting.

## Overlap and sequencing

- **The friends-and-family flag landed first** ([#9809](https://github.com/tldraw/tldraw/pull/9809)), as a boolean flag beside its own list — built to raise rate limits for signed-in callers while the endpoint still served anonymous ones. Requiring auth collapsed that design: once every caller is on a hand-picked list, a raised tier for a subset of that list is two lists doing one job. So the list folded into the `mcp_server_access` allowlist flag — keeping #9809's edit-as-emails, store-as-ids resolution — and the boolean flag was removed. The split the plan described still holds in the code: auth establishes identity, the flag decides who is switched on, and widening the rollout is a KV edit rather than a deploy.
- **[#9667](https://github.com/tldraw/tldraw/pull/9667) is the significant dependency, and this branch is stacked on it.** It builds the private-board render path, the signed `ThumbnailBoardAccess` level, and two-factor render tokens — most of what the access check would otherwise have needed. It also relocates MCP screenshots to their own bucket and confines rate limiting to the MCP endpoint. **This cannot merge before it does.**
- **[#9774](https://github.com/tldraw/tldraw/pull/9774)** is concurrently rewriting `sharedBoardScreenshotMcp.ts` and its tests (cluster-based tools, cache key changes, new telemetry surfaces). This branch is not written against it, so expect conflicts in that file. They should be shallow — auth wraps the route rather than changing tool internals — but the per-user resolution does replace `resolveSharedBoardById`, which its new tools will also call, and the cluster tools will need the same access check rather than the public gate.
- **`apps/mcp-app` is a separate decision.** It's a different server with a different architecture (MCP SDK, `McpAgent`, Durable Objects), gated on a single shared `MCP_AUTH_TOKEN` that isn't set in production, with no per-user identity. It needs its own answer; the two shouldn't be bundled.

## Rollout

The code steps landed together on this branch rather than in the sequence below, because the sequence was written for shipping to production and this is one reviewable change. The sequencing argument still holds for **turning it on**, and the steps are kept as that checklist.

0. ~~Prerequisites: the friends-and-family flag including whatever allowlist mechanism it needs, and [#9667](https://github.com/tldraw/tldraw/pull/9667).~~ Both merged; the allowlist mechanism landed here and absorbed #9809's list.
1. ~~Land the protocol upgrade.~~ Done — `2026-07-28` and `2025-11-25`, with everything older dropped.
2. ~~Namespace the minted-token record key by surface.~~ Done. MCP records are keyed by the capture — the token — rather than by content: surface alone fixes MCP-versus-OG collisions, and content keys still had two identical concurrent captures of one board invalidate each other, which agents produce routinely.
3. ~~Add discovery endpoints and token verification.~~ Done. **Announce the cutover date before enabling** — every existing anonymous caller breaks at step 5.
4. **Verify each client end to end**, using [Connecting a client](#connecting-a-client) below. The server side is proven — a real OAuth token drives `get_board_info` → `get_page_info` → `get_cluster_screenshot` on the preview, render included — but each _client_ still has to be walked through its own flow. This is a gate, not a formality: connector-side OAuth failures produce opaque errors with nothing in our logs. **Include one browser-context client** (MCP Inspector, or a web connector): it takes a different path through the worker's CORS handling than Claude Desktop or `mcp-remote`, so one client passing is not evidence for the others.
   4b. **Re-confirm the Clerk client registry, and check the approved client list is what you expect.** Dynamic client registration off, **Only allow pre-registered clients to connect** on, **Block implicitly allowed clients** on — all three verified on the instance, and all three worth checking again here. This is a standing invariant rather than a one-time step: with no `aud` on Clerk's tokens it is the entire client-authorization story, and nothing in this repo would notice one of them being turned off.
5. **Enforce for flag-enabled users.** The code enforces already; the flag ships `enabled: false` with an empty list, so today the endpoint answers `403` to every authenticated caller and `401` to everyone else. Turning the flag on is the breaking moment, and there is no anonymous path to fall back to. **Re-enter the friends-and-family cohort by hand first.** `mcp_friends_and_family_users` is orphaned rather than migrated — nothing carries it into `mcp_server_access.users` — so that population loses access on deploy until an admin pastes the addresses back in. The direction is fail-safe, but it is silent, and the list is only readable from the old KV key. The admin panel accepts an allowlist while the flag is still off, so this can be staged before step 5 rather than during it.
6. ~~Land the per-user board access check and switch the tool to minting `render`.~~ Done.
7. **Widen the flag as confidence builds**, toward the stated bar of any signed-in user.

Steps 5 and 6 were worth keeping apart when this was a deployment plan: step 5 is the disruptive one for existing callers, step 6 changes what the tools can reach. They are one change here, which means the first enablement exercises both at once — worth remembering if something misbehaves.

## Connecting a client

The endpoint is `https://www.tldraw.com/api/app/mcp` (staging: `https://staging.tldraw.com/…`, previews: `https://pr-{number}-preview-deploy.tldraw.com/…`). Every client needs an OAuth access token from the tldraw Clerk instance and an account the `mcp_server_access` flag names.

**Claude, and other clients with a hosted redirect URI.** Nothing special — add the endpoint as an HTTP MCP server and complete the sign-in the `401` triggers. Claude's CIMD document registers `https://claude.ai/api/mcp/auth_callback`, an exact non-loopback URI, so it needs no workaround.

**Claude Code needs an explicit client id.** Its CIMD document registers the _portless_ `http://localhost/callback` and `http://127.0.0.1/callback`, while the CLI listens on a port and sends `http://localhost:{port}/callback`. Clerk matches redirect URIs exactly, so it refuses:

```
http://localhost:54545/callback   400  "does not match any of the OAuth 2.0 Client's pre-registered redirect urls"
http://127.0.0.1:54545/callback   302  (accepted — RFC 8252 §7.3 grants any-port only to loopback IP literals)
```

This is Claude Code's bug, not Clerk's — RFC 8252 §8.3 says `localhost` is NOT RECOMMENDED precisely because it does not get that treatment. [`anthropics/claude-code#37747`](https://github.com/anthropics/claude-code/issues/37747) concedes both halves of the fix (`application_type: "native"` in the document, `127.0.0.1` from the CLI) and was closed without shipping either.

Until it ships, hand Claude Code an explicit client id, which short-circuits its CIMD branch entirely:

```bash
claude mcp add --transport http tldraw https://www.tldraw.com/api/app/mcp \
  --client-id <client-id> --callback-port 54545
```

Two requirements on the Clerk OAuth application behind that id, and both fail _late_ and confusingly if missed:

- **It must be a public client.** Clerk creates applications as confidential by default, and a confidential one answers `/oauth/token` with `401 invalid_client` — after the browser sign-in and consent have already succeeded, so it reads as a mysterious final-step failure. To tell the two apart, POST a bogus code to `/oauth/token`: a public client gets `400 invalid_grant`, a confidential one `401 invalid_client`.
- **Its redirect URIs must include every `localhost` port you document**, spelled exactly (`http://localhost:54545/callback`). Register a few, since a port already in use on the user's machine is otherwise a dead end — and `localhost` gets no port flexibility, for the reason below.

Register `http://127.0.0.1:54545/callback` alongside them. Verified against staging: Clerk implements RFC 8252 §7.3 exactly, so **one loopback-IP entry covers every port** — `127.0.0.1:1234`, `:8080`, `:61234` are all accepted off that single registration, while `localhost:1234` is refused unless registered literally. Path and host are still matched strictly (`127.0.0.1:61234/evil` and `attacker.example:61234/callback` are both refused), so this widens nothing else. It costs one entry and means the day Claude Code starts sending the IP literal, every port works with no further Clerk change.

**Changing redirect URIs only helps for a client id you own.** They are editable on your own OAuth applications (`PATCH /oauth_applications/{id}`, field `redirect_uris`). They are _not_ editable for a CIMD client: Clerk fetches those from the document the client's vendor hosts, and the Backend API exposes no CIMD client resource at all — the only CIMD surface is three instance-level booleans (`client_id_metadata_documents_advertised`, `…_only_allow_pre_registered_clients`, `…_block_implicitly_allowed_clients`). Pre-registering Claude Code on the CIMD clients list allows it; it does not let you rewrite what it sends.

**Do not turn on dynamic client registration to work around this.** It would fix the mismatch — a client registering itself records the URI it actually uses — but `…_only_allow_pre_registered_clients` is CIMD-scoped and constrains DCR clients not at all. With no `aud` on Clerk's tokens, that registry is the whole of the client-authorization story here; see [Open questions](#open-questions) 8.

## Open questions

1. **Does the Clerk instance issue JWT or opaque access tokens?** JWTs — Clerk's default, controlled by the **Generate access tokens as JWTs** toggle on the OAuth applications settings tab, which stays on. Verification is a JWKS check, done with `jose` rather than `@clerk/backend`: `verifyToken` refuses an `at+jwt` on its header alone, so the SDK cannot verify the tokens its own authorization server issues. Opaque tokens would need `idPOAuthAccessToken.verifySecret` from `@clerk/backend` v2, an upgrade that touches every auth path in the worker — deliberately avoided.
2. **Do we support dynamic client registration?** No — the toggle is off on the instance, because of the security concerns of a public, unauthenticated registration endpoint. Clients identify themselves with CIMD, allowlisted through **Advertise CIMD support**, **Only allow pre-registered clients to connect**, and **Block implicitly allowed clients**, all three on: the second is what makes the first safe, since advertising CIMD alone admits any client, and the third revokes the ones Clerk auto-allowed on first connect. CIMD is in beta, enabled per account. A client that requires registration isn't supported until it updates; Clerk's connection guide covers Claude Code, Claude Desktop, Cursor, VS Code, and Windsurf, but not ChatGPT, and step 4 is where any casualty of this policy shows up.
3. **Does the access check admit private boards, or only tighten the public gate?** It admits them. A board resolves for the caller who owns it, can reach it through its owning group, or holds its share link.
4. **How does the flag name specific users?** A new `allowlist` flag type, added here rather than by the flag work — see [What auth hands to the feature flag gate](#what-auth-hands-to-the-feature-flag-gate).
5. **Does the flag gate on `userId` or `email`?** `userId`. `evaluateFlagForUser` already takes one, so nothing new was needed; email would have meant a Clerk `users.getUser()` round trip per evaluation, or a verified email claim added to the session token. The cost is that the list is opaque to read — an entry has to be looked up in the admin user search rather than recognized.
6. **Does the `/api` prefix allow serving `.well-known` at the public origin?** No, and this was the one worth checking early. The worker is routed `www.tldraw.com/api/*` only, so the metadata URL never reached it; it needed a second route pattern, a vite proxy entry, and an exclusion in the preview server's SPA fallback. Each of those would have failed silently — a client fetching `index.html`, parsing it as failed discovery, and never finding the authorization server.
7. **Should this be an issue rather than a PR?** Moot: it is implemented here.

Three more, raised by review of the finished branch and all downstream of there being no audience binding:

8. **What stops a token minted for another MCP server being replayed here, with no `aud` to check?** Clerk's client registry, and nothing in this repo. Any access token the tldraw instance issues — to any client, for any purpose — is full authorization at `POST /api/app/mcp`, so absent that registry a third party could stand up a Clerk OAuth client, walk a tldraw user through consent for its own stated purpose, and replay the resulting token here.

   The registry is doing the work: dynamic client registration **off**, **Only allow pre-registered clients to connect** **on**, and **Block implicitly allowed clients** **on** — so an unapproved client cannot obtain a token for our users in the first place. All three confirmed on the instance.

   What stays true regardless: that is dashboard state, invisible from this repository, with no config entry, no test and no alarm. Re-confirm it before enabling and after any change to the Clerk instance — it is in the rollout checklist as step 4b for that reason. A `client_id` allowlist in `mcpAuth.ts` remains the belt to those braces if the exposure ever warrants one; the claim is on every token. A required tldraw-defined `scope` is **not** currently available: the instance's default CIMD scopes are `email` and `profile` (plus `offline_access`), both generic OIDC, so there is nothing tldraw-specific to demand without defining a custom scope first.

9. **Is preview↔staging token interchangeability acceptable?** Yes — accepted deliberately. Staging and preview share the `deploy-staging` environment and therefore the same Clerk secrets, so both derive the same issuer and JWKS and a token obtained against a preview verifies at staging. They share configuration by design, and neither holds anything production does; production is genuinely isolated by a separate Clerk instance. Worth knowing rather than fixing: previews also read feature flags from the **dev** KV namespace (`wrangler.toml`, `env.dev` and `env.preview` share one), so enabling `mcp_server_access` locally enables it on every preview at once.
10. **Was dropping `2025-06-18` and `2025-03-26` intended?** Yes. The floor is `2025-11-25`, three revisions above the one MCP authorization first appeared in, and a client pinned to an older revision is refused. Deliberate: the versions we serve are the ones we test against, and carrying revisions no client we support still asks for buys compatibility nobody is using.

## References

- [MCP authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Clerk: build an MCP server](https://clerk.com/docs/mcp/build-mcp-server)
- [Clerk: how Clerk implements OAuth](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth) — the DCR and CIMD settings
- [Clerk: connect MCP clients](https://clerk.com/docs/guides/ai/mcp/connect-mcp-client) — per-client connection guidance, CIMD-first
- [cloudflare/workers-oauth-provider](https://github.com/cloudflare/workers-oauth-provider)
- [anthropics/claude-ai-mcp#164](https://github.com/anthropics/claude-ai-mcp/issues/164)
