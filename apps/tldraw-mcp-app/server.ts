import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TLShape } from 'tldraw'
import { registerTools, type ServerDeps } from './src/register-tools'
import { loadCachedCanvasWidgetHtml } from './src/tools/loadCachedCanvasWidgetHtml'

// --- Checkpoint store ---

const MAX_CHECKPOINTS = 200
const checkpoints = new Map<string, { shapes: TLShape[]; assets: unknown[] }>()
let activeCheckpointId: string | null = null
console.error(`[tldraw-mcp] Server module loaded — fresh state, activeCheckpointId=null`)

function saveCheckpoint(id: string, shapes: TLShape[], assets: unknown[] = []): void {
	console.error(
		`[tldraw-mcp] saveCheckpoint: id=${id}, shapes=${shapes.length}, assets=${assets.length}, existing checkpoints=${checkpoints.size}`
	)
	checkpoints.set(id, { shapes, assets })
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

// --- Server factory ---

export interface CreateServerOptions {
	/** When set, the canvas resource will include a domain in _meta.ui based on the connecting client. */
	httpDomain?: {
		openai: string
		claude: string
	}
}

export function createServer(opts?: CreateServerOptions) {
	const server = new McpServer({
		name: 'tldraw',
		version: '1.0.0',
	})

	server.server.oninitialized = () => {
		const clientInfo = server.server.getClientVersion()
		console.error(
			`[tldraw-mcp] Client connected: ${clientInfo?.name ?? 'unknown'} v${clientInfo?.version ?? '?'}`
		)
	}

	const deps: ServerDeps = {
		saveCheckpoint,
		loadCheckpoint(id: string) {
			const entry = checkpoints.get(id)
			if (!entry) return null
			return { shapes: entry.shapes, assets: entry.assets }
		},
		getActiveShapes,
		getActiveAssets,
		getActiveCheckpointId: () => activeCheckpointId,
		setActiveCheckpointId: (id: string) => {
			activeCheckpointId = id
		},
		loadWidgetHtml: loadCachedCanvasWidgetHtml,
	}

	registerTools(server, deps, {
		httpDomain: opts?.httpDomain,
		log: console.error,
	})

	return server
}
