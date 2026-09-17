import {
	JEV_MAX_STATE_BYTES,
	JevMode,
	JevPrediction,
	jevStyles,
	jevTools,
	parseJevAction,
} from '@tldraw/dotcom-shared'
import { fetch } from '@tldraw/utils'
import { Box, Editor, StyleProp, TLEventInfo, TLShape, TLShapeId, react } from 'tldraw'
import { JevScheduler, JevUpdate } from './JevScheduler'

interface RecentEvent {
	time: number
	kind: string
	detail: unknown
}
interface JevInteraction {
	tool: string
	startState: string
	start: { x: number; y: number }
	target: string
	shapeId?: TLShapeId
	wasDragging: boolean
}

function getAvailableStyles(editor: Editor) {
	const tool = editor.getCurrentTool()
	// Select has no shape type, but it can still prepare defaults for the next drawing operation.
	return Object.entries(jevStyles)
		.filter(
			([, prop]) =>
				tool.id === 'select' || (tool.shapeType && editor.styleProps[tool.shapeType]?.has(prop))
		)
		.map(([name]) => name)
}

export function isJevIdle(editor: Editor) {
	return editor.getPath().endsWith('.idle')
}

function getCurrentState(editor: Editor) {
	const instance = editor.getInstanceState()
	return {
		pageId: editor.getCurrentPageId(),
		tool: editor.getCurrentToolId(),
		state: editor.getPath(),
		camera: editor.getCamera(),
		selectedIds: editor.getSelectedShapeIds().slice(0, 20),
		hoveredId: editor.getHoveredShapeId(),
		editingId: editor.getEditingShapeId(),
		isReadonly: editor.getIsReadonly(),
		isFocused: instance.isFocused,
		isToolLocked: instance.isToolLocked,
		isChangingStyle: instance.isChangingStyle,
		openMenus: instance.openMenus,
		styles: Object.fromEntries(
			Object.entries(jevStyles).map(([name, prop]) => [
				name,
				editor.getStyleForNextShape(prop as StyleProp<string>),
			])
		),
		availableStyles: getAvailableStyles(editor),
	}
}

function summarizeShape(editor: Editor, shape: TLShape) {
	const bounds = editor.getShapePageBounds(shape)
	return {
		id: shape.id,
		type: shape.type,
		parentId: shape.parentId,
		bounds: bounds ? { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h } : null,
		rotation: shape.rotation,
		text: editor.getShapeUtil(shape).getText(shape)?.slice(0, 200),
		arrowBindings:
			shape.type === 'arrow'
				? editor
						.getBindingsFromShape(shape, 'arrow')
						.slice(0, 2)
						.map((binding) => ({ terminal: binding.props.terminal, toId: binding.toId }))
				: undefined,
		styles: Object.fromEntries(
			Object.entries(jevStyles).map(([name, prop]) => [
				name,
				editor.getShapeStyleIfExists(shape, prop as StyleProp<string>),
			])
		),
	}
}

export function startJevController(
	editor: Editor,
	options: {
		endpoint: string
		mode: JevMode
		onError(error: unknown): void
		onUpdate(update: JevUpdate<JevPrediction>): void
	}
) {
	const recent: RecentEvent[] = []
	let applying = false
	let cursorOnCanvas = false
	let blockedUntil = 0
	let previousState = getCurrentState(editor)
	let trigger = 'enabled'
	let requestTrigger = trigger
	let interaction: JevInteraction | null = null
	let completedInteraction:
		| (JevInteraction & {
				end: { x: number; y: number }
				endState: string
				automaticReturnToSelect: boolean
				time: number
		  })
		| null = null
	const changedShapes = new Map<TLShapeId, { operation: string; time: number }>()
	const record = (kind: string, detail: unknown) => {
		recent.push({ time: Date.now(), kind, detail })
		if (recent.length > 40) recent.shift()
	}
	const queueDecision = (reason: string, delay = 180) => {
		if (applying) return
		trigger = reason
		scheduler.trigger(Math.max(delay, blockedUntil - Date.now()))
	}
	const canRun = () => {
		const instance = editor.getInstanceState()
		return (
			cursorOnCanvas &&
			!document.hidden &&
			instance.isFocused &&
			!editor.getIsReadonly() &&
			!instance.isToolLocked &&
			!instance.openMenus.length &&
			Object.hasOwn(jevTools, editor.getCurrentToolId()) &&
			Date.now() >= blockedUntil
		)
	}
	const scheduler = new JevScheduler<JevPrediction>({
		requestTimeoutMs: options.mode === 'staged' ? 4_500 : 2_500,
		maxResultAgeMs: options.mode === 'staged' ? 3_500 : 1_500,
		canRun,
		getBlockedReason: () =>
			'The canvas is no longer available for automatic changes, or a menu, tool lock, or cooldown is active.',
		onUpdate(update) {
			if (update.status === 'thinking') requestTrigger = trigger
			options.onUpdate({ ...update, trigger: requestTrigger })
		},
		async request(signal) {
			const point = editor.inputs.getCurrentPagePoint()
			const radius = 320 / editor.getZoomLevel()
			const nearbyIds = editor.getShapeIdsInsideBounds(
				new Box(point.x - radius, point.y - radius, radius * 2, radius * 2)
			)
			const nearby: TLShape[] = []
			// Bound geometry/text work even on dense canvases. Include the hovered and selected shapes first.
			const recentChanges = [...changedShapes].filter(
				([, change]) => change.time >= Date.now() - 30_000
			)
			const ids = new Set([
				editor.getHoveredShapeId(),
				...editor.getSelectedShapeIds().slice(0, 8),
				...recentChanges.slice(-8).map(([id]) => id),
			])
			for (const id of nearbyIds) {
				if (ids.size >= 24) break
				ids.add(id)
			}
			for (const id of ids) {
				const shape = id && editor.getShape(id)
				if (shape && !editor.isShapeHidden(shape)) nearby.push(shape)
			}
			const state = JSON.stringify({
				trigger: requestTrigger,
				current: getCurrentState(editor),
				completedInteraction:
					completedInteraction && completedInteraction.time >= Date.now() - 30_000
						? {
								...completedInteraction,
								time: undefined,
								ageMs: Date.now() - completedInteraction.time,
							}
						: null,
				recentlyChangedShapes: recentChanges.map(([id, change]) => ({
					id,
					operation: change.operation,
					ageMs: Date.now() - change.time,
				})),
				cursor: { x: point.x, y: point.y },
				camera: editor.getCamera(),
				viewport: editor.getViewportPageBounds(),
				shapeCount: editor.getCurrentPageShapeIds().size,
				nearbyShapes: nearby.map((shape) => summarizeShape(editor, shape)),
				recentEvents: recent
					.filter((event) => event.time >= Date.now() - 30_000)
					.map(({ time, ...event }) => ({ ...event, ageMs: Date.now() - time })),
			})
			const body = JSON.stringify({ state, mode: options.mode })
			if (new TextEncoder().encode(body).byteLength > JEV_MAX_STATE_BYTES)
				throw new Error('Jev context is too large')
			const response = await fetch(options.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
				signal,
			})
			if (!response.ok) throw new Error(`Jev request failed (${response.status})`)
			const result = await response.json()
			if (!parseJevAction(result?.choice) || !parseJevAction(result?.suggestedChoice))
				throw new Error('Invalid Jev response')
			if (
				options.mode === 'staged' &&
				(result.mode !== 'staged' ||
					!Array.isArray(result.choices) ||
					result.choices.length > Object.keys(jevStyles).length ||
					!result.choices.every((choice: unknown) => parseJevAction(choice)))
			)
				throw new Error('Invalid Jev follow-up response')
			return result as JevPrediction
		},
		apply(result) {
			const parsed = (result.choices ?? [result.choice]).map(parseJevAction)
			if (parsed.some((action) => !action))
				return { status: 'discarded', reason: 'The response contained an unsupported action.' }
			const actions = parsed.filter((action) => action !== null && action.type !== 'none')
			if (actions.some((action) => action.type === 'tool') && actions.length !== 1)
				return { status: 'discarded', reason: 'A decision cannot combine tool and style switches.' }
			if (!actions.length)
				return { status: 'unchanged', reason: 'No change had the highest probability.' }
			const availableStyles = getAvailableStyles(editor)
			if (
				actions.some((action) => action.type === 'style' && !availableStyles.includes(action.style))
			)
				return { status: 'discarded', reason: 'A style is not available for the current tool.' }
			const changes = actions.filter((action) =>
				action.type === 'tool'
					? editor.getCurrentToolId() !== action.tool
					: editor.getStyleForNextShape(jevStyles[action.style] as StyleProp<string>) !==
						action.value
			)
			if (!changes.length)
				return { status: 'unchanged', reason: 'The requested tool or styles are already set.' }
			applying = true
			try {
				editor.run(
					() => {
						for (const action of changes) {
							if (action.type === 'tool') editor.setCurrentTool(action.tool)
							else
								editor.setStyleForNextShapes(
									jevStyles[action.style] as StyleProp<string>,
									action.value,
									{ history: 'ignore' }
								)
						}
					},
					{ history: 'ignore' }
				)
				previousState = getCurrentState(editor)
				record('assistant', changes)
				blockedUntil = Date.now() + 800
				return {
					status: 'applied',
					reason:
						changes[0].type === 'tool'
							? 'Switched tools.'
							: `Updated ${changes.length} next-shape style${changes.length === 1 ? '' : 's'}.`,
				}
			} finally {
				applying = false
			}
		},
		onError: options.onError,
	})
	const handleEvent = (event: TLEventInfo) => {
		if (applying || event.name === 'tick') return
		scheduler.invalidate()
		if (event.type === 'pointer') {
			if (event.name === 'pointer_down') {
				const point = editor.screenToPage(event.point)
				interaction = {
					tool: editor.getCurrentToolId(),
					startState: editor.getPath(),
					start: { x: point.x, y: point.y },
					target: event.target,
					shapeId: event.shape?.id,
					wasDragging: false,
				}
			}
			if (interaction && editor.inputs.getIsDragging()) interaction.wasDragging = true
			if (event.name !== 'pointer_move')
				record(event.name, { tool: editor.getCurrentToolId(), target: event.target })
		} else if (event.type === 'keyboard') {
			// Record shortcuts, not text typed into a shape.
			if (!editor.getEditingShapeId()) record(event.name, { code: event.code })
			blockedUntil = Date.now() + 1_200
		}
	}
	const handleAfterEvent = (event: TLEventInfo) => {
		if (applying) return
		if (event.type === 'pointer' && event.name === 'pointer_up') {
			if (interaction) {
				const point = editor.inputs.getCurrentPagePoint()
				completedInteraction = {
					...interaction,
					end: { x: point.x, y: point.y },
					endState: editor.getPath(),
					automaticReturnToSelect: interaction.tool !== 'select' && editor.isIn('select.idle'),
					time: Date.now(),
				}
				record('interaction_completed', { ...completedInteraction, time: undefined })
				interaction = null
			}
			queueDecision('pointer released', 60)
		} else if (event.type === 'pointer' && event.name === 'pointer_move') {
			queueDecision('cursor stopped')
		} else if (event.type === 'keyboard' && event.name === 'key_up') {
			queueDecision('keyboard action finished')
		} else if (event.name === 'complete' || event.name === 'cancel') {
			interaction = null
			queueDecision(`interaction ${event.name}`, 120)
		} else if (event.type === 'wheel' || event.name === 'pinch_end') {
			queueDecision('navigation settled', 300)
		}
	}
	editor.on('before-event', handleEvent)
	editor.on('event', handleAfterEvent)
	const stopState = react('Jev instance history', () => {
		const current = getCurrentState(editor)
		if (JSON.stringify(current) === JSON.stringify(previousState)) return
		const changed = Object.fromEntries(
			Object.entries(current).filter(
				([key, value]) =>
					JSON.stringify(value) !== JSON.stringify(previousState[key as keyof typeof previousState])
			)
		)
		const previous = previousState
		previousState = current
		if (applying) return
		if (previous.pageId !== current.pageId) {
			interaction = null
			completedInteraction = null
			changedShapes.clear()
			recent.length = 0
		}
		record('instance', changed)
		scheduler.invalidate(true)
		if (!current.state.endsWith('.idle')) return
		if (previous.pageId !== current.pageId) {
			queueDecision('page changed')
		} else if (previous.state !== current.state) {
			record('state_transition', { from: previous.state, to: current.state })
			queueDecision(`entered ${current.state} from ${previous.state}`, 60)
		} else if (previous.editingId && !current.editingId) {
			queueDecision('text editing finished', 120)
		} else if (previous.openMenus.length && !current.openMenus.length) {
			queueDecision('menu closed')
		} else if (previous.isChangingStyle && !current.isChangingStyle) {
			queueDecision('style adjustment finished')
		} else if (changed.styles) {
			queueDecision('next-shape styles changed')
		} else if (changed.selectedIds) {
			queueDecision('selection changed')
		} else if (changed.camera) {
			queueDecision('camera settled', 300)
		} else if (!previous.isFocused && current.isFocused) {
			queueDecision('canvas focused')
		} else if (previous.isToolLocked && !current.isToolLocked) {
			queueDecision('tool unlocked')
		}
	})
	const recordShapeChange = (shape: TLShape, operation: string, source: string) => {
		scheduler.invalidate(true)
		if (source !== 'user' || applying) return
		changedShapes.delete(shape.id)
		changedShapes.set(shape.id, { operation, time: Date.now() })
		if (changedShapes.size > 12) changedShapes.delete(changedShapes.keys().next().value!)
		if (isJevIdle(editor) && !editor.inputs.getIsPointing()) queueDecision('document edit settled')
	}
	const stopShapes = editor.store.sideEffects.registerAfterChangeHandler(
		'shape',
		(_prev, next, source) => {
			const previousChange = changedShapes.get(next.id)
			recordShapeChange(
				next,
				previousChange?.operation === 'created' && previousChange.time >= Date.now() - 30_000
					? 'created'
					: 'updated',
				source
			)
			if (source === 'user' && !editor.inputs.getIsPointing())
				record('shape_changed', { id: next.id, type: next.type, x: next.x, y: next.y })
		}
	)
	const stopCreates = editor.store.sideEffects.registerAfterCreateHandler(
		'shape',
		(shape, source) => {
			recordShapeChange(shape, 'created', source)
			if (source === 'user') record('shape_created', { id: shape.id, type: shape.type })
		}
	)
	const stopDeletes = editor.store.sideEffects.registerAfterDeleteHandler(
		'shape',
		(shape, source) => {
			recordShapeChange(shape, 'deleted', source)
			if (source === 'user') record('shape_deleted', { id: shape.id, type: shape.type })
		}
	)
	const container = editor.getContainer()
	const onPointerMove = (event: PointerEvent) => {
		cursorOnCanvas = event.target instanceof Element && !!event.target.closest('.tl-canvas')
		if (!cursorOnCanvas) scheduler.invalidate()
	}
	const onPointerDown = (event: PointerEvent) => {
		scheduler.invalidate()
		cursorOnCanvas = event.target instanceof Element && !!event.target.closest('.tl-canvas')
		if (!cursorOnCanvas) blockedUntil = Date.now() + 1_200
	}
	const onLeave = () => {
		cursorOnCanvas = false
		scheduler.invalidate()
	}
	container.addEventListener('pointermove', onPointerMove, true)
	container.addEventListener('pointerdown', onPointerDown, true)
	container.addEventListener('pointerleave', onLeave)
	window.addEventListener('blur', onLeave)
	document.addEventListener('visibilitychange', onLeave)
	return () => {
		scheduler.dispose()
		editor.off('before-event', handleEvent)
		editor.off('event', handleAfterEvent)
		stopState()
		stopShapes()
		stopCreates()
		stopDeletes()
		container.removeEventListener('pointermove', onPointerMove, true)
		container.removeEventListener('pointerdown', onPointerDown, true)
		container.removeEventListener('pointerleave', onLeave)
		window.removeEventListener('blur', onLeave)
		document.removeEventListener('visibilitychange', onLeave)
	}
}
