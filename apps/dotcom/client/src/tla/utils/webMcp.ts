import { CANVAS_OPS_BATCH_JSON_SCHEMA, CANVAS_OPS_GUIDE } from '@tldraw/dotcom-shared'
import type { TabRenderDeclineReason } from '@tldraw/dotcom-shared'
import { Box, type Editor } from 'tldraw'
import { z } from 'zod'
import { trackEvent } from '../../utils/analytics'
import { describeShapes, fromShapeId } from './canvas-ops/actions'
import { applyBatchInTurn, getApplyRefusal } from './tabRender'

// WebMCP (https://webmachinelearning.github.io/webmcp/) lets a page hand tools to the browser's own
// agent. Only the part of the API this file calls is typed here: it is a draft behind an origin
// trial and has already been renamed once, so nothing else should come to depend on its shape.
interface ToolResult {
	content: [{ type: 'text'; text: string }]
	isError?: boolean
}

interface ModelContextTool {
	name: string
	title: string
	description: string
	inputSchema: object
	execute(input: Record<string, unknown>): Promise<ToolResult>
	annotations: {
		readOnlyHint?: boolean
		untrustedContentHint?: boolean
	}
}

interface ModelContext {
	registerTool(tool: ModelContextTool, options: { signal: AbortSignal }): Promise<void>
}

export const READ_PAGE_TOOL_NAME = 'read_page'
export const APPLY_OPS_TOOL_NAME = 'apply_ops'

/** Past this a page's shapes stop fitting in a model's context alongside everything else. */
const MAX_SHAPES_PER_READ = 500

const ReadPageInputSchema = z.object({
	scope: z.enum(['page', 'viewport', 'selection']).default('page'),
})

function toolJson(value: unknown): ToolResult {
	return { content: [{ type: 'text', text: JSON.stringify(value) }] }
}

// Returned, never thrown: a rejected `execute` reaches the agent as a bare failure with no message,
// so it couldn't tell a board it may not edit from ops it should fix and send again.
function toolError(message: string): ToolResult {
	return { content: [{ type: 'text', text: message }], isError: true }
}

function readPage(editor: Editor, input: Record<string, unknown>): ToolResult {
	const parsed = ReadPageInputSchema.safeParse(input)
	if (!parsed.success) return toolError(z.prettifyError(parsed.error))
	const { scope } = parsed.data

	let shapes = describeShapes(editor)
	const viewport = editor.getViewportPageBounds()
	const selectedShapeIds = editor.getSelectedShapeIds().map(fromShapeId)
	if (scope === 'viewport') {
		shapes = shapes.filter((s) => viewport.collides(new Box(s.x, s.y, s.w, s.h)))
	} else if (scope === 'selection') {
		const selected = new Set(selectedShapeIds)
		shapes = shapes.filter((s) => selected.has(s.id))
	}

	const currentPage = editor.getCurrentPage()
	return toolJson({
		page: currentPage.name,
		otherPages: editor
			.getPages()
			.filter((page) => page.id !== currentPage.id)
			.map((page) => page.name),
		canEdit: !editor.getIsReadonly(),
		viewport: {
			x: Math.round(viewport.x),
			y: Math.round(viewport.y),
			w: Math.round(viewport.w),
			h: Math.round(viewport.h),
		},
		selectedShapeIds,
		shapeCount: shapes.length,
		shapes: shapes.slice(0, MAX_SHAPES_PER_READ),
		...(shapes.length > MAX_SHAPES_PER_READ && {
			truncated: `Only the first ${MAX_SHAPES_PER_READ} shapes are listed. Narrow the read with scope "viewport" or "selection".`,
		}),
	})
}

const REFUSALS: Partial<Record<TabRenderDeclineReason, string>> = {
	read_only: 'The user can only view this board, not edit it.',
	tab_hidden: 'The board is in a background tab. Ask the user to switch to it.',
	busy: 'The user is in the middle of a drag. Try again in a moment.',
}

async function applyOps(
	editor: Editor,
	input: Record<string, unknown>,
	userId: string | undefined
): Promise<ToolResult> {
	const outcome = await applyBatchInTurn(
		editor,
		{ ops: input.ops, attribution: { userId, runId: input.runId } },
		() => getApplyRefusal(editor, editor.getCurrentPageId())
	)
	switch (outcome.status) {
		case 'applied':
			return toolJson({ page: editor.getCurrentPage().name, ...outcome.result })
		case 'invalid_ops':
			return toolError(`Nothing was applied, the ops are invalid:\n${outcome.detail}`)
		case 'apply_failed':
			return toolError(
				`The batch failed partway and some ops may have been applied. Call ${READ_PAGE_TOOL_NAME} before sending anything again.`
			)
		case 'refused':
			return toolError(REFUSALS[outcome.reason] ?? 'The board cannot be edited right now.')
	}
}

function getTools(editor: Editor, opts: WebMcpToolOptions): ModelContextTool[] {
	const tracked = (
		name: string,
		run: (input: Record<string, unknown>) => ToolResult | Promise<ToolResult>
	) => {
		return async (input: Record<string, unknown>) => {
			const result = await run(input)
			trackEvent('webmcp-tool-call', { tool: name, is_error: !!result.isError })
			return result
		}
	}

	const tools: ModelContextTool[] = [
		{
			name: READ_PAGE_TOOL_NAME,
			title: 'Read the tldraw board',
			description: `Read the tldraw board page the user has open: every shape's id, type, position, size and text in page coordinates (y grows downward), plus the user's viewport and selection. Call this before editing so new shapes land in free space and refs point at real shapes.`,
			inputSchema: {
				type: 'object',
				properties: {
					scope: {
						type: 'string',
						enum: ['page', 'viewport', 'selection'],
						description:
							"Which shapes to list: the whole page (the default), only those in the user's viewport, or only those the user has selected.",
					},
				},
			},
			execute: tracked(READ_PAGE_TOOL_NAME, (input) => readPage(editor, input)),
			annotations: { readOnlyHint: true, untrustedContentHint: true },
		},
	]

	// Left out rather than registered to refuse: every tool an agent is shown costs it context.
	if (opts.canEdit) {
		tools.push({
			name: APPLY_OPS_TOOL_NAME,
			title: 'Edit the tldraw board',
			description: `Edit the tldraw board page the user has open by applying a batch of canvas ops. The whole batch is one undo step for the user.\n\n${CANVAS_OPS_GUIDE}`,
			inputSchema: {
				type: 'object',
				properties: {
					ops: {
						...CANVAS_OPS_BATCH_JSON_SCHEMA.properties.ops,
						minItems: 1,
						description: 'The ops to apply, in order.',
					},
					runId: {
						type: 'string',
						description:
							'Any string. Reuse it across calls so {created} refs reach shapes made in earlier calls.',
					},
				},
				required: ['ops'],
			},
			execute: tracked(APPLY_OPS_TOOL_NAME, (input) => applyOps(editor, input, opts.userId)),
			// The result quotes shape text, which anyone the board is shared with can have written.
			annotations: { readOnlyHint: false, untrustedContentHint: true },
		})
	}

	return tools
}

export interface WebMcpToolOptions {
	canEdit: boolean
	/** Stamped on the shapes a batch touches, as the hosted MCP server does. */
	userId?: string
}

/**
 * Offer this editor's board to the browser's agent as WebMCP tools. Does nothing where the browser has
 * no WebMCP. Returns a function that takes the tools away again.
 */
export function registerWebMcpTools(editor: Editor, opts: WebMcpToolOptions): () => void {
	const modelContext = (document as { modelContext?: ModelContext }).modelContext
	if (!modelContext) return () => {}

	const controller = new AbortController()
	for (const tool of getTools(editor, opts)) {
		modelContext.registerTool(tool, { signal: controller.signal }).catch((error) => {
			// Aborting is how the tools are unregistered, and a page embedding tldraw.com without
			// allow="tools" is refused; neither is a fault.
			if (controller.signal.aborted || error?.name === 'NotAllowedError') return
			console.error(`Could not register the ${tool.name} WebMCP tool`, error)
		})
	}
	return () => controller.abort()
}
