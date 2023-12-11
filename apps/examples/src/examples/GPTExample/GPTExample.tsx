import OpenAI from 'openai'

import {
	EASINGS,
	Editor,
	GeoShapeGeoStyle,
	TLEditorComponents,
	TLGeoShape,
	TLKeyboardEventInfo,
	TLTextShape,
	Tldraw,
	Vec2d,
	VecLike,
	createShapeId,
	stopEventPropagation,
	uniqueId,
	useEditor,
	useLocalStorageState,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useEffect, useRef, useState } from 'react'

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
	const [text, setText] = useLocalStorageState(
		'gpt input',
		'Create a box at the center of the viewport.'
	)

	const [assistant, setAssistant] = useState<OpenAI.Beta.Assistants.Assistant | null>(null)
	const [thread, setThread] = useState<OpenAI.Beta.Threads.Thread | null>(null)

	const setup = useCallback(async function setup() {
		// const assistant = await openai.beta.assistants.retrieve(process.env.VITE_ASSISTANT_ID!)

		const prompt = await fetch('./prompt.md').then((r) => r.text())
		console.log(prompt)
		const assistant = await openai.beta.assistants.update(process.env.VITE_ASSISTANT_ID!, {
			instructions: prompt,
			model: 'gpt-4-32k-0613',
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
			// parseSequence(editor, test3)
			// return

			if (!thread || !assistant) return

			const myPrompt = rInput.current?.value

			try {
				setState('working')

				const { x, y, w, h } = editor.getViewportPageBounds()
				const prompt = `Current viewport: 
	x: ${x.toFixed(0)} 
	y: ${y.toFixed(0)} 
	w: ${w.toFixed(0)} 
	h: ${h.toFixed(0)}

Current page:
${getCurrentPageDescription(editor)}

Prompt:
${myPrompt}
`

				await openai.beta.threads.messages.create(thread.id, {
					role: 'user',
					content: prompt,
				})

				oklog(prompt)

				const run = await openai.beta.threads.runs.create(thread.id, {
					assistant_id: assistant.id,
				})

				const start_time = Date.now()

				// eslint-disable-next-line no-constant-condition
				while (true) {
					await new Promise((resolve) => setTimeout(resolve, 500))

					const duration = Date.now() - start_time

					// Break after 30 seconds
					if (duration > 30 * 1000) {
						oklog('Cancelling')
						await openai.beta.threads.runs.cancel(thread.id, run.id)
						setState('ready')
						break
					}

					const runningRun = await openai.beta.threads.runs.retrieve(thread.id, run.id)

					switch (runningRun.status) {
						case 'requires_action': {
							oklog(runningRun)
							oklog('requires action')
							setState('ready')
							return
						}
						case 'expired': {
							oklog(runningRun)
							oklog('expired')
							setState('ready')
							return
						}
						case 'failed': {
							oklog(runningRun)
							oklog('failed', runningRun.last_error)
							setState('ready')
							return
						}
						case 'completed': {
							const messages = await openai.beta.threads.messages.list(thread.id)
							const mostRecent = messages.data[0]
							oklog(mostRecent)
							for (const content of mostRecent.content) {
								if (content.type === 'text') {
									const text = content.text.value
									oklog(text)
									parseSequence(editor, text)
								}
							}
							setState('ready')
							return
						}
					}
				}
				// didn't work
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
				top: 64,
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
				value={text}
				onChange={(e) => setText(e.currentTarget.value)}
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

const test3 = `\`\`\`sequence
// select the bottom shape
TOOL select; 
CLICK -836 126;

// move the shape to desired location for bottom of snowman
TOOL select; 
DRAG -836 126 -650 100;

// select the middle shape
TOOL select; 
CLICK -630 94;

// move the shape to align center with bottom shape and place on top
TOOL select; 
DRAG -630 94 -650 50;

// select the top shape
TOOL select; 
CLICK -313 -71.5;

// move the shape to align center with middle shape and place on top
TOOL select; 
DRAG -313 -71.5 -650 10;
\`\`\``

async function parseSequence(editor: Editor, text: string) {
	const biglines = text.split('\n')
	let isInSequence = false
	for (const bigline of biglines) {
		// Skip empty lines and comments
		if (!bigline || bigline.startsWith('// ')) continue

		// Split multiple commands per line
		const lines = bigline.split(';').map((l) => l.trim())

		for (const command of lines) {
			// Skip empty lines and comments
			if (!command || command.startsWith('// ')) continue

			if (!isInSequence) {
				if (command.startsWith('```')) {
					editor.mark(uniqueId())
					isInSequence = true
					continue
				}
			} else {
				if (command.startsWith('```')) {
					isInSequence = false
					continue
				}

				// Wait just a bit between commands
				await new Promise((resolve) => setTimeout(resolve, 32))

				if (command.startsWith('DELETE')) {
					editor.deleteShapes(editor.getSelectedShapeIds())
					continue
				}

				if (command.startsWith('LABEL')) {
					const regex = /LABEL "(.*)"/
					const match = command.match(regex)
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

				if (command.startsWith('TOOL')) {
					// extract the tool name from "TOOL box;"
					const [, tool] = command.split(' ')

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

				if (command.startsWith('CLICK')) {
					const [, x1, y1, modifiers = ''] = command.split(' ')

					const point = editor.pageToScreen({ x: eval(x1), y: eval(y1) })

					const altKey = modifiers.toLowerCase().includes('alt')
					const shiftKey = modifiers.toLowerCase().includes('shift')
					const ctrlKey = modifiers.toLowerCase().includes('control')

					editor.dispatch({
						...basePoint,
						name: 'pointer_move',
						point,
						altKey,
						shiftKey,
						ctrlKey,
					})

					editor.dispatch({
						...basePoint,
						name: 'pointer_down',
						point,
						altKey,
						shiftKey,
						ctrlKey,
					})

					editor.dispatch({
						...basePoint,
						name: 'pointer_up',
						point: point,
						altKey,
						shiftKey,
						ctrlKey,
					})

					editor.cancelDoubleClick()

					continue
				}

				if (command.startsWith('DOUBLE_CLICK')) {
					const [, x1, y1, _modifiers = ''] = command.split(' ')

					const point = editor.pageToScreen({ x: eval(x1), y: eval(y1) })

					editor.dispatch({
						...basePoint,
						name: 'pointer_move',
						point,
					})

					editor.dispatch({
						...basePoint,
						type: 'click',
						name: 'double_click',
						phase: 'settle',
						point,
					})

					editor.cancelDoubleClick()

					continue
				}

				if (command.startsWith('DRAG')) {
					const [, x1, y1, x2, y2, modifiers = ''] = command.split(' ')

					const from = editor.pageToScreen({ x: eval(x1), y: eval(y1) })
					const to = editor.pageToScreen({ x: eval(x2), y: eval(y2) })

					const altKey = modifiers.toLowerCase().includes('alt')
					const shiftKey = modifiers.toLowerCase().includes('shift')
					const ctrlKey = modifiers.toLowerCase().includes('control')

					editor.dispatch({
						...basePoint,
						name: 'pointer_move',
						point: from,
						altKey,
						shiftKey,
						ctrlKey,
					})

					editor.dispatch({
						...basePoint,
						name: 'pointer_down',
						point: from,
						altKey,
						shiftKey,
						ctrlKey,
					})

					await movePointer(editor, to, { altKey, shiftKey, ctrlKey })

					editor.dispatch({
						...basePoint,
						name: 'pointer_up',
						point: to,
						altKey,
						shiftKey,
						ctrlKey,
					})

					editor.cancelDoubleClick()

					continue
				}

				if (command.startsWith('DOWN')) {
					const [, modifiers = ''] = command.split(' ')
					// extract the x and y from "MOVE 50 50;"
					const { x, y } = editor.inputs.currentScreenPoint

					const altKey = modifiers.toLowerCase().includes('alt')
					const shiftKey = modifiers.toLowerCase().includes('shift')
					const ctrlKey = modifiers.toLowerCase().includes('control')

					editor.dispatch({
						...basePoint,
						name: 'pointer_down',
						point: { x, y },
						altKey,
						shiftKey,
						ctrlKey,
					})
					continue
				}

				if (command.startsWith('UP')) {
					const [, modifiers = ''] = command.split(' ')
					// extract the x and y from "MOVE 50 50;"
					const { x, y } = editor.inputs.currentScreenPoint

					const altKey = modifiers.toLowerCase().includes('alt')
					const shiftKey = modifiers.toLowerCase().includes('shift')
					const ctrlKey = modifiers.toLowerCase().includes('control')

					editor.dispatch({
						...basePoint,
						name: 'pointer_up',
						point: { x, y },
						altKey,
						shiftKey,
						ctrlKey,
					})

					editor.cancelDoubleClick()
					continue
				}

				if (command.startsWith('MOVE')) {
					const [, x, y, modifiers = ''] = command.split(' ')

					const next = editor.pageToScreen({ x: eval(x), y: eval(y) })

					const altKey = modifiers.toLowerCase().includes('alt')
					const shiftKey = modifiers.toLowerCase().includes('shift')
					const ctrlKey = modifiers.toLowerCase().includes('control')

					await movePointer(editor, next, { altKey, shiftKey, ctrlKey })

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
		result += `\n- type=${
			shape.type === 'geo' ? `geo (${(shape as TLGeoShape).props.geo})` : shape.type
		} center=${pageBounds.midX.toFixed(0)},${pageBounds.midY.toFixed(
			0
		)} size=${pageBounds.w.toFixed(0)},${pageBounds.h.toFixed(0)}`

		if (shape.type === 'text') {
			result += ` text="${(shape as TLTextShape).props.text}"`
		} else {
			if ('text' in shape.props && shape.props.text) {
				result += ` label="${(shape as TLGeoShape).props.text}"`
			}
		}
	}

	return result
}

async function movePointer(
	editor: Editor,
	to: VecLike,
	opts = {} as { altKey: boolean; shiftKey: boolean; ctrlKey: boolean }
) {
	const curr = editor.inputs.currentScreenPoint
	const dist = Vec2d.Dist(curr, to)
	const steps = Math.max(32, Math.ceil(dist / 8))

	const { altKey, shiftKey, ctrlKey } = opts

	for (let i = 0; i < steps; i++) {
		await new Promise((resolve) => setTimeout(resolve, 16))
		const t = EASINGS.easeInOutExpo(i / steps)
		editor.dispatch({
			...basePoint,
			name: 'pointer_move',
			point: Vec2d.Lrp(curr, to, t),
			altKey,
			shiftKey,
			ctrlKey,
		})
	}
}

const basePoint = {
	type: 'pointer',
	name: 'pointer_down',
	target: 'canvas',
	pointerId: 1,
	button: 0,
	isPen: false,
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
} as const

function getKeyboardEventInfo(
	key: string,
	name: TLKeyboardEventInfo['name'],
	options = {} as Partial<Exclude<TLKeyboardEventInfo, 'point'>>
): TLKeyboardEventInfo {
	return {
		shiftKey: key === 'Shift',
		ctrlKey: key === 'Control' || key === 'Meta',
		altKey: key === 'Alt',
		...options,
		name,
		code:
			key === 'Shift'
				? 'ShiftLeft'
				: key === 'Alt'
				? 'AltLeft'
				: key === 'Control' || key === 'Meta'
				? 'CtrlLeft'
				: key === ' '
				? 'Space'
				: key === 'Enter' ||
				  key === 'ArrowRight' ||
				  key === 'ArrowLeft' ||
				  key === 'ArrowUp' ||
				  key === 'ArrowDown'
				? key
				: 'Key' + key[0].toUpperCase() + key.slice(1),
		type: 'keyboard',
		key,
	}
}
