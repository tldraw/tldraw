import OpenAI from 'openai'

import {
	Editor,
	GeoShapeGeoStyle,
	TLEditorComponents,
	TLGeoShape,
	TLTextShape,
	Tldraw,
	Vec2d,
	createShapeId,
	stopEventPropagation,
	uniqueId,
	useEditor,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import aistuff from './aistuff'

const { log: oklog } = console

const API_KEY = process.env.VITE_OPENAI_API_KEY!

const openai = new OpenAI({
	apiKey: API_KEY, // defaults to process.env["OPENAI_API_KEY"]
	dangerouslyAllowBrowser: true,
})

function OnTheCanvas() {
	return null
}

function InFrontOfTheCanvas() {
	const editor = useEditor()

	const [state, setState] = useState<'ready' | 'working'>('ready')

	const [assistant, setAssistant] = useState<OpenAI.Beta.Assistants.Assistant | null>(null)
	const [thread, setThread] = useState<OpenAI.Beta.Threads.Thread | null>(null)

	const setup = useCallback(async function setup() {
		const assistant = await openai.beta.assistants.create({
			instructions: aistuff.prompt,
			model: 'gpt-4-32k-0613',
			tools: [
				{
					type: 'function',
					function: {
						name: 'getSequence',
						description: 'Get the sequence of commands based on the prompt.',
						parameters: {
							type: 'object',
							properties: {
								response: {
									type: 'string',
									description:
										'The sequence of commands to run in order to achieve the desired outcome.',
								},
							},
							required: ['prompt'],
						},
					},
				},
			],
		})
		setAssistant(assistant)

		const thread = await openai.beta.threads.create()
		setThread(thread)
	}, [])

	useEffect(() => {
		if (!assistant) {
			setup()
		}
	}, [assistant, setup])

	const handleButtonClick = useCallback(
		async function handleButtonClick() {
			// parseSequence(editor, test2)
			// return

			if (!thread || !assistant) return

			const myPrompt = rInput.current?.value

			try {
				setState('working')

				const { x, y, w, h } = editor.getViewportPageBounds()
				const prompt = `
Return a sequence that will achieve the following action: ${myPrompt}

Here's some info to help you: 

The current viewport is at x=${x.toFixed(0)} y=${y.toFixed(0)} w=${w.toFixed(0)} h=${h.toFixed(0)}

${getCurrentPageDescription(editor)}`

				await openai.beta.threads.messages.create(thread.id, {
					role: 'user',
					content: prompt,
				})

				oklog(prompt)

				const run = await openai.beta.threads.runs.create(thread.id, {
					assistant_id: assistant.id,
				})

				let i = 0
				while (i < 20000) {
					oklog('waiting...', i)
					await new Promise((resolve) => setTimeout(resolve, 1000))
					const status = await openai.beta.threads.runs.retrieve(thread.id, run.id)

					if (status.status === 'completed') {
						const messages = await openai.beta.threads.messages.list(thread.id)

						const mostRecent = messages.data[0]
						const content = mostRecent.content[0]
						if (content.type === 'text') {
							const text = content.text.value
							oklog(text)
							parseSequence(editor, text)
						}
						setState('ready')
						return
					} else if (status.status === 'failed') {
						setState('ready')
						return
					}
					i += 1000
				}

				await openai.beta.threads.runs.cancel(thread.id, run.id)

				// didn't work
				setState('ready')
			} catch (e) {
				console.error(e)
			}
		},
		[editor, assistant, thread]
	)

	const handleRestart = useCallback(async () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		setup()
	}, [editor, setup])

	const rInput = useRef<HTMLInputElement>(null)

	return (
		<div
			style={{
				position: 'absolute',
				width: 600,
				top: 100,
				left: 16,
				zIndex: 10000,
				pointerEvents: 'all',
				display: 'flex',
			}}
			onPointerDown={stopEventPropagation}
		>
			<input
				ref={rInput}
				style={{ flexGrow: 2, fontSize: 20 }}
				defaultValue="Create a box at the center of the viewport."
			/>
			<button onClick={handleButtonClick}>{state === 'ready' ? 'Send' : 'Working...'}</button>
			<button onClick={handleRestart}>Restart</button>
		</div>
	)
}

const components: TLEditorComponents = {
	InFrontOfTheCanvas,
	OnTheCanvas,
}

export default function GPTExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example_temp" components={components} />
		</div>
	)
}

// const test = `
// \`\`\`sequence
// TOOL draw;
// MOVE 50 -50;
// DOWN;
// MOVE 25 -37.5;
// MOVE 0 0;
// MOVE 25 37.5;
// MOVE 50 50;
// UP;
// \`\`\``

// const test2 = `
// Sure, to do this, major steps involve:

// 1. Calculating the size of each box.
// 2. Calculating the coordinate for the top-left corner of each box in the 3x3 grid as (x,y).

// Given the viewport w=971 h=609, proposing 3 boxes horizontally and vertically, we can make each box of size w/3 by h/3.

// Let's start drawing:

// \`\`\`sequence
// TOOL box;
// MOVE 314 137; DOWN; MOVE 628 411; UP;
// MOVE 628 137; DOWN; MOVE 942 411; UP;
// MOVE 942 137; DOWN; MOVE 1256 411; UP;
// MOVE 314 411; DOWN; MOVE 628 685; UP;
// MOVE 628 411; DOWN; MOVE 942 685; UP;
// MOVE 942 411; DOWN; MOVE 1256 685; UP;
// \`\`\`
// Note: All positions and dimensions are approximations considering the viewport size of 971x609.

// Also, if you need boxes with specific dimensions, it might be needed to adjust the viewport size accordingly.

// `

async function parseSequence(editor: Editor, text: string) {
	const biglines = text.split('\n')
	let isInSequence = false
	for (const bigline of biglines) {
		const lines = bigline.split(';').map((l) => l.trim())
		for (const line of lines) {
			if (!line) continue
			await new Promise((resolve) => setTimeout(resolve, 32))

			if (!isInSequence) {
				if (line.startsWith('```')) {
					editor.mark(uniqueId())
					isInSequence = true
					continue
				}
			} else {
				if (line.startsWith('```')) {
					isInSequence = false
					continue
				}

				if (line.startsWith('DELETE')) {
					editor.deleteShapes(editor.getSelectedShapeIds())
					continue
				}

				if (line.startsWith('LABEL')) {
					const regex = /LABEL "(.*)"/
					const match = line.match(regex)
					if (!match) throw Error('Could not parse label')

					const [, text] = match
					editor.batch(() => {
						editor.setCurrentTool('text')

						const { x, y } = editor.inputs.currentPagePoint
						const shapeId = createShapeId()
						editor.createShape({
							id: shapeId,
							type: 'text',
							x,
							y,
							props: {
								text,
							},
						})
						const bounds = editor.getShapePageBounds(shapeId)!
						editor.updateShape({
							id: shapeId,
							type: 'text',
							x: x - bounds.w / 2,
							y: y - bounds.h / 2,
						})
					})
				}

				if (line.startsWith('TOOL')) {
					// extract the tool name from "TOOL box;"
					const regex = /TOOL (.*)/
					const match = line.match(regex)
					if (!match) throw Error('Could not parse tool')

					const [, tool] = match

					switch (tool) {
						case 'select': {
							editor.setCurrentTool('select')
							break
						}
						case 'arrow': {
							editor.setCurrentTool('arrow')
							break
						}
						case 'draw': {
							editor.setCurrentTool('draw')
							break
						}
						case 'box': {
							editor.updateInstanceState(
								{
									stylesForNextShape: {
										...editor.getInstanceState().stylesForNextShape,
										[GeoShapeGeoStyle.id]: 'rectangle',
									},
								},
								{ ephemeral: true }
							)
							editor.setCurrentTool('geo')
							break
						}
						case 'pill':
						case 'diamond':
						case 'ellipse':
						case 'cloud':
						case 'star': {
							editor.updateInstanceState(
								{
									stylesForNextShape: {
										...editor.getInstanceState().stylesForNextShape,
										[GeoShapeGeoStyle.id]: tool,
									},
								},
								{ ephemeral: true }
							)
							editor.setCurrentTool('geo')
							break
						}
					}
					continue
				}

				if (line.startsWith('DOWN')) {
					// extract the x and y from "MOVE 50 50;"
					const { x, y } = editor.inputs.currentScreenPoint

					editor.dispatch({
						type: 'pointer',
						name: 'pointer_down',
						point: { x, y },
						target: 'canvas',
						pointerId: 1,
						button: 0,
						isPen: false,
						shiftKey: false,
						altKey: false,
						ctrlKey: false,
					})
					continue
				}

				if (line.startsWith('UP')) {
					// extract the x and y from "MOVE 50 50;"
					const { x, y } = editor.inputs.currentScreenPoint

					editor.dispatch({
						type: 'pointer',
						name: 'pointer_up',
						point: { x, y },
						target: 'canvas',
						pointerId: 1,
						button: 0,
						isPen: false,
						shiftKey: false,
						altKey: false,
						ctrlKey: false,
					})

					await new Promise((resolve) => setTimeout(resolve, 450))
					continue
				}

				if (line.startsWith('MOVE')) {
					// extract the x and y from "MOVE 50 50;"
					const regex = /MOVE (.*) (.*)/
					const match = line.match(regex)
					if (!match) throw Error('Could not move')

					// convert from page to screen
					const [, px, py] = match
					const next = editor.pageToScreen({ x: eval(px), y: eval(py) })

					const curr = editor.inputs.currentScreenPoint
					const dist = Vec2d.Dist(curr, next)
					const steps = Math.ceil(dist / 16)

					for (let i = 0; i < steps; i++) {
						await new Promise((resolve) => setTimeout(resolve, 16))
						editor.dispatch({
							type: 'pointer',
							name: 'pointer_move',
							point: Vec2d.Lrp(curr, next, i / steps),
							target: 'canvas',
							pointerId: 1,
							button: 0,
							isPen: false,
							shiftKey: false,
							altKey: false,
							ctrlKey: false,
						})
					}
					continue
				}
			}
		}
	}
}

function getCurrentPageDescription(editor: Editor) {
	const shapes = editor.getCurrentPageShapesSorted()
	if (shapes.length === 0) {
		return "There are no shapes on the current page. It's a blank page."
	}

	let result = `There are ${shapes.length} shapes on the current page. Starting from the bottom and working our way up, they are:`

	for (const shape of shapes) {
		const pageBounds = editor.getShapePageBounds(shape)!
		result += `\n- A ${
			shape.type === 'geo' ? `geo (${(shape as TLGeoShape).props.geo})` : shape.type
		} shape at x=${pageBounds.x.toFixed(0)} y=${pageBounds.y.toFixed(
			0
		)} width=${pageBounds.w.toFixed(0)} height=${pageBounds.h.toFixed(0)}`

		if (shape.type === 'text') {
			result += ` with the text "${(shape as TLTextShape).props.text}"`
		} else {
			if ('text' in shape.props && shape.props.text) {
				result += ` with the label "${(shape as TLGeoShape).props.text}"`
			}
		}
	}

	return result
}
