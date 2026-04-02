import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import editorApi from '../editor-api.json'
import { WORKER_COMPATIBILITY_DATE } from '../shared/types'
import type { DynamicWorkerLoader } from '../shared/types'

const spec = {
	members: editorApi.members,
	categories: editorApi.categories,
	types: editorApi.types,
	helperCount: editorApi.helperCount,
	helpers: editorApi.helpers,
}

const SEARCH_TIMEOUT_MS = 5_000
const SEARCH_RUNNER_MODULE = 'search-runner.js'
const SEARCH_RUNNER_ENTRYPOINT = 'SearchRunner'

type SearchWorkerResult = { success: true; value: unknown } | { success: false; error: string }

function createSearchRunnerModule(code: string) {
	return `import { WorkerEntrypoint } from 'cloudflare:workers'

function serializeResult(result) {
	try {
		return JSON.parse(JSON.stringify(result))
	} catch {
		return String(result)
	}
}

export class ${SEARCH_RUNNER_ENTRYPOINT} extends WorkerEntrypoint {
	async run() {
		try {
			const spec = this.env.SPEC
			const result = await (async () => {
${code}
			})()
			return { success: true, value: serializeResult(result) }
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err),
			}
		}
	}
}
`
}

async function runSearchInDynamicWorker(loader: DynamicWorkerLoader, code: string) {
	const worker = loader.load({
		compatibilityDate: WORKER_COMPATIBILITY_DATE,
		mainModule: SEARCH_RUNNER_MODULE,
		modules: {
			[SEARCH_RUNNER_MODULE]: {
				js: createSearchRunnerModule(code),
			},
		},
		env: {
			SPEC: spec,
		},
		globalOutbound: null,
	})

	const entrypoint = worker.getEntrypoint(SEARCH_RUNNER_ENTRYPOINT) as {
		run(): Promise<SearchWorkerResult>
	}
	const result = await Promise.race([
		entrypoint.run(),
		new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error(`Search timed out after ${SEARCH_TIMEOUT_MS}ms`)),
				SEARCH_TIMEOUT_MS
			)
		),
	])

	if (!result.success) {
		throw new Error(result.error)
	}

	return result.value
}

export function registerSearchTool(
	server: McpServer,
	opts: {
		analytics?: AnalyticsEngineDataset
		loader: DynamicWorkerLoader
		log(...args: unknown[]): void
	}
) {
	server.registerTool(
		'search',
		{
			title: 'Search Editor API',
			description: `Search the tldraw Editor API spec by writing JavaScript that receives a \`spec\` object and returns a result. The spec contains: spec.members (all Editor methods/properties with name, kind, signature, description, category), spec.categories (category names), spec.types.shapes (focused shape type definitions with props), spec.types.shapeTypes (list of all shape type strings), spec.helpers (exec helper functions with descriptions, params, examples).

Examples:
- Find shape methods: return spec.members.filter(m => m.category === "shapes").map(m => ({ name: m.name, signature: m.signature }))
- Get arrow shape props: return spec.types.shapes.find(s => s.shapeType === "arrow")
- List all categories: return spec.categories
- Find a helper: return spec.helpers.find(h => h.name === "createArrowBetweenShapes")`,
			inputSchema: z.object({
				code: z
					.string()
					.describe(
						'JavaScript code that receives `spec` and returns a result. Must use `return` to produce output.'
					),
			}),
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
				destructiveHint: false,
			},
		},
		async ({ code }: { code: string }): Promise<CallToolResult> => {
			opts.analytics?.writeDataPoint({
				blobs: ['tool_called', 'search'],
			})
			opts.log('[tldraw-mcp] search called')

			try {
				const serialized = await runSearchInDynamicWorker(opts.loader, code)

				return {
					content: [{ type: 'text', text: JSON.stringify(serialized, null, 2) }],
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err)
				return {
					content: [{ type: 'text', text: `Error: ${message}` }],
					isError: true,
				}
			}
		}
	)
}
