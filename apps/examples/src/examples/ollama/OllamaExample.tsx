import { useCallback, useRef } from 'react'
import {
	Editor,
	FileHelpers,
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

	const drawMessage = useCallback((content: string) => {
		const editor = rEditor.current
		if (!editor) return

		const { center } = editor.getCurrentPageBounds() ?? editor.getViewportPageBounds()

		function drawShape(shape: any, _center: Vec) {
			const editor = rEditor.current
			if (!editor) return
			switch (shape.type) {
				case 'dot':
				case 'circle': {
					const { x, y, r = 8 } = shape
					editor.createShape({
						type: 'geo',
						x: x - r,
						y: y - r,
						props: {
							geo: 'ellipse',
							w: r * 2,
							h: r * 2,
						},
					})
					break
				}
				case 'line': {
					const { x1, y1, x2, y2 } = shape
					editor.createShape({
						type: 'line',
						x: x1,
						y: y1,
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
									x: x2 - x1,
									y: y2 - y1,
								},
							},
						},
					})
					break
				}
			}
		}

		try {
			const { shapes = [] } = JSON.parse(content)
			for (const shape of shapes) {
				drawShape(shape, center)
			}
		} catch (e) {
			// noop
		}

		// // Extract the command series from the message content. Each series begins and ends with a backtick.
		// // For example: `circle(0, 0, 4); circle(10, 10, 4);`
		// // We want to extract each command from the series
		// // const seriesRegex = /```(?<commands>[^`]*)```/
		// // const seriesResult = seriesRegex.exec(message.content)
		// // if (!seriesResult) {
		// // 	console.error('Invalid message: ' + message.content)
		// // 	return
		// // }
		// // const [_, seriesContent] = seriesResult
		// // Next, we want regex to extract each command's name and arguments
		// // for example: circle(0, 0, 4) -> ['circle(0, 0, 4)', 'circle', '0, 0, 4']
		// // for examople: undo() -> ['undo()', 'undo', '']
		// const commandRegex = /(?<name>\w+)\((?<args>[^)]*)\)/

		// const commands = content
		// 	.split(';')
		// 	.map((c) => c.trim())
		// 	.filter((c) => c)

		// editor.mark()

		// for (const command of commands) {
		// 	try {
		// 		const result = commandRegex.exec(command)
		// 		if (!result) throw new Error('Invalid command: ' + command)
		// 		const [_, name, args] = result

		// 		switch (name) {
		// 			case 'undo': {
		// 				editor.undo()
		// 				break
		// 			}
		// 			case 'dot':
		// 			case 'circle': {
		// 				const [x, y, r] = args.split(', ').map((a) => Number(a))
		// 				editor.createShape({
		// 					type: 'geo',
		// 					x: x - r,
		// 					y: y - r,
		// 					props: {
		// 						geo: 'ellipse',
		// 						w: r * 2,
		// 						h: r * 2,
		// 					},
		// 				})
		// 				break
		// 			}
		// 			case 'line': {
		// 				const [x1, y1, x2, y2] = args.split(', ').map((a) => Number(a))
		// 				editor.createShape({
		// 					type: 'line',
		// 					x: x1,
		// 					y: y1,
		// 					props: {
		// 						points: {
		// 							0: {
		// 								id: '0',
		// 								index: 'a0',
		// 								x: 0,
		// 								y: 0,
		// 							},
		// 							1: {
		// 								id: '1',
		// 								index: 'a1',
		// 								x: x2 - x1,
		// 								y: y2 - y1,
		// 							},
		// 						},
		// 					},
		// 				})
		// 				break
		// 			}
		// 			case 'polygon': {
		// 				const nums = args.split(', ').map((a) => Number(a))
		// 				const points = []
		// 				for (let i = 0; i < nums.length - 1; i += 2) {
		// 					points.push({
		// 						x: nums[i],
		// 						y: nums[i + 1],
		// 					})
		// 				}
		// 				points.push(points[0])
		// 				const minX = Math.min(...points.map((p) => p.x))
		// 				const minY = Math.min(...points.map((p) => p.y))
		// 				const indices = getIndices(points.length)
		// 				editor.createShape({
		// 					type: 'line',
		// 					x: minX,
		// 					y: minY,
		// 					props: {
		// 						points: Object.fromEntries(
		// 							points.map((p, i) => [
		// 								i + '',
		// 								{ id: i + '', index: indices[i], x: p.x - minX, y: p.y - minY },
		// 							])
		// 						),
		// 					},
		// 				})
		// 				break
		// 			}
		// 			// case 'MOVE': {
		// 			// 	const point = editor.pageToScreen({ x: Number(command[1]), y: Number(command[2]) })
		// 			// 	const steps = 20
		// 			// 	for (let i = 0; i < steps; i++) {
		// 			// 		const t = i / (steps - 1)
		// 			// 		const p = Vec.Lrp(prevPoint, point, t)
		// 			// 		editor.dispatch({
		// 			// 			type: 'pointer',
		// 			// 			target: 'canvas',
		// 			// 			name: 'pointer_move',
		// 			// 			point: {
		// 			// 				x: p.x,
		// 			// 				y: p.y,
		// 			// 				z: 0.5,
		// 			// 			},
		// 			// 			shiftKey: false,
		// 			// 			altKey: false,
		// 			// 			ctrlKey: false,
		// 			// 			pointerId: 1,
		// 			// 			button: 0,
		// 			// 			isPen: false,
		// 			// 		})
		// 			// 		editor._flushEventsForTick(0)
		// 			// 	}
		// 			// 	prevPoint.setTo(point)
		// 			// 	break
		// 			// }
		// 			// case 'DOWN': {
		// 			// 	editor.dispatch({
		// 			// 		type: 'pointer',
		// 			// 		target: 'canvas',
		// 			// 		name: 'pointer_down',
		// 			// 		point: {
		// 			// 			x: prevPoint.x,
		// 			// 			y: prevPoint.y,
		// 			// 			z: 0.5,
		// 			// 		},
		// 			// 		shiftKey: false,
		// 			// 		altKey: false,
		// 			// 		ctrlKey: false,
		// 			// 		pointerId: 1,
		// 			// 		button: 0,
		// 			// 		isPen: false,
		// 			// 	})
		// 			// 	editor._flushEventsForTick(0)
		// 			// 	break
		// 			// }
		// 			// case 'UP': {
		// 			// 	editor.dispatch({
		// 			// 		type: 'pointer',
		// 			// 		target: 'canvas',
		// 			// 		name: 'pointer_up',
		// 			// 		point: {
		// 			// 			x: prevPoint.x,
		// 			// 			y: prevPoint.y,
		// 			// 			z: 0.5,
		// 			// 		},
		// 			// 		shiftKey: false,
		// 			// 		altKey: false,
		// 			// 		ctrlKey: false,
		// 			// 		pointerId: 1,
		// 			// 		button: 0,
		// 			// 		isPen: false,
		// 			// 	})
		// 			// 	editor._flushEventsForTick(0)
		// 			// 	break
		// 			// }
		// 		}
		// 	} catch (e: any) {
		// 		console.error(e.message)
		// 	}
		// }

		// // editor.dispatch({
		// // 	type: 'pointer',
		// // 	target: 'canvas',
		// // 	name: 'pointer_up',
		// // 	point: {
		// // 		x: prevPoint.x,
		// // 		y: prevPoint.y,
		// // 		z: 0.5,
		// // 	},
		// // 	shiftKey: false,
		// // 	altKey: false,
		// // 	ctrlKey: false,
		// // 	pointerId: 1,
		// // 	button: 0,
		// // 	isPen: false,
		// // })
		// // editor._flushEventsForTick(0)
		// // // editor.zoomOut(editor.getViewportScreenCenter(), { duration: 0 })
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
						// for (const message of modelManager.getThread().content) {
						// 	if (message.role === 'model') {
						// 		drawMessage(message.content)
						// 	}
						// }
					}}
				>
					{/* <div
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: '100%',
							background: 'red',
							opacity: 0,
							zIndex: 99999,
						}}
					/> */}
				</Tldraw>
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
						let query = `Query: "${form.query.value}"`
						form.query.value = ''

						let imageString: string | undefined

						const editor = rEditor.current!

						const svg = await editor.getSvgString([...editor.getCurrentPageShapeIds()])

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
							const bounds = editor.getCurrentPageBounds()!
							query += ` Image bounds: { "minX": ${bounds.x.toFixed(0)}, "minY": ${bounds.y.toFixed(0)}, "maxX": ${bounds.maxX.toFixed(0)}, "maxY": ${bounds.maxY.toFixed(0)} }`
						}

						modelManager.query(query, imageString).response.then((message) => {
							if (!message) return
							drawMessage(message.content)
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
							const editor = rEditor.current
							if (editor) {
								editor.deleteShapes([...editor.getCurrentPageShapeIds()])
							}
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
