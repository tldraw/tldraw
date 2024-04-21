import { useCallback, useRef } from 'react'
import { Editor, Tldraw, Vec, getIndices, preventDefault, track, useReactor } from 'tldraw'
import 'tldraw/tldraw.css'
import './lm-styles.css'
import { LMMessage, modelManager } from './ollama'

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

	const drawMessage = useCallback((message: LMMessage) => {
		const editor = rEditor.current
		if (!editor) return

		// Extract the command series from the message content. Each series begins and ends with a backtick.
		// For example: `circle(0, 0, 4); circle(10, 10, 4);`
		// We want to extract each command from the series
		// const seriesRegex = /```(?<commands>[^`]*)```/
		// const seriesResult = seriesRegex.exec(message.content)
		// if (!seriesResult) {
		// 	console.error('Invalid message: ' + message.content)
		// 	return
		// }
		// const [_, seriesContent] = seriesResult
		// Next, we want regex to extract each command's name and arguments
		// for example: circle(0, 0, 4) -> ['circle(0, 0, 4)', 'circle', '0, 0, 4']
		// for examople: undo() -> ['undo()', 'undo', '']
		const commandRegex = /(?<name>\w+)\((?<args>[^)]*)\)/

		const commands = message.content
			.split(';')
			.map((c) => c.trim())
			.filter((c) => c)

		editor.mark()

		for (const command of commands) {
			try {
				const result = commandRegex.exec(command)
				if (!result) throw new Error('Invalid command: ' + command)
				const [_, name, args] = result

				switch (name) {
					case 'undo': {
						editor.undo()
						break
					}
					case 'dot':
					case 'circle': {
						const [x, y, r] = args.split(', ').map((a) => Number(a))
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
						const [x1, y1, x2, y2] = args.split(', ').map((a) => Number(a))
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
					case 'polygon': {
						const nums = args.split(', ').map((a) => Number(a))
						const points = []
						for (let i = 0; i < nums.length - 1; i += 2) {
							points.push({
								x: nums[i],
								y: nums[i + 1],
							})
						}
						points.push(points[0])
						const minX = Math.min(...points.map((p) => p.x))
						const minY = Math.min(...points.map((p) => p.y))
						const indices = getIndices(points.length)
						editor.createShape({
							type: 'line',
							x: minX,
							y: minY,
							props: {
								points: Object.fromEntries(
									points.map((p, i) => [
										i + '',
										{ id: i + '', index: indices[i], x: p.x - minX, y: p.y - minY },
									])
								),
							},
						})
						break
					}
					// case 'MOVE': {
					// 	const point = editor.pageToScreen({ x: Number(command[1]), y: Number(command[2]) })
					// 	const steps = 20
					// 	for (let i = 0; i < steps; i++) {
					// 		const t = i / (steps - 1)
					// 		const p = Vec.Lrp(prevPoint, point, t)
					// 		editor.dispatch({
					// 			type: 'pointer',
					// 			target: 'canvas',
					// 			name: 'pointer_move',
					// 			point: {
					// 				x: p.x,
					// 				y: p.y,
					// 				z: 0.5,
					// 			},
					// 			shiftKey: false,
					// 			altKey: false,
					// 			ctrlKey: false,
					// 			pointerId: 1,
					// 			button: 0,
					// 			isPen: false,
					// 		})
					// 		editor._flushEventsForTick(0)
					// 	}
					// 	prevPoint.setTo(point)
					// 	break
					// }
					// case 'DOWN': {
					// 	editor.dispatch({
					// 		type: 'pointer',
					// 		target: 'canvas',
					// 		name: 'pointer_down',
					// 		point: {
					// 			x: prevPoint.x,
					// 			y: prevPoint.y,
					// 			z: 0.5,
					// 		},
					// 		shiftKey: false,
					// 		altKey: false,
					// 		ctrlKey: false,
					// 		pointerId: 1,
					// 		button: 0,
					// 		isPen: false,
					// 	})
					// 	editor._flushEventsForTick(0)
					// 	break
					// }
					// case 'UP': {
					// 	editor.dispatch({
					// 		type: 'pointer',
					// 		target: 'canvas',
					// 		name: 'pointer_up',
					// 		point: {
					// 			x: prevPoint.x,
					// 			y: prevPoint.y,
					// 			z: 0.5,
					// 		},
					// 		shiftKey: false,
					// 		altKey: false,
					// 		ctrlKey: false,
					// 		pointerId: 1,
					// 		button: 0,
					// 		isPen: false,
					// 	})
					// 	editor._flushEventsForTick(0)
					// 	break
					// }
				}
			} catch (e: any) {
				console.error(e.message)
			}
		}

		// editor.dispatch({
		// 	type: 'pointer',
		// 	target: 'canvas',
		// 	name: 'pointer_up',
		// 	point: {
		// 		x: prevPoint.x,
		// 		y: prevPoint.y,
		// 		z: 0.5,
		// 	},
		// 	shiftKey: false,
		// 	altKey: false,
		// 	ctrlKey: false,
		// 	pointerId: 1,
		// 	button: 0,
		// 	isPen: false,
		// })
		// editor._flushEventsForTick(0)
		// // editor.zoomOut(editor.getViewportScreenCenter(), { duration: 0 })
	}, [])

	return (
		<div className="tldraw__editor" style={{ display: 'grid', gridTemplateRows: '1fr 1fr' }}>
			<div style={{ position: 'relative', height: '100%', width: '100%' }}>
				<Tldraw
					onMount={(e) => {
						rEditor.current = e
						;(window as any).editor = e
						e.centerOnPoint(new Vec())
						for (const message of modelManager.getThread().content) {
							if (message.from === 'model') {
								drawMessage(message)
							}
						}
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
						<p className="message__from">{message.from}</p>
						<p className="message__date">{new Date(message.time).toLocaleString()}</p>
						<p className="message__content">{message.content}</p>
					</div>
				))}
				<form
					className="chat__input"
					onSubmit={(e) => {
						preventDefault(e)
						const form = e.currentTarget
						const query = form.query.value
						modelManager.stream(query).response.then((message) => {
							if (!message) return
							drawMessage(message)
						})
						form.query.value = ''
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
