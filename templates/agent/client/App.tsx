import { useEffect, useState } from 'react'
import {
	compact,
	Editor,
	ErrorBoundary,
	FileHelpers,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLUiOverrides,
} from 'tldraw'
import { handleResponseItem } from '../xml/handleResponseItem'
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

const PLACEHOLDER_PROMPT = 'Draw a cat using rectangles.'

async function streamXml(message = PLACEHOLDER_PROMPT) {
	console.log('streaming xml...')
	const editor = (window as any).editor as Editor

	const vpb = editor.getViewportPageBounds()
	const viewport: IPromptInfo['viewport'] = {
		id: 'viewport',
		minX: vpb.minX,
		minY: vpb.minY,
		maxX: vpb.maxX,
		maxY: vpb.maxY,
	}
	const contents: IPromptInfo['contents'] = compact(
		editor.getCurrentPageShapesSorted().map((s, i) => {
			const pageBounds = editor.getShapePageBounds(s.id)
			if (!pageBounds) return null
			return {
				id: s.id.split(':')[1],
				type: s.type,
				index: i,
				minX: pageBounds.minX,
				minY: pageBounds.minY,
				maxX: pageBounds.maxX,
				maxY: pageBounds.maxY,
			}
		})
	)

	const result = await editor.toImage(editor.getCurrentPageRenderingShapesSorted().map((s) => s.id))
	const image = await FileHelpers.blobToDataUrl(result.blob)

	const prompt: IPromptInfo = {
		image,
		viewport,
		contents,
		prompt: message,
	}

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

	const vpb = editor.getViewportPageBounds()
	const viewport: IPromptInfo['viewport'] = {
		id: 'viewport',
		minX: vpb.minX,
		minY: vpb.minY,
		maxX: vpb.maxX,
		maxY: vpb.maxY,
	}
	const contents: IPromptInfo['contents'] = compact(
		editor.getCurrentPageShapesSorted().map((s, i) => {
			const pageBounds = editor.getShapePageBounds(s.id)
			if (!pageBounds) return null
			return {
				id: s.id.split(':')[1],
				type: s.type,
				index: i,
				minX: pageBounds.minX,
				minY: pageBounds.minY,
				maxX: pageBounds.maxX,
				maxY: pageBounds.maxY,
			}
		})
	)

	const result = await editor.toImage(editor.getCurrentPageRenderingShapesSorted().map((s) => s.id))
	const image = await FileHelpers.blobToDataUrl(result.blob)

	const prompt: IPromptInfo = {
		image,
		viewport,
		contents,
		prompt: message,
	}

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
	const parser = new XmlResponseParser()
	const items = parser.parseCompletedStream(text)
	console.log(text)
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
