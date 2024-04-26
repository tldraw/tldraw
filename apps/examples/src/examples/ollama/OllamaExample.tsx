import { useCallback, useRef } from 'react'
import {
	Box,
	Editor,
	FileHelpers,
	TLGeoShape,
	TLLineShape,
	Tldraw,
	Vec,
	getSvgAsImage,
	preventDefault,
	track,
	useReactor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './lm-styles.css'
import { modelManager } from './ollama'

const OllamaExample = track(() => {
	const rChat = useRef<HTMLDivElement>(null)
	const rEditor = useRef<Editor>()

	useReactor(
		'scroll to bottom when thread changes',
		() => {
			modelManager.getThread()
			rChat.current?.scrollTo(0, rChat.current.scrollHeight)
		},
		[modelManager]
	)

	const drawMessage = useCallback((content: string, bounds: Box | undefined) => {
		const editor = rEditor.current
		if (!editor) return

		const tl = bounds?.point ?? new Vec()

		function drawShape(shape: any) {
			const editor = rEditor.current
			if (!editor) return
			switch (shape.type) {
				case 'rectangle':
				case 'ellipse':
				case 'circle':
				case 'geo': {
					let { type } = shape

					if (type === 'circle') {
						type = 'ellipse'
					}

					const { x, y, w, h } = shape
					editor.createShape({
						type: 'geo',
						x: tl.x + Number(x),
						y: tl.y + Number(y),
						props: {
							geo: type,
							w: Number(w),
							h: Number(h),
						},
					})

					break
				}
				case 'line': {
					const { x1, y1, x2, y2 } = shape
					editor.createShape({
						type: 'line',
						x: tl.x + Number(x1),
						y: tl.y + Number(y1),
						props: {
							points: {
								0: {
									id: '0',
									index: 'a0',
									x: 0,
									y: 0,
								},
								1: {
									id: '1',
									index: 'a1',
									x: Number(x2) - Number(x1),
									y: Number(y2) - Number(y1),
								},
							},
						},
					})
					break
				}
			}
		}

		editor.mark()
		const { shapes = [] } = JSON.parse(content)
		for (const shape of shapes) {
			try {
				drawShape(shape)
			} catch (e) {
				// noop
			}
		}
	}, [])

	const rPreviousImage = useRef<string>('')

	return (
		<div className="tldraw__editor" style={{ display: 'grid', gridTemplateRows: '1fr 1fr' }}>
			<div style={{ position: 'relative', height: '100%', width: '100%' }}>
				<Tldraw
					onMount={(e) => {
						rEditor.current = e
						;(window as any).editor = e
						e.centerOnPoint(new Vec())
					}}
				></Tldraw>
			</div>
			<div ref={rChat} className="chat">
				{modelManager.getThread().content.map((message, i) => (
					<div key={i} className="message">
						<p className="message__from">{message.role}</p>
						<p className="message__content">{message.content}</p>
					</div>
				))}
				<form
					className="chat__input"
					onSubmit={async (e) => {
						preventDefault(e)
						const form = e.currentTarget

						const query: any = {
							// request: form.query.value,
						}

						form.query.value = ''

						let imageString: string | undefined
						let bounds: Box | undefined

						const editor = rEditor.current!

						const shapes = editor.getCurrentPageShapes()

						if (shapes.length) {
							bounds = editor.getCurrentPageBounds()!
							const tl = bounds.point

							const svg = await editor.getSvgString([...shapes], {
								padding: 0,
							})

							if (svg) {
								const image = await getSvgAsImage(svg.svg, false, {
									type: 'png',
									quality: 1,
									scale: 1,
									width: svg.width,
									height: svg.height,
								})

								if (image) {
									const base64 = await FileHelpers.blobToDataUrl(image)

									const trimmed = base64.slice('data:image/png;base64,'.length)

									if (rPreviousImage.current !== trimmed) {
										rPreviousImage.current = trimmed
										imageString = trimmed
									}
								}
							}

							if (imageString) {
								query.imageSize = {
									width: Number(bounds.w.toFixed(0)),
									height: Number(bounds.h.toFixed(0)),
								}
							}

							const simpleShapes = editor
								.getCurrentPageShapes()
								.sort((a, b) => {
									return editor.getShapePageBounds(a)!.x < editor.getShapePageBounds(b)!.x ? -1 : 1
								})
								.sort((a, b) => {
									return editor.getShapePageBounds(a)!.y < editor.getShapePageBounds(b)!.y ? -1 : 1
								})
								.map((shape) => ({
									...shape,
									x: shape.x - tl.x,
									y: shape.y - tl.y,
								}))
								.map((shape) => {
									switch (shape.type) {
										case 'geo': {
											if (!editor.isShapeOfType<TLGeoShape>(shape, 'geo')) throw Error()
											const {
												x,
												y,
												props: { w, h },
											} = shape
											return {
												type: shape.props.geo,
												x: Number(x.toFixed(0)),
												y: Number(y.toFixed(0)),
												w: Number(w.toFixed(0)),
												h: Number(h.toFixed(0)),
											}
										}
										case 'line': {
											if (!editor.isShapeOfType<TLLineShape>(shape, 'line')) throw Error()
											const {
												x,
												y,
												props: { points },
											} = shape
											const allPoints = Object.values(points)
											const p0 = allPoints[0]
											const p1 = allPoints[allPoints.length - 1]
											return {
												type: 'line',
												x1: Number(x + p0.x).toFixed(0),
												y1: Number(y + p0.y).toFixed(0),
												x2: Number(x + p1.x).toFixed(0),
												y2: Number(y + p1.y).toFixed(0),
											}
										}
										default: {
											// noop
											break
										}
									}

									return
								})
								.filter(Boolean)

							if (simpleShapes.length) {
								query.shapes = simpleShapes
							}
						}

						modelManager.query(JSON.stringify(query), imageString).response.then((message) => {
							if (!message) return
							drawMessage(message.content, bounds)
						})
					}}
				>
					<input name="query" type="text" autoComplete="off" />
					<button>Submit</button>
					<button
						onClick={(e) => {
							preventDefault(e)
						}}
					>
						Cancel
					</button>
					<button
						onClick={(e) => {
							preventDefault(e)
							modelManager.clear()
							// const editor = rEditor.current
							// if (editor) {
							// 	editor.deleteShapes([...editor.getCurrentPageShapeIds()])
							// }
						}}
					>
						Clear
					</button>
				</form>
			</div>
		</div>
	)
})

export default OllamaExample
