# Authentication for the board screenshot MCP server

Status: implemented on this branch, not yet enabled
Scope: `apps/dotcom/sync-worker` — the MCP server at `POST /api/app/mcp`

Companion to [`browser-run-thumbnails.md`](./browser-run-thumbnails.md), which documents the server this covers. The reference material now lives there, under "Authentication on the MCP server"; this document is the reasoning behind it, kept because most of it is about choices that are not visible in the result.

## What landed

Everything in the rollout below except the Clerk-side configuration, which is not code:

- Required auth on every call, with OAuth 2.1 discovery, `401` + `WWW-Authenticate`, and audience-checked Clerk token verification (`mcpAuth.ts`). The audience is asserted against the token's `aud` explicitly; `verifyToken`'s `audience` option is not passed at all — it compares only when the token carries an `aud` (so on its own it would accept a Clerk _session_ JWT), and a present-but-wrong `aud` would fail inside verification, upstream of the escape hatch and its diagnostic log. Enforcement is behind `MCP_REQUIRE_TOKEN_AUDIENCE`, off in dev, staging and preview until the Clerk instance is confirmed to stamp the resource indicator, and not overridable in production. Flipping staging to enforcing is the first step of enabling this.
- The supported protocol versions are `2026-07-28` and `2025-11-25` — one per era, served dual-era on the one endpoint — with `2024-11-05`, `2025-06-18` and `2025-03-26` dropped.
- The minted-token record key namespaced by surface, page and theme — the blocking prerequisite.
- The per-user board access check (`hasReadAccessToFile`), gating the cache read as well as the render, with one not-found message for every way a board can fail to resolve.
- An `allowlist` feature flag type, and `mcp_server_access` using it — one list, absorbing the friends-and-family list from [#9809](https://github.com/tldraw/tldraw/pull/9809). Entries are edited as emails and stored as `{ userId, email }`, resolved against the database at save time; the separate list and the `mcp_friends_and_family` flag are gone.

**One thing is still open, and it is a decision rather than code.** Whether the Clerk instance issues JWT or opaque access tokens, which determines whether `@clerk/backend` has to go to v2 first. Client registration is settled: clients identify themselves with Client ID Metadata Documents (CIMD), and we don't support dynamic client registration; a client that lacks CIMD isn't supported until it updates. See [Open questions](#open-questions).

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
3. Accept only tokens issued for this resource; reject tokens minted for a different audience (RFC 8707 resource indicators).

The authorization server needs authorization code + PKCE, `/.well-known/oauth-authorization-server` metadata, and a way for clients to identify themselves without a pre-shared client ID. That is Client ID Metadata Documents (CIMD): the `client_id` is an HTTPS URL to a metadata document the client's vendor hosts, checked against an allowlist on the authorization server. We don't support dynamic client registration (RFC 7591) because of the security concerns of a public, unauthenticated registration endpoint — the spec deprecated it in favour of CIMD — so a client that requires it isn't supported until it updates. CIMD asks nothing of the resource server and is not tied to protocol version negotiation: the client chooses it from the authorization server's metadata (`client_id_metadata_document_supported`) during the OAuth flow our `401` triggers, before `initialize` ever succeeds. The supported protocol versions are `2026-07-28` and `2025-11-25`. `2026-07-28` is a different wire protocol — no `initialize` handshake (every request carries its version and capabilities in `_meta`), a required `server/discover` RPC, `resultType` on every result, cacheable list results — and it is served dual-era alongside `2025-11-25` on the one endpoint, which the spec explicitly sanctions. Discovery sits behind the same `401` as every other method: that response is what points a client at the metadata, and exempting one method would reopen the anonymous tier.

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

**Private boards are in scope, so that re-examination was owed — CIMD settles it in Option A's favour.** Option B's heaviest advantage was keeping client registration off the Clerk instance that guards the main app; with CIMD there is no registration endpoint on either option (we don't support dynamic client registration). Clerk's side is two settings that belong together — **Advertise CIMD support** and **Only allow pre-registered clients to connect**; the second is load-bearing, since advertising CIMD alone admits any client that connects. What remains of Option B's case — token issuance independent of tldraw.com's Clerk instance — isn't worth operating an authorization server for while the audience check holds. What is built stays Option A; only `mcpAuth.ts` knows where a token came from, so it can be swapped if that weighting ever changes.

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

**What landed goes one step further than "by surface."** Surface alone separates MCP from OG, which fixes the edit-triggered-render case, but two concurrent MCP captures of different pages of one board would still share a key — the case the tool's own tests exercise. The MCP key therefore carries the page and theme as well: `render-tokens/{kind}/{slug}/{surface}[/{theme}/{pageId}]`. Board first so hard-delete cleanup can clear a board's records with one prefix listing rather than having to know every surface.

Two residuals, both deliberate. Two identical captures in flight at once still collide, and the later mint wins — the OG case again, one image rendered twice, costing a retry rather than a wrong result. And a token minted before the `surface` field existed reads as `og` and falls back to the old key, without which every OG render in flight across that deploy would `403` until it expired.

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

- The supported protocol versions are `2026-07-28` and `2025-11-25`. `initialize` belongs to the legacy era and always answers `2025-11-25`; a modern client never calls it, stating its version on every request instead. `2024-11-05` is not in the supported list, which is the point: it predates MCP authorization, so advertising it would leave a client unable to obtain a token but convinced the server was behaving to spec. `2025-06-18` and `2025-03-26` are also absent, which narrows the matrix to one revision per era at the cost of clients that cannot follow an offered version.
- Protected resource metadata at `/.well-known/oauth-protected-resource/api/app/mcp`, and `401` + `WWW-Authenticate` from the route when no valid token is present. Every call needs one.
- Bearer tokens verified with `verifyToken` from `@clerk/backend` — signature and lifetime only; the audience binding is asserted separately against the verified payload's `aud` (see the TL;DR). This is the token path rather than the session path `getAuth.ts` uses, since MCP clients send bearer tokens rather than cookies — but see open question 1 about the token format.
- The `mcp_server_access` flag is evaluated for the authenticated user; a user it does not name gets `403`.
- The public-viewability gate is replaced by a per-user access check, which gates the cache read as well as the render.
- Rate limits re-keyed from `ip-shot:` to `user:`. `ip-info:` was already gone. IP limits still make sense for endpoints with no caller identity — `/app/thumbnail-render/snapshot` and the discovery endpoint — and there are none there today.
- The hashed-IP telemetry dimension became a hashed user ID in the same blob position, keeping the "failures and rate limits only" shape that bounds its cardinality.

The estimate held up, with one exception. The protocol upgrade, discovery/401 handling, token verification, and the re-keying were each small; the access check was the substantial one. What was not in the estimate: the discovery **routing**, which needed a second wrangler route pattern, a vite proxy entry, and an SPA-fallback exclusion, each failing silently if missed. Client interop testing across Claude desktop and web, ChatGPT, Cursor, and `mcp-remote` remains untouched and still does not compress.

## What auth hands to the feature flag gate

Auth is not the thing deciding who gets in. Auth produces a trustworthy identity; the flag decides which users are switched on. Initially that's a specific subset, widening to all signed-in users. The split is kept clean in the code, which is what lets the rollout widen with a KV edit rather than a deploy — and keeps the auth layer from ever encoding who is eligible.

**The flag system could not express "these specific users," so this added the type.** `FeatureFlagValue` was `BooleanFeatureFlag | PercentageFeatureFlag`: boolean is all-or-nothing, and percentage is a pseudo-random bucket — `hashToPercentage(userId + flagName) < percentage`. A percentage rollout gives you _a_ subset, never _the_ subset you picked. `AllowlistFeatureFlag` (`type: 'allowlist'`, with `userIds`) is the third case, with admin UI to edit the list.

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
1. ~~Land the protocol upgrade.~~ Done — `2026-07-28` and `2025-11-25`, dual-era, with everything older dropped.
2. ~~Namespace the minted-token record key by surface.~~ Done, and by page and theme besides: surface alone fixes MCP-versus-OG collisions but not two concurrent MCP captures of one board, which is the case the tests exercise.
3. ~~Add discovery endpoints and token verification.~~ Done. **Announce the cutover date before enabling** — every existing anonymous caller breaks at step 5.
4. **Verify each client end to end.** Not done, and it cannot be until the Clerk instance is configured (CIMD with the pre-registered-clients allowlist). A client that cannot connect via CIMD isn't supported until it updates. This is a gate, not a formality — connector-side OAuth failures produce opaque errors with nothing in our logs.
5. **Enforce for flag-enabled users.** The code enforces already; the flag ships `enabled: false` with an empty list, so today the endpoint answers `403` to every authenticated caller and `401` to everyone else. Turning the flag on is the breaking moment, and there is no anonymous path to fall back to.
6. ~~Land the per-user board access check and switch the tool to minting `render`.~~ Done.
7. **Widen the flag as confidence builds**, toward the stated bar of any signed-in user.

Steps 5 and 6 were worth keeping apart when this was a deployment plan: step 5 is the disruptive one for existing callers, step 6 changes what the tools can reach. They are one change here, which means the first enablement exercises both at once — worth remembering if something misbehaves.

## Open questions

Still open, and blocking:

1. **Does the Clerk instance issue JWT or opaque access tokens?** Verification is `verifyToken` from `@clerk/backend`, which checks a JWT against the instance JWKS. Opaque tokens need `idPOAuthAccessToken.verifySecret`, which is `@clerk/backend` v2; this worker pins 1.23.7, which has no OAuth token API at all. If they are opaque, the SDK upgrade is a prerequisite and it touches every auth path in the worker, not just this one.

Answered:

2. **Do we support dynamic client registration?** No, because of the security concerns of a public, unauthenticated registration endpoint. Clients identify themselves with CIMD, allowlisted through Clerk's **Advertise CIMD support** and **Only allow pre-registered clients to connect** settings, turned on together — the second is what makes the first safe, since advertising CIMD alone admits any client. CIMD is in beta, enabled per account. A client that requires registration isn't supported until it updates; Clerk's connection guide covers Claude Code, Claude Desktop, Cursor, VS Code, and Windsurf, but not ChatGPT, and step 4 is where any casualty of this policy shows up.
3. **Does the access check admit private boards, or only tighten the public gate?** It admits them. A board resolves for the caller who owns it, can reach it through its owning group, or holds its share link.
4. **How does the flag name specific users?** A new `allowlist` flag type, added here rather than by the flag work — see [What auth hands to the feature flag gate](#what-auth-hands-to-the-feature-flag-gate).
5. **Does the flag gate on `userId` or `email`?** `userId`. `evaluateFlagForUser` already takes one, so nothing new was needed; email would have meant a Clerk `users.getUser()` round trip per evaluation, or a verified email claim added to the session token. The cost is that the list is opaque to read — an entry has to be looked up in the admin user search rather than recognized.
6. **Does the `/api` prefix allow serving `.well-known` at the public origin?** No, and this was the one worth checking early. The worker is routed `www.tldraw.com/api/*` only, so the metadata URL never reached it; it needed a second route pattern, a vite proxy entry, and an exclusion in the preview server's SPA fallback. Each of those would have failed silently — a client fetching `index.html`, parsing it as failed discovery, and never finding the authorization server.
7. **Should this be an issue rather than a PR?** Moot: it is implemented here.

## References

- [MCP authorization specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Clerk: build an MCP server](https://clerk.com/docs/mcp/build-mcp-server)
- [Clerk: how Clerk implements OAuth](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth) — the DCR and CIMD settings
- [Clerk: connect MCP clients](https://clerk.com/docs/guides/ai/mcp/connect-mcp-client) — per-client connection guidance, CIMD-first
- [cloudflare/workers-oauth-provider](https://github.com/cloudflare/workers-oauth-provider)
- [anthropics/claude-ai-mcp#164](https://github.com/anthropics/claude-ai-mcp/issues/164)
