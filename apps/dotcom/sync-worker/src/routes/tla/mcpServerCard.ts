import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { MCP_SERVER_INFO } from './boardTools'
import { getMcpResourceUrl } from './mcpAuth'
import { SUPPORTED_PROTOCOL_VERSIONS } from './mcpServer'

// A Server Card is the pre-connection half of MCP discovery: what a client reads to decide whether
// it wants this server and how to reach it, without a token. That matters here, where every call to
// the server itself is refused without one — an agent that cannot authenticate can still learn where
// to go.
//
// Nothing checks the card against the running server, so the values below are sourced from the same
// constants it answers with rather than restated.

/**
 * The path the MCP spec reserves for a card: the server's own URL with `/server-card` appended. As
 * registered on the router — the public form is `/api/app/mcp/server-card`, with the `/api` prefix
 * stripped upstream.
 */
export const MCP_SERVER_CARD_PATH = '/app/mcp/server-card'

/**
 * A second path for the same document, under `.well-known`.
 *
 * The extension's own discovery notes argue against this: a card is not site-wide the way OAuth
 * metadata is, and the catalog at `/.well-known/ai-catalog.json` is the mechanism that is supposed
 * to point at cards. It is served anyway because agent-readiness scanners probe it directly, and one
 * more route pointing at the same handler costs less than being invisible to them. Prefer
 * {@link MCP_SERVER_CARD_PATH} when linking.
 *
 * At the origin rather than under `/api`, so — like the protected resource metadata — it needs its
 * own `wrangler.toml` route to reach this worker at all.
 */
export const MCP_SERVER_CARD_WELL_KNOWN_PATH = '/.well-known/mcp/server-card.json'

/** Not a version to bump: a breaking revision of the card shape publishes a new `vN` URL. */
const SERVER_CARD_SCHEMA_URL =
	'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json'

/**
 * Reverse-DNS with exactly one slash, which the card schema requires and the runtime
 * `serverInfo.name` (`tldraw-shared-board-screenshot`) does not satisfy — the two identify the same
 * server in two namespaces that cannot be made textually equal. The human-readable identity travels
 * in `title` and `description`, which do match.
 */
const SERVER_CARD_NAME = 'com.tldraw/board-screenshots'

/**
 * The media type a Server Card is served with, which is not `application/json`.
 *
 * Clients ask for this type by `Accept`, and the AI Catalog entry pointing here declares it — a
 * catalog whose `type` disagrees with what the URL actually returns is the mismatch a strict client
 * refuses on. `Response.json` would quietly make it `application/json`, so the card is serialised by
 * hand.
 */
const SERVER_CARD_MEDIA_TYPE = 'application/mcp-server-card+json'

export function getMcpServerCard(request: IRequest, env: Environment): Response {
	return new Response(
		JSON.stringify({
			$schema: SERVER_CARD_SCHEMA_URL,
			name: SERVER_CARD_NAME,
			version: MCP_SERVER_INFO.version,
			title: MCP_SERVER_INFO.title,
			// The schema caps this at 100 characters.
			description: 'Screenshots and structure of tldraw.com boards you have access to.',
			websiteUrl: 'https://tldraw.dev',
			repository: {
				url: 'https://github.com/tldraw/tldraw',
				source: 'github',
				subfolder: 'apps/dotcom/sync-worker',
			},
			remotes: [
				{
					type: 'streamable-http',
					url: getMcpResourceUrl(request, env),
					supportedProtocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
				},
			],
		}),
		{
			headers: {
				'content-type': SERVER_CARD_MEDIA_TYPE,
				'cache-control': 'public, max-age=3600',
			},
		}
	)
}
