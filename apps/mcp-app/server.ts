import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TLShape } from 'tldraw'
import { registerTools } from './src/register-tools'
import type { MCP_APP_HOST_NAMES, ServerDeps } from './src/shared/types'
import {
	MAX_CHECKPOINTS,
	MCP_SERVER_DESCRIPTION,
	MCP_SERVER_INSTRUCTIONS,
	MCP_SERVER_NAME,
	MCP_SERVER_TITLE,
	MCP_SERVER_VERSION,
	MCP_SERVER_WEBSITE_URL,
} from './src/shared/types'
import { resolveMcpAppHostName } from './src/shared/utils'
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
		console.error(
			`[tldraw-mcp] saveCheckpoint: id=${id}, shapes=${shapes.length}, assets=${assets.length}, bindings=${bindings.length}, existing checkpoints=${checkpoints.size}`
		)
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
				console.error(
					`[tldraw-mcp] getActiveShapes: activeCheckpointId was NULL, fell back to last checkpoint=${lastKey}, shapes=${entry.shapes.length}`
				)
				activeCheckpointId = lastKey
				return entry.shapes
			}
			console.error(
				`[tldraw-mcp] getActiveShapes: activeCheckpointId is NULL and no checkpoints, returning []`
			)
			return []
		}
		const entry = checkpoints.get(activeCheckpointId)
		const shapes = entry?.shapes ?? []
		console.error(
			`[tldraw-mcp] getActiveShapes: activeCheckpointId=${activeCheckpointId}, shapes=${shapes.length}, checkpoints.size=${checkpoints.size}`
		)
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
		const resolved = resolveMcpAppHostName(clientInfo?.name ?? '')
		if (resolved) clientHostName = resolved
		console.error(
			`[tldraw-mcp] Client connected: ${clientHostName ?? 'unknown'} v${clientInfo?.version ?? '?'}`
		)
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

	const httpDomain = {
		openai: process.env.MCP_DOMAIN_OPENAI ?? '',
		claude: process.env.MCP_DOMAIN_CLAUDE ?? '',
	}

	registerTools(server, deps, {
		httpDomain: httpDomain.openai || httpDomain.claude ? httpDomain : undefined,
		log: console.error,
		getClientHostName: () => clientHostName,
	})

	return server
}
