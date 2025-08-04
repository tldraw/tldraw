import { useEffect, useState } from 'react'
import {
	Editor,
	ErrorBoundary,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLUiOverrides,
} from 'tldraw'
import { handleResponseItem } from '../xml/handleResponseItem'
import { PromptHelper } from '../xml/PromptHelper'
import { IPromptInfo } from '../xml/xml-types'
import { XmlResponseParser } from '../xml/XmlResponseParser'
import { ChatPanel } from './components/ChatPanel'
import { ChatPanelFallback } from './components/ChatPanelFallback'
import { ContextBoundsHighlights } from './components/highlights/ContextBoundsHighlights'
import { ContextHighlights } from './components/highlights/ContextHighlights'
import { overrideFillStyleWithLinedFillStyle } from './linedFillStyle'
import { TargetAreaTool } from './tools/TargetAreaTool'
import { TargetShapeTool } from './tools/TargetShapeTool'

overrideFillStyleWithLinedFillStyle()

const PLACEHOLDER_PROMPT = 'Draw a cat.'

async function streamXml(message = PLACEHOLDER_PROMPT) {
	console.log('streaming xml...')
	const editor = (window as any).editor as Editor

	const promptHelper = new PromptHelper(editor, message)
	const prompt: IPromptInfo = await promptHelper.getPromptInfo()

	const res = await fetch('/stream-xml', {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
	})

	if (!res.ok) {
		const errorData = (await res.json().catch(() => ({ error: 'Unknown error' }))) as any
		throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
	}

	if (!res.body) {
		throw new Error('No response body')
	}

	const parser = new XmlResponseParser()
	const reader = res.body.getReader()
	const decoder = new TextDecoder()

	editor.markHistoryStoppingPoint()

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			const chunk = decoder.decode(value, { stream: true })
			const lines = chunk.split('\n')

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6)
					if (data.trim() === '') continue

					try {
						const jsonData = JSON.parse(data)
						if (jsonData.error) {
							throw new Error(jsonData.error)
						}

						// Parse the new chunk and get any new items
						const newItems = parser.parseNewChunk(jsonData)

						// Process each new item as it becomes available
						for (const item of newItems) {
							console.log(item)
							handleResponseItem(editor, item)
						}
					} catch (parseError) {
						console.error('Error parsing chunk:', parseError)
					}
				}
			}
		}
	} finally {
		reader.releaseLock()
	}
}

async function generateXml(message = PLACEHOLDER_PROMPT) {
	console.log('generating xml...')
	const editor = (window as any).editor as Editor

	const promptHelper = new PromptHelper(editor, message)
	const prompt: IPromptInfo = await promptHelper.getPromptInfo()

	const res = await fetch('/generate-xml', {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
	})

	if (!res.ok) {
		const errorData = (await res.json().catch(() => ({ error: 'Unknown error' }))) as any
		throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
	}

	const text = JSON.parse(await res.text())
	console.log(text)
	const parser = new XmlResponseParser()
	const items = parser.parseCompletedStream(text)
	console.log(items)

	editor.markHistoryStoppingPoint()
	for (const item of items) {
		handleResponseItem(editor, item)
	}
}

const overrides: TLUiOverrides = {
	actions: (editor, actions) => {
		return {
			...actions,
			'generate-xml': {
				id: 'generate-xml',
				label: 'Generate XML',
				kbd: 'shift+x',
				async onSelect() {
					generateXml()
				},
			},
			'stream-xml': {
				id: 'stream-xml',
				label: 'Stream XML',
				kbd: 'shift+s',
				async onSelect() {
					streamXml()
				},
			},
		}
	},
	tools: (editor, tools) => {
		return {
			...tools,
			'target-area': {
				id: 'target-area',
				label: 'Pick Area',
				kbd: 'c',
				icon: 'tool-frame',
				onSelect() {
					editor.setCurrentTool('target-area')
				},
			},
			'target-shape': {
				id: 'target-shape',
				label: 'Pick Shape',
				kbd: 's',
				icon: 'tool-frame',
				onSelect() {
					editor.setCurrentTool('target-shape')
				},
			},
		}
	},
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => (
		<>
			<ContextBoundsHighlights />
			<ContextHighlights />
		</>
	),
}

const tools = [TargetShapeTool, TargetAreaTool]

function App() {
	const [editor, setEditor] = useState<Editor | undefined>()

	useEffect(() => {
		;(window as any).generateXml = generateXml
		;(window as any).streamXml = streamXml
	}, [editor])

	return (
		<TldrawUiToastsProvider>
			<div className="tldraw-ai-container">
				<div className="tldraw-canvas">
					<Tldraw
						persistenceKey="tldraw-agent-demo"
						onMount={setEditor}
						tools={tools}
						overrides={overrides}
						components={components}
					/>
				</div>
				<ErrorBoundary fallback={ChatPanelFallback}>
					{editor && <ChatPanel editor={editor} />}
				</ErrorBoundary>
			</div>
		</TldrawUiToastsProvider>
	)
}

export default App
