/**
 * An LLM tool belt over a headless tldraw editor.
 *
 * This is the shape of a canvas-editing agent: the model never sees the editor API directly.
 * Instead it calls a small set of JSON tools (the same way it would call any function-calling
 * tool), and each tool wraps the editor with three guarantees the raw API doesn't give you:
 *
 * 1. Atomicity — every mutating tool call is wrapped in a history mark and rolled back with
 *    `bailToMark` if anything throws, so a half-applied tool call can never corrupt the
 *    canvas the model is reasoning about.
 * 2. Validation surfaced as data — bad arguments AND hallucinated tool names come back as
 *    `{ ok: false, error }` for the model to read and correct, instead of crashing the loop.
 * 3. Observation — `read_canvas` returns a compact, stable text description of the canvas
 *    (ids, types, labels, bounds, directed connections), which is what the model uses
 *    instead of a screenshot.
 *
 * Run it: yarn tsx packages/headless/examples/agent-tool-belt.ts
 */
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
	Editor,
	TLArrowShape,
	TLGeoShape,
	TLNoteShape,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'
import { createHeadlessEditor } from '@tldraw/headless'
import {
	DefaultColorStyle,
	TLArrowBinding,
	TLDefaultColorStyle,
	toRichText,
} from '@tldraw/tlschema'
import { renderPlaintextFromRichText } from 'tldraw/headless-defaults'

// The JSON surface the model sees. In a real agent these become function-calling tool
// definitions; the `args` types below are what you'd express as their JSON schemas.
export type ToolCall =
	| { name: 'create_box'; args: { label: string; x: number; y: number; color?: string } }
	| { name: 'create_note'; args: { text: string; x: number; y: number; color?: string } }
	| { name: 'connect'; args: { from: string; to: string; label?: string } }
	| { name: 'arrange'; args: { ids: string[]; operation: 'align-top' | 'row' | 'column' } }
	| { name: 'delete'; args: { id: string } }
	| { name: 'read_canvas'; args?: Record<string, never> }

export type ToolResult = { ok: true; result: unknown } | { ok: false; error: string }

export class CanvasToolBelt {
	constructor(private readonly editor: Editor) {}

	execute(call: ToolCall): ToolResult {
		try {
			// Pure observations don't get a mark — in a long agent loop the undo stack would
			// otherwise fill with read_canvas marks nothing can meaningfully bail to.
			if (call.name === 'read_canvas') {
				return { ok: true, result: this.readCanvas() }
			}
			// One mark per mutating call: if the tool throws anywhere, the canvas is restored
			// to exactly the state the model last observed.
			const mark = this.editor.markHistoryStoppingPoint(`tool:${call.name}`)
			try {
				return { ok: true, result: this.run(call) }
			} catch (e) {
				this.editor.bailToMark(mark)
				throw e
			}
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : String(e) }
		}
	}

	private run(call: ToolCall): unknown {
		switch (call.name) {
			case 'create_box': {
				const { label, x, y, color = 'blue' } = call.args
				this.requireColor(color)
				const id = createShapeId()
				this.editor.createShape<TLGeoShape>({
					id,
					type: 'geo',
					x,
					y,
					props: {
						geo: 'rectangle',
						w: 180,
						h: 90,
						richText: toRichText(label),
						color,
						fill: 'semi',
					},
				})
				return { id }
			}
			case 'create_note': {
				const { text, x, y, color = 'yellow' } = call.args
				this.requireColor(color)
				const id = createShapeId()
				this.editor.createShape<TLNoteShape>({
					id,
					type: 'note',
					x,
					y,
					props: { richText: toRichText(text), color },
				})
				return { id }
			}
			case 'connect': {
				const { from, to, label } = call.args
				const arrowId = createShapeId()
				// The arrow is created before the targets are validated — deliberately, so a
				// call with a hallucinated id fails AFTER mutating and the mark's rollback is
				// what actually removes the orphaned arrow. Real tools hit mid-flight failures
				// all the time; this is the case the atomicity guarantee exists for.
				this.editor.createShape<TLArrowShape>({
					id: arrowId,
					type: 'arrow',
					x: 0,
					y: 0,
					props: label ? { richText: toRichText(label) } : {},
				})
				const fromShape = this.requireShape(from)
				const toShape = this.requireShape(to)
				// Bindings, not coordinates: the arrow now follows both shapes when anything —
				// the model, a human collaborator, an auto-layout pass — moves them later.
				this.editor.createBindings([
					{ type: 'arrow', fromId: arrowId, toId: fromShape.id, props: { terminal: 'start' } },
					{ type: 'arrow', fromId: arrowId, toId: toShape.id, props: { terminal: 'end' } },
				])
				return { id: arrowId }
			}
			case 'arrange': {
				const { ids, operation } = call.args
				const shapeIds = ids.map((id) => this.requireShape(id).id)
				switch (operation) {
					case 'align-top':
						this.editor.alignShapes(shapeIds, 'top')
						break
					case 'row':
						this.editor.stackShapes(shapeIds, 'horizontal', 48)
						break
					case 'column':
						this.editor.stackShapes(shapeIds, 'vertical', 48)
						break
					default:
						throw new Error(
							`unknown arrange operation "${operation}" — use align-top, row, or column`
						)
				}
				return { arranged: shapeIds.length }
			}
			case 'delete': {
				this.editor.deleteShape(this.requireShape(call.args.id).id)
				return { deleted: call.args.id }
			}
			default:
				// The model hallucinated a tool name. Untyped JSON reaches this at runtime even
				// though the ToolCall union can't express it — report it, never silently succeed.
				throw new Error(
					`unknown tool "${(call as { name: string }).name}" — available tools: create_box, create_note, connect, arrange, delete, read_canvas`
				)
		}
	}

	/**
	 * The model's eyes. Each arrow is reported exactly once, on the shape its `start`
	 * terminal is bound to, so `connections` are directed edges — which also means a
	 * dangling arrow (bound at one terminal or none) is deliberately absent from the
	 * outline. Text bounds come from the editor's text measurement, so what the model
	 * reads about sizes is what gets written into the document — inject an accurate
	 * `textMeasurer` if browser clients will see these shapes.
	 */
	readCanvas() {
		return this.editor
			.getCurrentPageShapesSorted()
			.filter((shape) => shape.type !== 'arrow')
			.map((shape) => {
				const bounds = this.editor.getShapePageBounds(shape.id)!
				const richText =
					'richText' in shape.props
						? (shape.props.richText as TLNoteShape['props']['richText'])
						: null
				const connections = this.editor
					.getBindingsToShape<TLArrowBinding>(shape.id, 'arrow')
					.filter((binding) => binding.props.terminal === 'start')
					.map((binding) => {
						const end = this.editor
							.getBindingsFromShape<TLArrowBinding>(binding.fromId, 'arrow')
							.find((b) => b.props.terminal === 'end')
						return end ? { via: binding.fromId, to: end.toId } : null
					})
					.filter((c): c is { via: TLShapeId; to: TLShapeId } => c !== null)
				return {
					id: shape.id,
					type: shape.type,
					text: richText ? renderPlaintextFromRichText(this.editor, richText) : '',
					x: Math.round(bounds.x),
					y: Math.round(bounds.y),
					w: Math.round(bounds.w),
					h: Math.round(bounds.h),
					connections,
				}
			})
	}

	private requireShape(id: string) {
		const shape = this.editor.getShape(id as TLShapeId)
		if (!shape) throw new Error(`no shape with id "${id}" — call read_canvas for current ids`)
		return shape
	}

	// Validation that produces a type: derive the allowed values from the SDK's own style
	// prop rather than a hardcoded list, so custom themes that extend the enum keep working.
	private requireColor(color: string): asserts color is TLDefaultColorStyle {
		const values = DefaultColorStyle.values as readonly string[]
		if (!values.includes(color)) {
			throw new Error(`"${color}" is not a tldraw color. Use one of: ${values.join(', ')}`)
		}
	}
}

export async function run(log: (message: string) => void = console.log) {
	const editor = createHeadlessEditor()
	const tools = new CanvasToolBelt(editor)

	try {
		// A scripted stand-in for a model's tool-call stream. In production these calls come
		// out of your LLM loop one at a time, each result fed back into the conversation.
		const ingest = tools.execute({
			name: 'create_box',
			args: { label: 'Ingest', x: 0, y: 0, color: 'blue' },
		})
		const process_ = tools.execute({
			name: 'create_box',
			args: { label: 'Process', x: 300, y: 40, color: 'violet' },
		})
		const publish = tools.execute({
			name: 'create_box',
			args: { label: 'Publish', x: 600, y: -30, color: 'green' },
		})
		if (!ingest.ok || !process_.ok || !publish.ok) throw new Error('setup failed')
		const ids = [ingest, process_, publish].map((r) => (r.result as { id: string }).id)

		const edge1 = tools.execute({
			name: 'connect',
			args: { from: ids[0], to: ids[1], label: 'raw events' },
		})
		const edge2 = tools.execute({
			name: 'connect',
			args: { from: ids[1], to: ids[2], label: 'daily rollup' },
		})
		if (!edge1.ok || !edge2.ok) throw new Error('connect failed during setup')
		tools.execute({
			name: 'create_note',
			args: { text: 'Rollup job runs at 06:00 UTC', x: 300, y: 220 },
		})

		// A bad call: the model hallucinated an id. `connect` has already created its arrow
		// by the time validation fails, so if the mark rollback were broken, an orphaned
		// arrow would survive — the count assertion below would catch it.
		const countBefore = editor.getCurrentPageShapes().length
		const bad = tools.execute({ name: 'connect', args: { from: ids[2], to: 'shape:nope' } })
		if (bad.ok) throw new Error('expected the bad connect to fail')
		if (editor.getCurrentPageShapes().length !== countBefore) {
			throw new Error('rollback failed: the bad call left shapes behind')
		}
		log(`bad tool call surfaced as data: ${bad.error}`)

		// A hallucinated tool name also comes back as data, not a crash or a silent success.
		const unknown = tools.execute({ name: 'summon_dragon', args: {} } as unknown as ToolCall)
		if (unknown.ok) throw new Error('expected the unknown tool to fail')
		log(`unknown tool surfaced as data: ${unknown.error}`)

		// Tidy the layout, then take the observation the model would reason over next.
		tools.execute({ name: 'arrange', args: { ids, operation: 'align-top' } })
		const outline = tools.readCanvas()
		log('final canvas outline:')
		for (const entry of outline) {
			const links = entry.connections.map((c) => ` -> ${c.to}`).join('')
			log(`  [${entry.type}] "${entry.text}" @ ${entry.x},${entry.y} ${entry.w}x${entry.h}${links}`)
		}

		const tops = ids.map((id) => editor.getShapePageBounds(id as TLShapeId)!.y)
		if (new Set(tops.map((t) => Math.round(t))).size !== 1) {
			throw new Error('align-top did not align the boxes')
		}

		// The observation must show exactly the directed pipeline the model built: one edge
		// per arrow, from its start shape — Ingest -> Process -> Publish, nothing reversed.
		const labelOf = new Map(outline.map((entry) => [entry.id as string, entry.text]))
		const edges = outline.flatMap((entry) =>
			entry.connections.map((c) => `${entry.text} -> ${labelOf.get(c.to as string)}`)
		)
		const expected = ['Ingest -> Process', 'Process -> Publish']
		if (edges.length !== 2 || !expected.every((e) => edges.includes(e))) {
			throw new Error(`read_canvas edges are wrong: ${JSON.stringify(edges)}`)
		}
		return outline
	} finally {
		editor.dispose()
	}
}

const isMain = (() => {
	if (!process.argv[1]) return false
	try {
		return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
	} catch {
		return false
	}
})()
if (isMain) {
	run().catch((e) => {
		console.error(e)
		process.exit(1)
	})
}
