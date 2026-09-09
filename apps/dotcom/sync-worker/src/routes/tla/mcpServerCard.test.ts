import { describe, expect, it } from 'vitest'
import { Environment } from '../../types'
import { MCP_SERVER_INFO } from './boardTools'
import { SUPPORTED_PROTOCOL_VERSIONS } from './mcpServer'
import {
	MCP_SERVER_CARD_PATH,
	MCP_SERVER_CARD_WELL_KNOWN_PATH,
	getMcpServerCard,
} from './mcpServerCard'

const RESOURCE = 'https://www.tldraw.com/api/app/mcp'

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return { MCP_SERVER_URL: RESOURCE, ...overrides } as unknown as Environment
}

function makeRequest() {
	return new Request('https://sync.tldraw.xyz/app/mcp/server-card') as any
}

describe('getMcpServerCard', () => {
	it('points at the MCP endpoint clients actually connect to', async () => {
		const card = (await getMcpServerCard(makeRequest(), makeEnv()).json()) as any

		expect(card.remotes).toEqual([
			{
				type: 'streamable-http',
				url: RESOURCE,
				supportedProtocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
			},
		])
	})

	// The card is read before a client connects and never checked against anything afterwards, so
	// nothing but this stops it drifting away from what the live server answers with.
	it('reports the same version and title the server hands back on connect', async () => {
		const card = (await getMcpServerCard(makeRequest(), makeEnv()).json()) as any

		expect(card.version).toBe(MCP_SERVER_INFO.version)
		expect(card.title).toBe(MCP_SERVER_INFO.title)
	})

	// Both are schema constraints, and both are the kind of thing that only fails once the document is
	// published and somebody else's validator rejects it.
	it('satisfies the schema constraints on name and description', async () => {
		const card = (await getMcpServerCard(makeRequest(), makeEnv()).json()) as any

		expect(card.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/)
		expect(card.description.length).toBeLessThanOrEqual(100)
		expect(card.$schema).toBe(
			'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json'
		)
	})

	// Falls back to the request's own origin when nothing is configured, which is what local dev and
	// preview deployments run on.
	it('derives the endpoint from the request when no server URL is configured', async () => {
		const card = (await getMcpServerCard(
			makeRequest(),
			makeEnv({ MCP_SERVER_URL: undefined })
		).json()) as any

		expect(card.remotes[0].url).toBe('https://sync.tldraw.xyz/api/app/mcp')
	})
})

describe('server card paths', () => {
	// The `.well-known` alias sits outside the /api/* route pattern, so it only reaches this worker
	// because wrangler.toml carries a route for the prefix. Getting the path wrong here is invisible
	// until a request 404s in production.
	it('places the canonical card under the MCP endpoint and the alias at the origin', () => {
		expect(MCP_SERVER_CARD_PATH).toBe('/app/mcp/server-card')
		expect(MCP_SERVER_CARD_WELL_KNOWN_PATH).toBe('/.well-known/mcp/server-card.json')
	})
})
