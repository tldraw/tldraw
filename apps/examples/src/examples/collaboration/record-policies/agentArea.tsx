import { useState } from 'react'
import { Editor, createShapeId, toRichText } from 'tldraw'
import { Scenario, isInside } from './scenario'

const AGENT_AREA = createShapeId('agent-area')
const HUMAN_NOTE = createShapeId('human-note')

// An agent gets the `agent` action and nothing else: it creates and changes shapes inside the
// agent area only, and never moves a shape in or out of it.
export const agentArea: Scenario = {
	id: 'agent-area',
	title: 'Agent area',
	rules:
		'The agent creates and changes shapes inside the “Agent area” frame only. People edit everything.',
	tryThis:
		'In the agent pane, press “Run agent”: it adds a note inside the frame, then tries to add one outside and to move your note. Or drag shapes yourself as the agent.',
	people: [
		{ id: 'kim', name: 'Kim', role: 'editor', actions: ['document:write'] },
		{ id: 'agent', name: 'Agent', role: 'agent', actions: ['agent'] },
		{ id: 'lee', name: 'Lee', role: 'editor', actions: ['document:write'] },
	],
	policies: {
		shape: {
			create: (ctx) => ctx.base() || (ctx.can('agent') && isInside(ctx.next, AGENT_AREA, ctx.get)),
			update: (ctx) =>
				ctx.base() ||
				(ctx.can('agent') &&
					isInside(ctx.prev, AGENT_AREA, ctx.get) &&
					isInside(ctx.next, AGENT_AREA, ctx.get)),
			delete: (ctx) => ctx.base() || (ctx.can('agent') && isInside(ctx.prev, AGENT_AREA, ctx.get)),
		},
	},
	seed(editor, person) {
		if (person.id !== 'kim' || editor.getShape(AGENT_AREA)) return
		editor.createShapes([
			{ id: AGENT_AREA, type: 'frame', x: 0, y: 0, props: { w: 400, h: 300, name: 'Agent area' } },
			{
				id: HUMAN_NOTE,
				type: 'note',
				x: 460,
				y: 0,
				props: { richText: toRichText('Kim’s note, outside the area') },
			},
		])
	},
	Controls({ editor, person }) {
		const [log, setLog] = useState('')
		if (person.id !== 'agent') return null
		return (
			<>
				<button onClick={() => setLog(runAgent(editor))}>Run agent</button>
				{log && <span className="record-policies__log">{log}</span>}
			</>
		)
	},
}

// Each step is its own change, so the editor reverts only the steps that the policy denies.
function runAgent(editor: Editor) {
	const results: string[] = []
	const step = (label: string, fn: () => void, check: () => boolean) => {
		fn()
		results.push(`${label}: ${check() ? 'done' : 'rejected'}`)
	}
	const inside = createShapeId()
	step(
		'add inside',
		() =>
			editor.createShape({
				id: inside,
				type: 'note',
				parentId: AGENT_AREA,
				x: 40 + Math.random() * 200,
				y: 60 + Math.random() * 100,
				props: { color: 'violet', richText: toRichText('From the agent') },
			}),
		() => !!editor.getShape(inside)
	)
	const outside = createShapeId()
	step(
		'add outside',
		() =>
			editor.createShape({ id: outside, type: 'note', x: 460, y: 260, props: { color: 'violet' } }),
		() => !!editor.getShape(outside)
	)
	const before = editor.getShape(HUMAN_NOTE)?.y
	step(
		'move Kim’s note',
		() => editor.updateShape({ id: HUMAN_NOTE, type: 'note', y: (before ?? 0) + 40 }),
		() => editor.getShape(HUMAN_NOTE)?.y !== before
	)
	return results.join(' · ')
}
