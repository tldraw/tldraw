import { Editor, TLShapeId } from 'tldraw'
import { AgentAction, GhostShape, Streaming } from './actions'

// The driver seam. The ghost/staging layer doesn't care where actions come
// from — it just consumes an async stream of `Streaming<AgentAction>`. This file
// ships two drivers:
//
//   - `mockStream`: scripted scenarios that run with no API key and no network,
//     so the example works out of the box.
//   - `realStream`: an adapter that POSTs the prompt to a backend and yields the
//     actions it streams back. Wire it to your own endpoint or the agent starter
//     kit's worker (templates/agent). It is OFF by default.

export interface AgentActionStream {
	stream(input: string, editor: Editor): AsyncIterable<Streaming<AgentAction>>
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ============================================================================
// Mock driver
// ============================================================================

/** Emit a create as a partial (grows in) then a complete action. */
async function* streamCreate(
	shape: GhostShape,
	intent: string
): AsyncGenerator<Streaming<AgentAction>> {
	const partial: GhostShape = { ...shape, h: shape.h ? Math.max(10, shape.h / 3) : shape.h }
	yield { _type: 'create', complete: false, intent, shape: partial }
	await delay(110)
	yield { _type: 'create', complete: true, intent, shape }
	await delay(160)
}

function think(text: string): Streaming<AgentAction> {
	return { _type: 'think', complete: true, text }
}

async function* loginScenario(editor: Editor): AsyncGenerator<Streaming<AgentAction>> {
	const vb = editor.getViewportPageBounds()
	const x = vb.midX - 130
	const top = vb.midY - 230

	yield think('Designing a login screen…')
	await delay(250)

	yield* streamCreate(
		{ id: 'g-card', kind: 'ui', variant: 'card', x: x - 28, y: top - 28, w: 316, h: 472 },
		'Add card'
	)
	yield* streamCreate(
		{
			id: 'g-title',
			kind: 'ui',
			variant: 'heading',
			x,
			y: top,
			w: 260,
			h: 40,
			text: 'Welcome back',
		},
		'Add heading'
	)
	yield* streamCreate(
		{ id: 'g-email', kind: 'ui', variant: 'input', x, y: top + 72, w: 260, h: 48, text: 'Email' },
		'Add email field'
	)
	yield* streamCreate(
		{
			id: 'g-pass',
			kind: 'ui',
			variant: 'input',
			x,
			y: top + 136,
			w: 260,
			h: 48,
			text: 'Password',
		},
		'Add password field'
	)
	yield* streamCreate(
		{
			id: 'g-remember',
			kind: 'ui',
			variant: 'checkbox',
			x,
			y: top + 196,
			w: 260,
			h: 28,
			text: 'Remember me',
		},
		'Add remember-me'
	)
	yield* streamCreate(
		{
			id: 'g-btn',
			kind: 'ui',
			variant: 'button',
			x,
			y: top + 240,
			w: 260,
			h: 50,
			text: 'Sign in',
			color: 'violet',
		},
		'Add sign-in button'
	)
	yield* streamCreate(
		{
			id: 'g-help',
			kind: 'ui',
			variant: 'text',
			x,
			y: top + 308,
			w: 260,
			h: 24,
			text: 'Forgot password?',
		},
		'Add helper link'
	)
}

async function* flowchartScenario(editor: Editor): AsyncGenerator<Streaming<AgentAction>> {
	const vb = editor.getViewportPageBounds()
	const cx = vb.midX
	const top = vb.midY - 200

	yield think('Sketching a flowchart…')
	await delay(250)

	yield* streamCreate(
		{
			id: 'f-start',
			kind: 'ellipse',
			x: cx - 80,
			y: top,
			w: 160,
			h: 80,
			text: 'Start',
			color: 'green',
		},
		'Add start node'
	)
	yield* streamCreate(
		{
			id: 'f-step',
			kind: 'rectangle',
			x: cx - 90,
			y: top + 150,
			w: 180,
			h: 90,
			text: 'Do the thing',
			color: 'blue',
		},
		'Add step'
	)
	yield* streamCreate(
		{
			id: 'f-end',
			kind: 'ellipse',
			x: cx - 80,
			y: top + 300,
			w: 160,
			h: 80,
			text: 'Done',
			color: 'red',
		},
		'Add end node'
	)
	yield {
		_type: 'create',
		complete: true,
		intent: 'Connect start to step',
		shape: {
			id: 'f-a1',
			kind: 'arrow',
			x: cx,
			y: top + 80,
			end: { x: cx, y: top + 150 },
			color: 'black',
		},
	}
	await delay(160)
	yield {
		_type: 'create',
		complete: true,
		intent: 'Connect step to end',
		shape: {
			id: 'f-a2',
			kind: 'arrow',
			x: cx,
			y: top + 240,
			end: { x: cx, y: top + 300 },
			color: 'black',
		},
	}
	await delay(160)
}

async function* tidyScenario(editor: Editor): AsyncGenerator<Streaming<AgentAction>> {
	const shapes = editor.getCurrentPageShapes()
	if (shapes.length === 0) {
		yield think('Nothing on the canvas yet — accept a layout first, then ask me to tidy it.')
		return
	}

	yield think('Reviewing the canvas…')
	await delay(250)

	// Propose recoloring the first few shapes, and deleting the last one.
	for (const shape of shapes.slice(0, 3)) {
		yield {
			_type: 'update',
			complete: true,
			shapeId: shape.id as TLShapeId,
			changes: { color: 'violet' },
			intent: 'Recolor to violet',
		}
		await delay(180)
	}
	if (shapes.length > 3) {
		yield {
			_type: 'delete',
			complete: true,
			shapeId: shapes[shapes.length - 1].id as TLShapeId,
			intent: 'Remove stray shape',
		}
	}
}

function pickScenario(input: string) {
	const text = input.toLowerCase()
	if (/(flow|chart|diagram|graph|process)/.test(text)) return flowchartScenario
	if (/(tidy|clean|recolor|review|fix|organi[sz]e)/.test(text)) return tidyScenario
	return loginScenario
}

export const mockStream: AgentActionStream = {
	async *stream(input, editor) {
		yield* pickScenario(input)(editor)
	},
}

// ============================================================================
// Real driver (off by default)
// ============================================================================
//
// Point this at a backend that turns a prompt into a stream of AgentActions.
// The agent starter kit's worker (templates/agent) is a good reference for the
// server side. We expect newline-delimited JSON, one AgentAction per line.
//
// To use it: set the endpoint below and pass `realStream` instead of
// `mockStream` in AgentGhostShapesExample.tsx. This example never handles API
// keys directly — the key lives on your server.

const REAL_STREAM_ENDPOINT = '' // e.g. 'http://localhost:5173/stream'

export const realStream: AgentActionStream = {
	async *stream(input) {
		if (!REAL_STREAM_ENDPOINT) {
			throw new Error(
				'realStream is not configured. Set REAL_STREAM_ENDPOINT in agentStream.ts to your backend, then swap mockStream -> realStream in the example.'
			)
		}

		const res = await fetch(REAL_STREAM_ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ message: input }),
		})
		if (!res.body) throw new Error('No response body from agent endpoint')

		const reader = res.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			buffer += decoder.decode(value, { stream: true })
			const lines = buffer.split('\n')
			buffer = lines.pop() ?? ''
			for (const line of lines) {
				const trimmed = line.trim()
				if (trimmed) yield JSON.parse(trimmed) as Streaming<AgentAction>
			}
		}
		if (buffer.trim()) yield JSON.parse(buffer.trim()) as Streaming<AgentAction>
	},
}
