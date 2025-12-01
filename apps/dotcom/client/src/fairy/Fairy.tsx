import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import React, { useEffect, useRef } from 'react'
import { TLEventInfo, getPointerInfo, useEditor, useQuickReactor, useValue } from 'tldraw'
import '../tla/styles/fairy.css'
import { TLAppUiHandler, useTldrawAppUiEvents } from '../tla/utils/app-ui-events'
import { FairyAgent } from './fairy-agent/FairyAgent'
import { getProjectColor } from './fairy-helpers/getProjectColor'
import { FairySprite, getHatColor } from './fairy-sprite/FairySprite'
import { FairyReticleSprite } from './fairy-sprite/sprites/FairyReticleSprite'
import { FairyContextMenuContent } from './fairy-ui/menus/FairyContextMenuContent'
import { FairyThrowTool } from './FairyThrowTool'

export const FAIRY_CONTAINER_SIZE = 52
export const FAIRY_SIZE = 44

interface FairyIdleState {
	status: 'idle'
}
interface FairyPressedState {
	status: 'pressed'
	pointerId: number
	startClient: { x: number; y: number }
	wasSelectedBeforeDown: boolean
	fairiesAtPointerDown: FairyAgent[]
}
interface FairyDraggingState {
	status: 'dragging'
	pointerId: number
	fairiesAtPointerDown: FairyAgent[]
}
type FairyInteractionState = FairyIdleState | FairyPressedState | FairyDraggingState

function updateFairySelection(
	fairyAgents: FairyAgent[],
	clickedAgent: FairyAgent,
	wasSelected: boolean,
	isMultiSelect: boolean,
	trackEvent: TLAppUiHandler
) {
	if (!isMultiSelect) {
		// Regular click: select clicked fairy, deselect others
		if (!wasSelected) {
			trackEvent('fairy-select', { source: 'fairy-canvas', fairyId: clickedAgent.id })
			fairyAgents.forEach((a) => {
				if (a.id === clickedAgent.id) {
					a.updateEntity((f) => (f ? { ...f, isSelected: true } : f))
				} else {
					a.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
				}
			})
		}
		// If already selected, do nothing (might be dragging multiple fairies)
	} else {
		// Multi-select: add to selection if not selected
		if (!wasSelected) {
			trackEvent('fairy-add-to-selection', { source: 'fairy-canvas', fairyId: clickedAgent.id })
			clickedAgent.updateEntity((f) => (f ? { ...f, isSelected: true } : f))
		}
		// If already selected, do nothing (will handle deselection on pointer up)
	}
}

function setFairiesToThrowTool(editor: ReturnType<typeof useEditor>, fairies: FairyAgent[]): void {
	const tool = editor.getStateDescendant('select.fairy-throw')
	if (tool instanceof FairyThrowTool) {
		tool.setFairies(fairies)
	}
}

function useFairyPointerInteraction(
	ref: React.RefObject<HTMLDivElement>,
	agent: FairyAgent,
	editor: ReturnType<typeof useEditor>,
	isFairyGrabbable: boolean,
	trackEvent: TLAppUiHandler
) {
	const interactionState = useRef<FairyInteractionState>({ status: 'idle' })
	const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		const elm = ref.current
		if (!elm) return

		function cleanupPointerListeners() {
			if (elm) {
				elm.removeEventListener('pointermove', handleCapturedPointerMove)
			}
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
		}

		function cleanupEditorEventListener() {
			editor.off('event', handleEvent)
		}

		function cancelLongPressTimer() {
			if (longPressTimerRef.current) {
				clearTimeout(longPressTimerRef.current)
				longPressTimerRef.current = null
			}
		}

		function startDraggingWithCurrentState(currentState: FairyPressedState) {
			cancelLongPressTimer()
			agent.gesture.clear()
			interactionState.current = {
				status: 'dragging',
				pointerId: currentState.pointerId,
				fairiesAtPointerDown: currentState.fairiesAtPointerDown,
			}
			cleanupPointerListeners()
			cleanupEditorEventListener()

			trackEvent('fairy-drag-start', { source: 'fairy-canvas', fairyId: agent.id })
			setFairiesToThrowTool(editor, currentState.fairiesAtPointerDown)
			editor.setCurrentTool('select.fairy-throw')
			interactionState.current = { status: 'idle' }
		}

		function handleCapturedPointerMove(e: PointerEvent) {
			// Dispatch pointer move events to editor when pointer is captured
			// This ensures editor.inputs.currentPagePoint is updated on mobile
			const currentState = interactionState.current
			if (currentState.status === 'pressed' && e.pointerId === currentState.pointerId) {
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_move',
					...getPointerInfo(editor, e),
				})
			}
		}

		function handlePointerMove() {
			const currentState = interactionState.current
			if (currentState.status !== 'pressed') return

			if (editor.inputs.isDragging) {
				startDraggingWithCurrentState(currentState)
			}
		}

		function handlePointerUp() {
			const currentState = interactionState.current
			cancelLongPressTimer()

			// Clear panicking gesture if it was set
			agent.gesture.clear()

			if (currentState.status === 'idle') {
				cleanupPointerListeners()
				cleanupEditorEventListener()
				return
			}

			cleanupPointerListeners()
			cleanupEditorEventListener()
			editor.setCursor({ type: 'default', rotation: 0 })

			if (currentState.status === 'pressed' && currentState.wasSelectedBeforeDown) {
				agent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
			}

			interactionState.current = { status: 'idle' }
		}

		function handleEvent(event: TLEventInfo) {
			if (event.type === 'pointer' && event.name === 'pointer_move') {
				handlePointerMove()
			}
			if (event.type === 'pointer' && event.name === 'pointer_up') {
				handlePointerUp()
			}
			if (event.type === 'misc' && event.name === 'cancel') {
				handlePointerUp()
			}
		}

		const handleFairyPointerDown = (e: PointerEvent) => {
			// This forces the pointer current position to update (needed on mobile)
			editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				...getPointerInfo(editor, e),
			})

			// Allow right-click to pass through for context menu
			if (e.button === 2) return
			if (!editor.isIn('select.idle')) return
			if (editor.isIn('select.fairy-throw')) return
			if (!isFairyGrabbable) return
			;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)

			editor.run(() => {
				editor.setSelectedShapes([])
				editor.setCursor({ type: 'grabbing', rotation: 0 })

				// hack: dispatch an escape event to the document body to close any open context menus
				document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

				editor.inputs.isPointing = true
				editor.inputs.isDragging = false
				editor.inputs.originPagePoint.setTo(editor.inputs.currentPagePoint)

				// Listen for pointer move events on the captured element
				// This is necessary on mobile to ensure editor.inputs.currentPagePoint is updated
				elm.addEventListener('pointermove', handleCapturedPointerMove)

				const fairyAgents = agent.fairyApp.agents.getAgents()
				const clickedFairyEntity = agent.getEntity()
				const wasClickedFairySelected = clickedFairyEntity?.isSelected ?? false
				const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey

				updateFairySelection(fairyAgents, agent, wasClickedFairySelected, isMultiSelect, trackEvent)

				const fairiesToDrag: FairyAgent[] = []
				const selectedFairies = fairyAgents.filter((a) => a.getEntity()?.isSelected)
				fairiesToDrag.push(...selectedFairies)
				// Fallback: if no fairies are selected, add the clicked fairy to enable dragging
				if (selectedFairies.length === 0) {
					fairiesToDrag.push(agent)
				}

				// Only prevent default and stop propagation for left-clicks
				e.preventDefault()
				e.stopPropagation()

				interactionState.current = {
					status: 'pressed',
					pointerId: e.pointerId,
					startClient: { x: e.clientX, y: e.clientY },
					wasSelectedBeforeDown: wasClickedFairySelected,
					fairiesAtPointerDown: fairiesToDrag,
				}

				// Start long-press timer (3 seconds)
				cancelLongPressTimer()
				longPressTimerRef.current = setTimeout(() => {
					const currentState = interactionState.current
					// Only trigger panicking if still pressed and not dragging
					if (currentState.status === 'pressed' && !editor.inputs.isDragging) {
						trackEvent('fairy-panic', { source: 'fairy-canvas', fairyId: agent.id })
						agent.gesture.push('panicking')
					}
					longPressTimerRef.current = null
				}, 3000)

				editor.on('event', handleEvent)
			})
		}

		elm.addEventListener('pointerdown', handleFairyPointerDown)

		return () => {
			// Cleanup on unmount
			cancelLongPressTimer()
			cleanupEditorEventListener()
			elm.removeEventListener('pointerdown', handleFairyPointerDown)
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
		}
	}, [agent, editor, isFairyGrabbable, ref, trackEvent])
}

export function Fairy({ agent }: { agent: FairyAgent }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()
	const fairyRef = useRef<HTMLDivElement>(null)

	const fairyOutfit = useValue('fairy outfit', () => agent.getConfig()?.outfit, [agent])
	const fairyEntity = useValue('fairy entity', () => agent.getEntity(), [agent])

	const position = useValue(
		'fairy position',
		() => {
			const entity = agent.getEntity()
			if (!entity) return null
			return {
				x: entity.position.x,
				y: entity.position.y,
			}
		},
		[editor, agent]
	)

	const isOrchestrator = useValue(
		'is orchestrator',
		() => agent.getRole() === 'orchestrator' || agent.getRole() === 'duo-orchestrator',
		[agent]
	)
	const projectColor = useValue('project color', () => agent.getProject()?.color, [agent])

	const projectHexColor = projectColor
		? getProjectColor(projectColor)
		: 'var(--tl-color-fairy-light)'

	const flipX = useValue('fairy flipX', () => agent.getEntity()?.flipX ?? false, [agent])
	const isSelected = useValue('fairy isSelected', () => agent.getEntity()?.isSelected ?? false, [
		agent,
	])
	const isInSelectTool = useValue('is in select tool', () => editor.isIn('select.idle'), [editor])
	const isInThrowTool = useValue('is in throw tool', () => editor.isIn('select.fairy-throw'), [
		editor,
	])
	const isGenerating = useValue('is generating', () => agent.requests.isGenerating(), [agent])
	const isFairyGrabbable = isInSelectTool

	useFairyPointerInteraction(fairyRef, agent, editor, isFairyGrabbable, trackEvent)

	useQuickReactor(
		'fairy position',
		() => {
			const elm = fairyRef.current
			if (!elm) return
			const position = agent.getEntity()?.position
			if (!position) return null
			elm.style.left = `${position.x}px`
			elm.style.top = `${position.y}px`
		},
		[agent, fairyRef]
	)

	// Don't render if entity, outfit or position doesn't exist yet to avoid position jumping from (0,0)
	if (!fairyEntity || !fairyOutfit || !position) {
		return null
	}

	return (
		<_ContextMenu.Root dir="ltr">
			<_ContextMenu.Trigger asChild>
				<div
					ref={fairyRef}
					onContextMenu={(e) => {
						// Allow context menu to open by not preventing default
						e.stopPropagation()
					}}
					className={classNames('fairy-container', {
						'fairy-container__selected': isSelected,
						'fairy-container__not-selected': !isSelected,
						'fairy-container__generating': isGenerating,
						'fairy-container__not-generating': !isGenerating,
						'fairy-container__in-throw-tool': isInThrowTool,
						'fairy-container__grabbable': isFairyGrabbable,
						'fairy-container__not-grabbable': !isFairyGrabbable,
					})}
				>
					<FairySprite
						pose={fairyEntity.pose}
						gesture={fairyEntity.gesture}
						hatColor={getHatColor(fairyOutfit.hat)}
						showShadow
						isAnimated={fairyEntity.pose !== 'idle' || isSelected}
						isGenerating={isGenerating}
						flipX={flipX}
						isOrchestrator={isOrchestrator}
						projectColor={projectHexColor}
					/>
				</div>
			</_ContextMenu.Trigger>
			<FairyContextMenuContent agent={agent} source="canvas" />
		</_ContextMenu.Root>
	)
}

export function SelectedFairy({ agent }: { agent: FairyAgent }) {
	const ref = useRef<HTMLDivElement>(null)
	useQuickReactor(
		'fairy position',
		() => {
			const elm = ref.current
			if (!elm) return
			const position = agent.getEntity()?.position
			if (!position) return null
			elm.style.left = `${position.x}px`
			elm.style.top = `${position.y}px`
		},
		[agent]
	)

	return (
		<div ref={ref} className="fairy-selected">
			<FairyReticleSprite size={FAIRY_CONTAINER_SIZE / 1.5} />
		</div>
	)
}
