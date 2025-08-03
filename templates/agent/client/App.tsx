import { useEffect, useState } from 'react'
import {
	compact,
	createShapeId,
	Editor,
	ErrorBoundary,
	FileHelpers,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLShapeId,
	TLUiOverrides,
	toRichText,
} from 'tldraw'
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
		try {
			switch (item.type) {
				case 'statement': {
					console.log('Statement:', item.text)
					break
				}
				case 'move-shape': {
					const shape = editor.getShape(item.shapeId as TLShapeId)
					if (!shape) continue
					editor.updateShape({
						id: createShapeId(item.shapeId),
						type: shape.type,
						x: item.x,
						y: item.y,
					})
					break
				}
				case 'distribute-shapes': {
					const shapes = compact(item.shapeIds.map((id) => editor.getShape(createShapeId(id))))
					editor.distributeShapes(shapes, item.direction)
					break
				}
				case 'stack-shapes': {
					const shapes = compact(item.shapeIds.map((id) => editor.getShape(createShapeId(id))))
					editor.stackShapes(shapes, item.direction, item.gap)
					break
				}
				case 'align-shapes': {
					const shapes = compact(item.shapeIds.map((id) => editor.getShape(createShapeId(id))))
					editor.alignShapes(shapes, item.alignment)
					break
				}
				case 'label-shape': {
					const shape = editor.getShape(createShapeId(item.shapeId))
					if (!shape) continue
					if (shape.type === 'text' || shape.type === 'geo') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							props: {
								...shape.props,
								richText: toRichText(item.text),
							},
						})
					}
					break
				}
				case 'place-shape': {
					const shape = editor.getShape(createShapeId(item.shapeId))
					if (!shape) continue
					const referenceShape = editor.getShape(createShapeId(item.referenceShapeId))
					if (!referenceShape) continue
					const bbA = editor.getShapePageBounds(shape.id)!
					const bbR = editor.getShapePageBounds(referenceShape.id)!
					if (item.side === 'top' && item.align === 'start') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.minX + item.alignOffset,
							y: bbR.minY - bbA.height - item.sideOffset,
						})
					} else if (item.side === 'top' && item.align === 'center') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.midX - bbA.width / 2 + item.alignOffset,
							y: bbR.minY - bbA.height - item.sideOffset,
						})
					} else if (item.side === 'top' && item.align === 'end') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.maxX - bbA.width - item.alignOffset,
							y: bbR.minY - bbA.height - item.sideOffset,
						})
					} else if (item.side === 'bottom' && item.align === 'start') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.minX + item.alignOffset,
							y: bbR.maxY + item.sideOffset,
						})
					} else if (item.side === 'bottom' && item.align === 'center') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.midX - bbA.width / 2 + item.alignOffset,
							y: bbR.maxY + item.sideOffset,
						})
					} else if (item.side === 'bottom' && item.align === 'end') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.maxX - bbA.width - item.alignOffset,
							y: bbR.maxY + item.sideOffset,
						})
						// LEFT SIDE (corrected)
					} else if (item.side === 'left' && item.align === 'start') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.minX - bbA.width - item.sideOffset,
							y: bbR.minY + item.alignOffset,
						})
					} else if (item.side === 'left' && item.align === 'center') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.minX - bbA.width - item.sideOffset,
							y: bbR.midY - bbA.height / 2 + item.alignOffset,
						})
					} else if (item.side === 'left' && item.align === 'end') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.minX - bbA.width - item.sideOffset,
							y: bbR.maxY - bbA.height - item.alignOffset,
						})
						// RIGHT SIDE (corrected)
					} else if (item.side === 'right' && item.align === 'start') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.maxX + item.sideOffset,
							y: bbR.minY + item.alignOffset,
						})
					} else if (item.side === 'right' && item.align === 'center') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.maxX + item.sideOffset,
							y: bbR.midY - bbA.height / 2 + item.alignOffset,
						})
					} else if (item.side === 'right' && item.align === 'end') {
						editor.updateShape({
							id: shape.id,
							type: shape.type,
							x: bbR.maxX + item.sideOffset,
							y: bbR.maxY - bbA.height - item.alignOffset,
						})
					}
					break
				}
				case 'create-shape': {
					switch (item.shape.type) {
						case 'geo': {
							editor.createShape({
								type: 'geo',
								x: item.shape.x,
								y: item.shape.y,
								props: {
									w: item.shape.width ?? 100,
									h: item.shape.height ?? 100,
									richText: toRichText(item.shape.text ?? ''),
									color: item.shape.color ?? 'black',
									fill: item.shape.fill ?? 'none',
								},
							})
							break
						}
						case 'text': {
							editor.createShape({
								type: 'text',
								x: item.shape.x,
								y: item.shape.y,
								props: {
									color: item.shape.color ?? 'black',
									richText: toRichText(item.shape.text ?? ''),
								},
							})
							break
						}
					}
					break
				}
				case 'delete-shapes': {
					const shapes = compact(item.shapeIds.map((id) => editor.getShape(createShapeId(id))))
					editor.deleteShapes(shapes)
					break
				}
			}
		} catch (error) {
			console.error(error)
		}
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
