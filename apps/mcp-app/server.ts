import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TLShape } from 'tldraw'
import { registerTools } from './src/register-tools'
import {
	MAX_CHECKPOINTS,
	MCP_SERVER_DESCRIPTION,
	MCP_SERVER_INSTRUCTIONS,
	MCP_SERVER_NAME,
	MCP_SERVER_TITLE,
	MCP_SERVER_VERSION,
	MCP_SERVER_WEBSITE_URL,
} from './src/shared/types'
import type { MCP_APP_HOST_NAMES, ServerDeps } from './src/shared/types'
import { resolveMcpAppHostNameFromServerInfo } from './src/shared/utils'
import { loadCachedCanvasWidgetHtml } from './src/tools/loadCachedCanvasWidgetHtml'

// --- Server factory ---

export function createServer() {
	// Keep checkpoint state per server instance so parallel sessions do not bleed into each other.
	const checkpoints = new Map<
		string,
		{ shapes: TLShape[]; assets: unknown[]; bindings: unknown[] }
	>()
	let activeCheckpointId: string | null = null
	const sessionId = crypto.randomUUID()

	function saveCheckpoint(
		id: string,
		shapes: TLShape[],
		assets: unknown[] = [],
		bindings: unknown[] = []
	): void {
		checkpoints.set(id, { shapes, assets, bindings })
		if (checkpoints.size > MAX_CHECKPOINTS) {
			const oldest = checkpoints.keys().next().value
			if (oldest) checkpoints.delete(oldest)
		}
	}

	function getActiveShapes(): TLShape[] {
		if (!activeCheckpointId) {
			if (checkpoints.size > 0) {
				const lastKey = [...checkpoints.keys()].at(-1)!
				const entry = checkpoints.get(lastKey)!
				activeCheckpointId = lastKey
				return entry.shapes
			}
			return []
		}
		const entry = checkpoints.get(activeCheckpointId)
		const shapes = entry?.shapes ?? []
		return shapes
	}

	function getActiveAssets(): unknown[] {
		if (!activeCheckpointId) return []
		const entry = checkpoints.get(activeCheckpointId)
		return entry?.assets ?? []
	}

	function getActiveBindings(): unknown[] {
		if (!activeCheckpointId) return []
		const entry = checkpoints.get(activeCheckpointId)
		return entry?.bindings ?? []
	}

	let clientHostName: MCP_APP_HOST_NAMES | undefined

	const server = new McpServer(
		{
			name: MCP_SERVER_NAME,
			version: MCP_SERVER_VERSION,
			title: MCP_SERVER_TITLE,
			description: MCP_SERVER_DESCRIPTION,
			websiteUrl: MCP_SERVER_WEBSITE_URL,
		},
		{
			instructions: MCP_SERVER_INSTRUCTIONS,
		}
	)

	server.server.oninitialized = () => {
		const clientInfo = server.server.getClientVersion()
		const resolved = resolveMcpAppHostNameFromServerInfo(clientInfo?.name ?? '')
		if (resolved) clientHostName = resolved
	}

	const deps: ServerDeps = {
		saveCheckpoint,
		loadCheckpoint(id: string) {
			const entry = checkpoints.get(id)
			if (!entry) return null
			return { shapes: entry.shapes, assets: entry.assets, bindings: entry.bindings }
		},
		getActiveShapes,
		getActiveAssets,
		getActiveBindings,
		getActiveCheckpointId: () => activeCheckpointId,
		setActiveCheckpointId: (id: string) => {
			activeCheckpointId = id
		},
		getSessionId: () => sessionId,
		loadWidgetHtml: loadCachedCanvasWidgetHtml,
	}

	registerTools(server, deps, {
		isDev: true,
		log: console.error,
		getClientHostName: () => clientHostName,
	})

	return server
}
