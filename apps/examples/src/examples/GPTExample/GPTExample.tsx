import OpenAI from 'openai'

import {
	Editor,
	TLEditorComponents,
	TLGeoShape,
	TLTextShape,
	Tldraw,
	stopEventPropagation,
	useEditor,
	useLocalStorageState,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { parseSequence } from './parseSequence'

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
		oklog(prompt)
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
