import { FairyEntity } from '@tldraw/fairy-shared'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import React, { useEffect, useRef } from 'react'
import { Atom, TLEventInfo, useEditor, useValue } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from './fairy-globals'
import { getProjectColor } from './fairy-helpers/getProjectColor'
import { FairySprite, getHatColor } from './fairy-sprite/FairySprite'
import { FairyReticleSprite } from './fairy-sprite/sprites/FairyReticleSprite'
import { FairyContextMenuContent } from './fairy-ui/menus/FairyContextMenuContent'
import { FairyThrowTool } from './FairyThrowTool'

export const FAIRY_CONTAINER_SIZE = 52
export const FAIRY_SIZE = 44
const FAIRY_TRANSFORM_X_OFFSET = -75
const FAIRY_TRANSFORM_Y_OFFSET = -25

interface FairyIdleState {
	status: 'idle'
}
interface FairyPressedState {
	status: 'pressed'
	pointerId: number
	startClient: { x: number; y: number }
	wasSelectedBeforeDown: boolean
	fairiesAtPointerDown: Atom<FairyEntity>[]
}
interface FairyDraggingState {
	status: 'dragging'
	pointerId: number
	fairiesAtPointerDown: Atom<FairyEntity>[]
}
type FairyInteractionState = FairyIdleState | FairyPressedState | FairyDraggingState

function getSelectedFairyAtoms(fairyAgents: FairyAgent[]) {
	const selected: Atom<FairyEntity>[] = []
	fairyAgents.forEach((a) => {
		if (a.$fairyEntity.get()?.isSelected) {
			selected.push(a.$fairyEntity)
		}
	})
	return selected
}

function updateFairySelection(
	fairyAgents: FairyAgent[],
	clickedAgent: FairyAgent,
	wasSelected: boolean,
	isMultiSelect: boolean
) {
	if (!isMultiSelect) {
		// Regular click: select clicked fairy, deselect others
		if (!wasSelected) {
			fairyAgents.forEach((a) => {
				if (a.id === clickedAgent.id) {
					a.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))
				} else {
					a.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
				}
			})
		}
		// If already selected, do nothing (might be dragging multiple fairies)
	} else {
		// Multi-select: add to selection if not selected
		if (!wasSelected) {
			clickedAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))
		}
		// If already selected, do nothing (will handle deselection on pointer up)
	}
}

function getFairyCursor(isFairyGrabbable: boolean, isDragging: boolean): string {
	if (!isFairyGrabbable) return 'default'
	return isDragging ? 'grabbing' : 'grab'
}

function setFairiesToThrowTool(
	editor: ReturnType<typeof useEditor>,
	fairies: Atom<FairyEntity>[]
): void {
	const tool = editor.getStateDescendant('select.fairy-throw')
	if (tool instanceof FairyThrowTool) {
		tool.setFairies(fairies)
	}
}

interface FairyContainerProps {
	position: { x: number; y: number }
	isSelected: boolean
	isGenerating: boolean
	isInThrowTool: boolean
	isFairyGrabbable: boolean
	isDragging: boolean
	children: React.ReactNode
}

const FairyContainer = React.forwardRef<HTMLDivElement, FairyContainerProps>(
	(
		{ position, isSelected, isGenerating, isInThrowTool, isFairyGrabbable, isDragging, children },
		ref
	) => (
		<div
			ref={ref}
			style={{
				position: 'absolute',
				left: position.x,
				top: position.y,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: `${FAIRY_CONTAINER_SIZE}px`,
				height: `${FAIRY_CONTAINER_SIZE}px`,
				transform: `translate(${FAIRY_TRANSFORM_X_OFFSET}%, ${FAIRY_TRANSFORM_Y_OFFSET}%) scale(var(--tl-scale))`,
				transformOrigin: `${-FAIRY_TRANSFORM_X_OFFSET}% ${-FAIRY_TRANSFORM_Y_OFFSET}%`,
				zIndex: isSelected ? 1 : 0,
				transition:
					isGenerating && !isInThrowTool ? 'left 0.1s ease-in-out, top 0.1s ease-in-out' : 'none',
			}}
		>
			<div
				style={{
					position: 'absolute',
					width: '100%',
					height: '100%',
					top: 0,
					left: 0,
					pointerEvents: isFairyGrabbable ? 'all' : 'none',
					cursor: getFairyCursor(isFairyGrabbable, isDragging),
				}}
			/>
			{children}
		</div>
	)
)
FairyContainer.displayName = 'FairyContainer'

function useFairyPointerInteraction(
	ref: React.RefObject<HTMLDivElement>,
	agent: FairyAgent,
	editor: ReturnType<typeof useEditor>,
	isFairyGrabbable: boolean
) {
	const interactionState = useRef<FairyInteractionState>({ status: 'idle' })
	const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const $fairyEntity = agent.$fairyEntity

	useEffect(() => {
		const elm = ref.current
		if (!elm) return

		function cleanupPointerListeners() {
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
		}

		function cancelLongPressTimer() {
			if (longPressTimerRef.current) {
				clearTimeout(longPressTimerRef.current)
				longPressTimerRef.current = null
			}
		}

		function startDraggingWithCurrentState(currentState: FairyPressedState) {
			cancelLongPressTimer()
			agent.gestureManager.clear()
			interactionState.current = {
				status: 'dragging',
				pointerId: currentState.pointerId,
				fairiesAtPointerDown: currentState.fairiesAtPointerDown,
			}
			cleanupPointerListeners()

			setFairiesToThrowTool(editor, currentState.fairiesAtPointerDown)
			editor.setCurrentTool('select.fairy-throw')
			interactionState.current = { status: 'idle' }
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
			agent.gestureManager.clear()

			if (currentState.status === 'idle') {
				cleanupPointerListeners()
				return
			}

			cleanupPointerListeners()
			editor.setCursor({ type: 'default', rotation: 0 })

			if (currentState.status === 'pressed' && currentState.wasSelectedBeforeDown) {
				agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
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
			if (e.button === 2) return
			if (!editor.isIn('select.idle')) return
			if (editor.isIn('select.fairy-throw')) return
			if (!isFairyGrabbable) return
			;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)

			const fairyAgents = $fairyAgentsAtom.get(editor)
			const clickedFairyEntity = $fairyEntity.get()
			const wasClickedFairySelected = clickedFairyEntity?.isSelected ?? false
			const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey

			updateFairySelection(fairyAgents, agent, wasClickedFairySelected, isMultiSelect)

			const fairiesToDrag: Atom<FairyEntity>[] = []
			const selectedFairies = getSelectedFairyAtoms(fairyAgents)
			if (selectedFairies.length === 0) {
				fairiesToDrag.push($fairyEntity)
			} else {
				fairiesToDrag.push(...selectedFairies)
			}

			editor.setSelectedShapes([])
			editor.setCursor({ type: 'grabbing', rotation: 0 })

			editor.inputs.isPointing = true
			editor.inputs.isDragging = false
			editor.inputs.originPagePoint.setTo(editor.inputs.currentPagePoint)

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
					agent.gestureManager.push('panicking')
				}
				longPressTimerRef.current = null
			}, 3000)

			editor.on('event', handleEvent)
		}

		elm.addEventListener('pointerdown', handleFairyPointerDown)

		return () => {
			// Cleanup on unmount
			cancelLongPressTimer()
			elm.removeEventListener('pointerdown', handleFairyPointerDown)
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
		}
	}, [agent, editor, isFairyGrabbable, $fairyEntity, ref])
}

export function Fairy({ agent }: { agent: FairyAgent }) {
	const editor = useEditor()
	const fairyRef = useRef<HTMLDivElement>(null)
	const $fairyEntity = agent.$fairyEntity
	const $fairyConfig = agent.$fairyConfig

	const fairyOutfit = useValue('fairy outfit', () => $fairyConfig.get()?.outfit, [$fairyConfig])
	const fairyEntity = useValue('fairy entity', () => $fairyEntity.get(), [$fairyEntity])

	const position = useValue(
		'fairy position',
		() => {
			const entity = $fairyEntity.get()
			if (!entity) return null
			return {
				x: entity.position.x,
				y: entity.position.y,
			}
		},
		[editor, $fairyEntity]
	)

	const isOrchestrator = useValue(
		'is orchestrator',
		() => agent.getRole() === 'orchestrator' || agent.getRole() === 'duo-orchestrator',
		[agent]
	)
	const projectColor = useValue('project color', () => agent.getProject()?.color, [agent])

	const projectHexColor = projectColor ? getProjectColor(projectColor) : undefined

	const flipX = useValue('fairy flipX', () => $fairyEntity.get()?.flipX ?? false, [$fairyEntity])
	const isSelected = useValue('fairy isSelected', () => $fairyEntity.get()?.isSelected ?? false, [
		$fairyEntity,
	])
	const isInSelectTool = useValue('is in select tool', () => editor.isIn('select.idle'), [editor])
	const isInThrowTool = useValue('is in throw tool', () => editor.isIn('select.fairy-throw'), [
		editor,
	])
	const isGenerating = useValue('is generating', () => agent.isGenerating(), [agent])
	const isFairyGrabbable = isInSelectTool

	useFairyPointerInteraction(fairyRef, agent, editor, isFairyGrabbable)

	// Don't render if entity, outfit or position doesn't exist yet to avoid position jumping from (0,0)
	if (!fairyEntity || !fairyOutfit || !position) {
		return null
	}

	return (
		<_ContextMenu.Root dir="ltr">
			<_ContextMenu.Trigger asChild>
				<FairyContainer
					ref={fairyRef}
					position={position}
					isSelected={isSelected}
					isGenerating={isGenerating}
					isInThrowTool={isInThrowTool}
					isFairyGrabbable={isFairyGrabbable}
					isDragging={editor.inputs.isDragging}
				>
					<div className="fairy-sprite-wrapper">
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
				</FairyContainer>
			</_ContextMenu.Trigger>
			<FairyContextMenuContent agent={agent} source="canvas" />
		</_ContextMenu.Root>
	)
}

export function SelectedFairy({ agent }: { agent: FairyAgent }) {
	const position = useValue(
		'fairy position',
		() => agent.$fairyEntity.get()?.position ?? { x: 0, y: 0 },
		[agent]
	)

	return (
		<div
			style={{
				position: 'absolute',
				left: position.x,
				top: position.y,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: `${FAIRY_CONTAINER_SIZE}px`,
				height: `${FAIRY_CONTAINER_SIZE}px`,
				transform: `translate(${FAIRY_TRANSFORM_X_OFFSET}%, ${FAIRY_TRANSFORM_Y_OFFSET}%) scale(var(--tl-scale))`,
				transformOrigin: `${-FAIRY_TRANSFORM_X_OFFSET}% ${-FAIRY_TRANSFORM_Y_OFFSET}%`,
			}}
		>
			<FairyReticleSprite size={FAIRY_CONTAINER_SIZE / 1.5} />
		</div>
	)
}
