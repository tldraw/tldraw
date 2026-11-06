import Anthropic from '@anthropic-ai/sdk'
import { type Editor, type TLArrowBinding } from 'tldraw'
import { z } from 'zod'
import { fromShapeId } from '../actions'
import { createCanvasOpsReceiver } from '../index'
import { OpsBatchSchema, type ApplyOpsResult } from '../schema'

export const EVAL_MODEL = process.env.CANVAS_OPS_EVAL_MODEL ?? 'claude-opus-5-5'
const EFFORT = (process.env.CANVAS_OPS_EVAL_EFFORT ?? 'medium') as 'low' | 'medium' | 'high'
const MAX_TURNS = 8

const SYSTEM = `You edit a tldraw whiteboard for a user by calling the apply_ops tool. You cannot see the canvas; you get a list of its shapes (page coordinates, y grows downward) before you start and again after every apply_ops call.

Ops (each batch is one undo step; a failing op is reported and the rest still run):
- add: create a label (text), note, box, ellipse, or shape (any geo). Place it with \`at\` (top-left) or relative to a \`target\` with \`relation\` (above, below, left_of, right_of, inside, centered_on), \`gap\`, \`align\`. Boxes size themselves to their text unless you give w/h. A box's text is its label, drawn inside it; use \\n for line breaks.
- place: move an existing shape (\`at\`, or \`relation\` + \`target\`) and/or change its w, h, text, and style.
- label: attach a text label to a shape or a page point, optionally with an arrow.
- connect: an arrow between two shapes (bound to them) or points. Reusing an existing arrow's id replaces that arrow.
- rename (change text; fit: widen, shrink_text, or wrap), restyle (color/fill/dash/size, or \`like\` another shape), resize (w/h/scale, anchor), remove, untangle (spread overlapping shapes near anchors).
- path: a polyline or curve through page points; closed: true makes a fillable outline; smooth: true curves it.
- duplicate: copy a shape to a new position.

Refer to shapes by id, or by {text}, {description}, {selected: true}, or {created: "last" | index}. Give new shapes short ids so later ops can refer to them.

A card's words, title and body alike, belong in the box's own text. Separate labels laid over a box don't move or resize with it.

Keep shapes from overlapping unless one is meant to sit inside another, and keep text inside the shape that contains it. Change only what the request asks for. If the request is ambiguous or impossible, make no edits and say so. When you are done, reply with one or two sentences saying what you did.`

const tool: Anthropic.Beta.BetaTool = {
	name: 'apply_ops',
	description: 'Apply a batch of canvas ops. Returns what each op did and the updated shape list.',
	input_schema: z.toJSONSchema(OpsBatchSchema, {
		target: 'draft-7',
	}) as Anthropic.Beta.BetaTool.InputSchema,
}

/** The board as the model sees it: one line per shape. */
export function describeBoard(editor: Editor): string {
	const lines: string[] = []
	for (const shape of editor.getCurrentPageShapesSorted()) {
		const b = editor.getShapePageBounds(shape)
		if (!b) continue
		const props = shape.props as Record<string, unknown>
		const parts = [
			fromShapeId(shape.id),
			props.geo ? `${shape.type}/${props.geo}` : shape.type,
			`x=${Math.round(b.x)} y=${Math.round(b.y)} w=${Math.round(b.w)} h=${Math.round(b.h)}`,
		]
		const text = editor.getShapeUtil(shape).getText(shape)
		if (text) parts.push(`text=${JSON.stringify(text)}`)
		for (const key of ['color', 'fill', 'size'] as const) {
			if (props[key] !== undefined) parts.push(`${key}=${props[key]}`)
		}
		if (shape.type === 'arrow') {
			for (const binding of editor.getBindingsFromShape<TLArrowBinding>(shape, 'arrow')) {
				parts.push(`${binding.props.terminal}=${fromShapeId(binding.toId)}`)
			}
		}
		lines.push(parts.join(' '))
	}
	return lines.length ? lines.join('\n') : '(the board is empty)'
}

export interface AgentRun {
	answer: string
	batches: Array<{ input: unknown; result?: ApplyOpsResult; error?: string }>
	turns: number
	usage: { input: number; output: number; cacheRead: number; cacheWrite: number }
	costUsd: number
	stopReason: string | null
	messages: Anthropic.Beta.BetaMessageParam[]
}

/** Opus 5.5 rates, $ per million tokens; other models are priced the same here, so cost is approximate. */
const PRICE = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 }

export async function runAgent(editor: Editor, task: string): Promise<AgentRun> {
	// vitest's jsdom environment defines `window`, which the SDK reads as a browser. This only
	// runs in node, with the key from the environment.
	const client = new Anthropic({ dangerouslyAllowBrowser: true })
	const receiver = createCanvasOpsReceiver(editor)
	const messages: Anthropic.Beta.BetaMessageParam[] = [
		{ role: 'user', content: `${task}\n\nThe board:\n${describeBoard(editor)}` },
	]
	const run: AgentRun = {
		answer: '',
		batches: [],
		turns: 0,
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		costUsd: 0,
		stopReason: null,
		messages,
	}

	for (; run.turns < MAX_TURNS; run.turns++) {
		const response = await client.beta.messages.create({
			model: EVAL_MODEL,
			max_tokens: 16000,
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			thinking: { type: 'adaptive' },
			output_config: { effort: EFFORT },
			cache_control: { type: 'ephemeral' },
			system: SYSTEM,
			tools: [tool],
			messages,
		})
		run.usage.input += response.usage.input_tokens
		run.usage.output += response.usage.output_tokens
		run.usage.cacheRead += response.usage.cache_read_input_tokens ?? 0
		run.usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0
		run.stopReason = response.stop_reason
		messages.push({ role: 'assistant', content: response.content })
		run.answer = response.content
			.flatMap((block) => (block.type === 'text' ? [block.text] : []))
			.join('\n')
			.trim()
		if (response.stop_reason !== 'tool_use') break

		const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
		for (const block of response.content) {
			if (block.type !== 'tool_use') continue
			if (block.name !== tool.name) {
				results.push({
					type: 'tool_result',
					tool_use_id: block.id,
					is_error: true,
					content: `Unknown tool ${block.name}`,
				})
				continue
			}
			try {
				const result = await receiver.applyBatch(block.input, { runId: 'eval' })
				run.batches.push({ input: block.input, result })
				results.push({
					type: 'tool_result',
					tool_use_id: block.id,
					content: report(editor, result),
				})
			} catch (e) {
				const error = e instanceof z.ZodError ? z.prettifyError(e) : (e as Error).message
				run.batches.push({ input: block.input, error })
				results.push({
					type: 'tool_result',
					tool_use_id: block.id,
					is_error: true,
					content: `Invalid ops, nothing applied:\n${error}`,
				})
			}
		}
		messages.push({ role: 'user', content: results })
	}

	const { input, output, cacheRead, cacheWrite } = run.usage
	run.costUsd =
		(input * PRICE.input +
			output * PRICE.output +
			cacheRead * PRICE.cacheRead +
			cacheWrite * PRICE.cacheWrite) /
		1_000_000
	return run
}

function report(editor: Editor, result: ApplyOpsResult): string {
	const lines = result.results.map(
		(r) =>
			`- ${r.index} ${r.op}: ${r.ok ? r.message : `FAILED: ${r.message}`}${r.adjusted ? ` (adjusted: ${r.adjusted})` : ''}`
	)
	return `Applied ${result.applied}/${result.results.length} ops.\n${lines.join('\n')}\n\nThe board now:\n${describeBoard(editor)}`
}
