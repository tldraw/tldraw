import {
	EASINGS,
	Editor,
	GeoShapeGeoStyle,
	TLKeyboardEventInfo,
	Vec2d,
	VecLike,
	createShapeId,
	uniqueId,
} from '@tldraw/tldraw'

export async function parseSequence(editor: Editor, text: string) {
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

function _getKeyboardEventInfo(
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
