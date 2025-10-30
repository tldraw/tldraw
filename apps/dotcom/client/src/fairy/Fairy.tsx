import { ContextMenu as _ContextMenu } from 'radix-ui'
import React, { useEffect, useRef } from 'react'
import { Box, useEditor, useValue } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from './fairy-agent/agent/fairyAgentsAtom'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'
import { FairyContextMenuContent } from './FairyContextMenuContent'
import { FairyThrowTool } from './FairyThrowTool'

export const FAIRY_SIZE = 60
const FAIRY_CLICKABLE_SIZE_DEFAULT = 50
const FAIRY_CLICKABLE_SIZE_SELECTED = 60

// We use the agent directly here because we need to access the isGenerating method
// which is not exposed on the fairy atom
export default function Fairy({
	agent,
	onDeleteFairyConfig,
}: {
	agent: FairyAgent
	onDeleteFairyConfig(id: string): void
}) {
	const editor = useEditor()
	const fairyRef = useRef<HTMLDivElement>(null)
	const fairy = agent.$fairyEntity
	const fairyConfig = agent.$fairyConfig

	const position = useValue(
		'fairy position',
		() => {
			const entity = fairy.get()
			if (!entity) return { x: 0, y: 0 }
			return {
				x: entity.position.x,
				y: entity.position.y,
			}
		},
		[editor, fairy]
	)

	const flipX = useValue('fairy flipX', () => fairy.get()?.flipX ?? false, [fairy])
	const isSelected = useValue('fairy isSelected', () => fairy.get()?.isSelected ?? false, [fairy])
	const isInSelectTool = useValue('is in select tool', () => editor.isIn('select.idle'), [editor])
	const isGenerating = useValue('is generating', () => agent.isGenerating(), [agent])
	const isFairyGrabbable = !isGenerating && isInSelectTool

	// Listen to brush selection events and update fairy selection
	const brush = useValue('editor brush', () => editor.getInstanceState().brush, [editor])
	const wasInitiallySelectedRef = useRef(false)
	const isBrushingRef = useRef(false)

	// Track when brushing starts
	useEffect(() => {
		if (brush && !isBrushingRef.current) {
			// Brushing just started - remember initial selection state
			wasInitiallySelectedRef.current = fairy.get()?.isSelected ?? false
			isBrushingRef.current = true
		} else if (!brush && isBrushingRef.current) {
			// Brushing just ended
			isBrushingRef.current = false
		}
	}, [brush, fairy])

	useEffect(() => {
		// Only process when brush is active (not null)
		if (!brush) return
		const fairyEntity = fairy.get()
		if (!fairyEntity) return

		const fairyPosition = fairyEntity.position
		const scaledFairySize = FAIRY_SIZE / editor.getZoomLevel()
		// Create a bounding box for the fairy
		const fairyBounds = new Box(
			fairyPosition.x - scaledFairySize * 0.75,
			fairyPosition.y - scaledFairySize * 0.25,
			scaledFairySize,
			scaledFairySize
		)
		const brushBox = Box.From(brush)

		// Check if the fairy bounds intersect with the brush box
		const intersects = brushBox.collides(fairyBounds)

		// Determine if fairy should be selected based on brush intersection and shift key
		const shiftKey = editor.inputs.shiftKey
		let shouldBeSelected: boolean

		if (shiftKey) {
			// With shift key: keep initial selection and add if intersecting
			shouldBeSelected = wasInitiallySelectedRef.current || intersects
		} else {
			// Without shift key: only select if intersecting
			shouldBeSelected = intersects
		}

		// Update selection state if it changed
		const currentlySelected = fairyEntity.isSelected
		if (shouldBeSelected !== currentlySelected) {
			fairy.update((f) => (f ? { ...f, isSelected: shouldBeSelected } : f))
		}
	}, [brush, fairy, editor])

	useEffect(() => {
		// Deselect fairy when clicking outside
		const handleClickOutside = (e: PointerEvent) => {
			if (
				fairyRef.current &&
				e.target instanceof HTMLElement &&
				!fairyRef.current.contains(e.target) &&
				!e.target.closest('.tla-fairy-hud')
			) {
				fairy.update((f) => (f ? { ...f, isSelected: false } : f))
			}
		}

		if (isSelected) {
			document.addEventListener('pointerdown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('pointerdown', handleClickOutside)
		}
	}, [isSelected, fairy])

	// Fairy dragging
	// Handle fairy pointer down, we don't enter fairy throw tool until the user actually moves their mouse
	const handleFairyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		// Don't activate tool immediately - wait for drag to start
		// Skip dragging behavior on right-click (context menu will handle it)
		if (e.button === 2) return
		if (!editor.isIn('select.idle')) return
		if (editor.getCurrentTool().id === 'fairy-throw') return

		// right now we don't have a way for the fairy to break out of a user's grasp,
		// but currently the UI is structured such that you cant be dragging the fairy
		// when you press generate, so this is enough for now
		if (agent.isGenerating()) return

		const fairyAgents = $fairyAgentsAtom.get(editor)
		fairyAgents.forEach((a) => {
			if (a.id === agent.id) {
				a.$fairyEntity.update((f) => (f ? { ...f, isSelected: true } : f))
			} else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
				a.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
			}
		})

		editor.setSelectedShapes([])

		editor.setCursor({ type: 'grabbing', rotation: 0 })
		e.preventDefault()
		e.stopPropagation()

		const startX = e.clientX
		const startY = e.clientY

		const handlePointerMove = (moveEvent: PointerEvent) => {
			const deltaX = moveEvent.clientX - startX
			const deltaY = moveEvent.clientY - startY

			// Start dragging if moved more than 3 pixels
			if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
				// Clean up listeners
				document.removeEventListener('pointermove', handlePointerMove)
				document.removeEventListener('pointerup', handlePointerUp)

				// Activate the tool
				const tool = editor.getStateDescendant('fairy-throw')
				if (tool && 'setFairy' in tool) {
					;(tool as FairyThrowTool).setFairy(fairy)
				}
				editor.setCurrentTool('fairy-throw')
			}
		}

		const handlePointerUp = () => {
			// Clean up listeners if pointer released without dragging
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
			editor.setCursor({ type: 'default', rotation: 0 })
		}

		document.addEventListener('pointermove', handlePointerMove)
		document.addEventListener('pointerup', handlePointerUp)
	}

	const fairyOutfit = useValue('fairy outfit', () => fairyConfig.get()?.outfit, [fairyConfig])

	// Early return if fairy doesn't exist (after all hooks)
	const fairyEntity = fairy.get()
	if (!fairyEntity) return null

	return (
		<_ContextMenu.Root dir="ltr">
			<_ContextMenu.Trigger asChild>
				<div
					ref={fairyRef}
					style={{
						position: 'absolute',
						left: position.x,
						top: position.y,
						width: `${FAIRY_SIZE}px`,
						height: `${FAIRY_SIZE}px`,
						transform: `translate(-75%, -25%) scale(var(--tl-scale)) ${flipX ? ' scaleX(-1)' : ''}`,
						transformOrigin: '75% 25%',
						transition: isGenerating ? 'left 0.1s ease-in-out, top 0.1s ease-in-out' : 'none',
					}}
					className={isSelected ? 'fairy-selected' : ''}
				>
					{/* Fairy clickable zone */}
					<div
						onPointerDown={handleFairyPointerDown}
						style={{
							position: 'absolute',
							width: `${isSelected ? FAIRY_CLICKABLE_SIZE_SELECTED : FAIRY_CLICKABLE_SIZE_DEFAULT}px`,
							height: `${isSelected ? FAIRY_CLICKABLE_SIZE_SELECTED : FAIRY_CLICKABLE_SIZE_DEFAULT}px`,
							pointerEvents: isFairyGrabbable ? 'all' : 'none',
							cursor: isFairyGrabbable ? 'grab' : 'default',
						}}
					/>
					<FairySpriteComponent
						entity={fairyEntity}
						outfit={fairyOutfit}
						animated={true}
						onGestureEnd={() => {
							fairy.update((f) => (f ? { ...f, gesture: null } : f))
						}}
					/>
				</div>
			</_ContextMenu.Trigger>
			<FairyContextMenuContent agent={agent} onDeleteFairyConfig={onDeleteFairyConfig} />
		</_ContextMenu.Root>
	)
}
