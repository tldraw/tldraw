import { FairyEntity } from '@tldraw/fairy-shared'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import React, { useRef } from 'react'
import { Atom, TLEventInfo, useEditor, useValue } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from './fairy-agent/agent/fairyAgentsAtom'
import { FairySprite } from './fairy-sprite/FairySprite2'
import { SelectedSprite } from './fairy-sprite/sprites/SelectedSprite'
import { FairyContextMenuContent } from './FairyContextMenuContent'
import { FairyThrowTool } from './FairyThrowTool'
import { getProjectColor } from './getProjectColor'

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

/*
Selection logic:

- click a fairy (down click)
	- if fairy is not selected
		- select the fairy
	- if fairy is selected
		- do nothing (might be dragging multiple fairies)
- click a fairy (up click without dragging)
	- if fairy was selected before down click
		- deselect the fairy
- shift click a fairy
	- if fairy is not selected
		- add the fairy to selection
- shift click a fairy (up click without dragging)
	- if fairy was selected before down click
		- remove the fairy from selection
*/

// We use the agent directly here because we need to access the isGenerating method
// which is not exposed on the fairy atom
export default function Fairy({ agent }: { agent: FairyAgent }) {
	const editor = useEditor()
	const fairyRef = useRef<HTMLDivElement>(null)
	const $fairyEntity = agent.$fairyEntity
	const $fairyConfig = agent.$fairyConfig
	const interactionState = useRef<FairyInteractionState>({ status: 'idle' })

	const fairyOutfit = useValue('fairy outfit', () => $fairyConfig.get()?.outfit, [$fairyConfig])
	const fairyEntity = useValue('fairy entity', () => $fairyEntity.get(), [$fairyEntity])

	const isOrchestrator = useValue(
		'is orchestrator',
		() => agent.getRole() === 'orchestrator' || agent.getRole() === 'duo-orchestrator',
		[agent]
	)
	const projectColor = useValue('project color', () => agent.getProject()?.color, [agent])

	const position = useValue(
		'fairy position',
		() => {
			const entity = $fairyEntity.get()
			// Use entity position directly if it exists, otherwise return null to prevent rendering
			if (!entity) return null
			return {
				x: entity.position.x,
				y: entity.position.y,
			}
		},
		[editor, $fairyEntity]
	)

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

	// Don't render if entity or position doesn't exist yet to avoid position jumping from (0,0)
	if (!fairyEntity || !position) {
		return null
	}

	// Handle fairy pointer down, we don't enter fairy throw tool until the user actually moves their mouse
	const handleFairyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		// Don't activate tool immediately - wait for drag to start
		// Skip dragging behavior on right-click (context menu will handle it)
		if (e.button === 2) return
		if (!editor.isIn('select.idle')) return
		if (editor.isIn('select.fairy-throw')) return

		e.currentTarget.setPointerCapture(e.pointerId)

		// Determine which fairies to drag before updating selection
		const fairyAgents = $fairyAgentsAtom.get(editor)
		const clickedFairyEntity = $fairyEntity.get()
		const wasClickedFairySelected = clickedFairyEntity?.isSelected ?? false
		const shiftKey = e.shiftKey || e.ctrlKey || e.metaKey

		// Handle selection on pointer down according to the selection logic:
		// - click a fairy (down click): if fairy is not selected, select the fairy
		// - if fairy is selected: do nothing (might be dragging multiple fairies)
		// - shift click a fairy: if fairy is not selected, add the fairy to selection
		if (!shiftKey) {
			// Regular click
			if (!wasClickedFairySelected) {
				// Select the clicked fairy if it wasn't selected
				fairyAgents.forEach((a) => {
					if (a.id === agent.id) {
						a.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))
					} else {
						// Deselect all other fairies
						a.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
					}
				})
			}
			// If already selected, do nothing (might be dragging multiple fairies)
		} else {
			// Shift/ctrl/meta click: add to selection if not selected
			if (!wasClickedFairySelected) {
				agent.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))
			}
			// If already selected, do nothing (will handle deselection on pointer up)
		}

		// Determine which fairies to drag AFTER updating selection
		// Always drag all currently selected fairies (including ones just added via shift-click)
		const fairiesToDrag: Atom<FairyEntity>[] = []
		const selectedFairies = getSelectedFairyAtoms(fairyAgents)
		if (selectedFairies.length === 0) {
			fairiesToDrag.push($fairyEntity)
		} else {
			fairiesToDrag.push(...selectedFairies)
		}

		editor.setSelectedShapes([])

		editor.setCursor({ type: 'grabbing', rotation: 0 })

		// hack: the editor never gets the pointer down event, do this manually
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

		function cleanupPointerListeners() {
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
		}

		function startDraggingWithCurrentState(currentState: FairyPressedState) {
			interactionState.current = {
				status: 'dragging',
				pointerId: currentState.pointerId,
				fairiesAtPointerDown: currentState.fairiesAtPointerDown,
			}
			cleanupPointerListeners()

			const tool = editor.getStateDescendant('select.fairy-throw')
			if (tool && 'setFairies' in tool) {
				;(tool as FairyThrowTool).setFairies(currentState.fairiesAtPointerDown)
			}
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
			if (currentState.status === 'idle') {
				cleanupPointerListeners()
				return
			}

			cleanupPointerListeners()
			editor.setCursor({ type: 'default', rotation: 0 })

			// Handle deselection on pointer up if no drag occurred
			// - click a fairy (up click without dragging): if fairy was selected before down click, deselect the fairy
			// - shift click a fairy (up click without dragging): if fairy was selected before down click, remove the fairy from selection
			if (currentState.status === 'pressed' && currentState.wasSelectedBeforeDown) {
				// Deselect if it was selected before (works for both regular and shift clicks)
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

		// Use the editor's pointer move / up events
		editor.on('event', handleEvent)
	}

	const projectHexColor = projectColor ? getProjectColor(editor, projectColor) : undefined

	return (
		<_ContextMenu.Root dir="ltr">
			<_ContextMenu.Trigger asChild>
				<div
					ref={fairyRef}
					// todo: select the fairy on right click
					// onContextMenu={}
					style={{
						position: 'absolute',
						left: position.x,
						top: position.y,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: `${FAIRY_CONTAINER_SIZE}px`,
						height: `${FAIRY_CONTAINER_SIZE}px`,
						transform: `translate(-75%, -25%) scale(var(--tl-scale))`,
						transformOrigin: '75% 25%',
						zIndex: isSelected ? 1 : 0,
						transition:
							isGenerating && !isInThrowTool
								? 'left 0.1s ease-in-out, top 0.1s ease-in-out'
								: 'none',
					}}
				>
					{/* Fairy clickable zone */}
					<div
						onPointerDown={handleFairyPointerDown}
						style={{
							position: 'absolute',
							width: '100%',
							height: '100%',
							top: 0,
							left: 0,
							pointerEvents: isFairyGrabbable ? 'all' : 'none',
							cursor: isFairyGrabbable ? 'grab' : 'default',
						}}
					/>
					<div className="fairy-sprite-wrapper">
						<FairySprite
							showShadow
							pose={fairyEntity.pose}
							outfit={fairyOutfit}
							isAnimated={fairyEntity.pose !== 'idle' || isSelected}
							isGenerating={isGenerating}
							flipX={flipX}
							isOrchestrator={isOrchestrator}
							projectColor={projectHexColor}
						/>
					</div>
				</div>
			</_ContextMenu.Trigger>
			<FairyContextMenuContent agent={agent} />
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
				transform: `translate(-75%, -25%) scale(var(--tl-scale))`,
				transformOrigin: '75% 25%',
			}}
		>
			<SelectedSprite />
		</div>
	)
}
