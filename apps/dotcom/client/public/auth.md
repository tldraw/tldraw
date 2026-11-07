# tldraw.com auth.md

You are an agent. This page describes how to obtain a token for the one authenticated API tldraw.com exposes to agents: the MCP server at `https://www.tldraw.com/api/app/mcp`, which reads the pages, shape clusters and rendered screenshots of tldraw.com boards.

There is no anonymous tier. Every call needs a token belonging to a signed-in tldraw.com account, and the server additionally checks that the account can see the board being asked about.

## What tldraw.com does and does not support

- **OAuth 2.1 with PKCE**, against Clerk as the authorization server. tldraw is the resource server only; it never issues a token, it only verifies one.
- **Client ID Metadata Documents (CIMD)** are how a client identifies itself. Your `client_id` is an HTTPS URL serving your client metadata.
- **Dynamic client registration is not supported.** There is no registration endpoint to POST to. A client that can only do dynamic registration cannot connect until it supports CIMD.
- **There is no agent self-registration or claim ceremony.** A human signs in to their own tldraw.com account through the normal browser consent flow; you never assert an identity on their behalf.

## Discover

Call the MCP endpoint without a token. The `401` carries everything you need:

```http
POST /api/app/mcp HTTP/1.1
Host: www.tldraw.com
```

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://www.tldraw.com/.well-known/oauth-protected-resource/api/app/mcp", scope="openid profile email offline_access"
```

Fetch the `resource_metadata` URL for the RFC 9728 protected resource metadata:

```json
{
	"resource": "https://www.tldraw.com/api/app/mcp",
	"authorization_servers": ["https://clerk.tldraw.com"],
	"scopes_supported": ["openid", "profile", "email", "offline_access"],
	"bearer_methods_supported": ["header"],
	"resource_documentation": "https://tldraw.dev"
}
```

The same document is served at `https://www.tldraw.com/.well-known/oauth-protected-resource` for clients that fall back to the path-less form.

Then fetch `https://clerk.tldraw.com/.well-known/oauth-authorization-server` for the authorization and token endpoints.

## Authorize

Run the standard authorization code flow with PKCE against Clerk, with your CIMD URL as `client_id`.

**Request exactly the four scopes named in the challenge** — `openid profile email offline_access` — and no others. Clerk advertises more scopes than any one client is granted, and asking for an ungranted scope fails the whole request with `invalid_scope` before the user ever sees a consent screen. Only `sub` is read from the resulting token; the rest are there because they are what Clerk's defaults already hand most clients.

Send the access token as `Authorization: Bearer <token>`.

## What refusals mean

- **`401`** — no token, or a token that failed verification. Re-run the flow. The `WWW-Authenticate` header points at the metadata again.
- **`403` with `"error": "forbidden"`** — the token is valid and the account is real, but that account is not enabled for the MCP server yet. Access is being rolled out behind a flag; there is nothing a client can do about this, and retrying will not help. The account holder should ask tldraw for access.
- **A board that is reported as not found** — one message covers every way a board fails to resolve, including boards that exist but that this account cannot see. It is not a signal to retry with different parameters.

## Protocol versions

The server speaks `2026-07-28` and `2025-11-25`. Older revisions, including the pre-authorization `2024-11-05`, are not served.

## Machine-readable metadata

- Server Card — `https://www.tldraw.com/api/app/mcp/server-card`
- API catalog — `https://www.tldraw.com/.well-known/api-catalog`
- AI catalog — `https://www.tldraw.com/.well-known/ai-catalog.json`
