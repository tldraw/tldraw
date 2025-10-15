import { TldrawFairyAgent } from '@tldraw/fairy-shared'
import { useEffect, useRef } from 'react'
import { Box, useEditor, useValue } from 'tldraw'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'

const FAIRY_SIZE = 200
const FAIRY_CLICKABLE_SIZE_DEFAULT = 100
const FAIRY_CLICKABLE_SIZE_SELECTED = 200

// We use the agent directly here because we need to access the isGenerating method
// which is not exposed on the fairy atom
export default function FairyInner({ agent }: { agent: TldrawFairyAgent }) {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const fairyRef = useRef<HTMLDivElement>(null)
	const fairy = agent.$fairy

	// Track viewport screen bounds to position fairy correctly
	const screenPosition = useValue(
		'fairy screen position',
		() => {
			const entity = fairy.get()
			if (!entity) return { x: 0, y: 0 }
			// Convert page coordinates to screen coordinates
			const screenPos = editor.pageToScreen(entity.position)
			const screenBounds = editor.getViewportScreenBounds()
			return {
				x: screenPos.x - screenBounds.x,
				y: screenPos.y - screenBounds.y,
			}
		},
		[editor, fairy]
	)

	const flipX = useValue('fairy flipX', () => fairy.get()?.flipX ?? false, [fairy])
	const isSelected = useValue('fairy isSelected', () => fairy.get()?.isSelected ?? false, [fairy])
	const pose = useValue('fairy pose', () => fairy.get()?.pose ?? 'idle', [fairy])
	const isThrowToolActive = useValue(
		'is throw tool active',
		() => editor.getCurrentTool().id === 'fairy-throw',
		[editor]
	)

	// Listen to brush selection events and update fairy selection
	const brush = useValue('editor brush', () => editor.getInstanceState().brush, [editor])
	const wasInitiallySelectedRef = useRef(false)
	const isBrushingRef = useRef(false)

	// Listen for "select all" events
	const selectedShapeIds = useValue('selected shape ids', () => editor.getSelectedShapeIds(), [
		editor,
	])
	const prevSelectedCountRef = useRef(0)

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

	// Detect "select all" or "select none" events
	useEffect(() => {
		// Don't process during brushing (handled by brush logic)
		if (brush) return

		const currentSelectedCount = selectedShapeIds.length

		// Get all unlocked shapes on the current page
		const currentPageId = editor.getCurrentPageId()
		const allUnlockedShapeIds = editor.getSortedChildIdsForParent(currentPageId).filter((id) => {
			const shape = editor.getShape(id)
			return shape && !editor.isShapeOrAncestorLocked(shape)
		})

		// Detect "select all" - if all shapes are now selected and previously weren't
		const allShapesSelected = currentSelectedCount === allUnlockedShapeIds.length
		const wasSelectAllTriggered =
			allShapesSelected &&
			currentSelectedCount > 0 &&
			prevSelectedCountRef.current < currentSelectedCount

		if (wasSelectAllTriggered && !fairy.get()?.isSelected) {
			// Select the fairy too
			fairy.update((f) => (f ? { ...f, isSelected: true } : f))
		}

		// Detect "select none" - if no shapes are selected and previously some were
		const wasSelectNoneTriggered = currentSelectedCount === 0 && prevSelectedCountRef.current > 0

		if (wasSelectNoneTriggered && fairy.get()?.isSelected) {
			// Deselect the fairy too
			fairy.update((f) => (f ? { ...f, isSelected: false } : f))
		}

		prevSelectedCountRef.current = currentSelectedCount
	}, [selectedShapeIds, brush, fairy, editor])

	useEffect(() => {
		// Only process when brush is active (not null)
		if (!brush) return
		const fairyEntity = fairy.get()
		if (!fairyEntity) return

		const fairyPosition = fairyEntity.position
		// Create a bounding box for the fairy (200px x 200px centered on position)
		const fairyBounds = new Box(
			fairyPosition.x - FAIRY_SIZE / 2,
			fairyPosition.y - FAIRY_SIZE / 2,
			FAIRY_SIZE,
			FAIRY_SIZE
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
		const handleClickOutside = (e: any) => {
			if (
				fairyRef.current &&
				!fairyRef.current.contains(e.target) &&
				!e.target.closest('.tla-fairy-hud')
			) {
				fairy.update((f) => (f ? { ...f, isSelected: false } : f))
			}
		}

		if (isSelected) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isSelected, fairy])

	// Fairy dragging
	// Handle fairy pointer down, we don't enter fairy throw tool until the user actually moves their mouse
	const handleFairyPointerDown = (e: any) => {
		// Don't activate tool immediately - wait for drag to start
		if (!editor.isIn('select.idle')) return
		if (editor.getCurrentTool().id === 'fairy-throw') return

		// right now we don't have a way for the fairy to break out of a user's grasp,
		// but currently the UI is structured such that you cant be dragging the fairy
		// when you press generate, so this is enough for now
		if (agent.isGenerating()) return

		fairy.update((f) => (f ? { ...f, isSelected: true } : f))
		editor.setCursor({ type: 'grabbing', rotation: 20 })
		editor.setSelectedShapes([])

		const startX = e.clientX
		const startY = e.clientY

		const handlePointerMove = (moveEvent: any) => {
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
					;(tool as any).setFairy(fairy)
				}
				editor.setCurrentTool('fairy-throw')
			}
		}

		const handlePointerUp = () => {
			// Clean up listeners if pointer released without dragging
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
		}

		document.addEventListener('pointermove', handlePointerMove)
		document.addEventListener('pointerup', handlePointerUp)
	}

	const handleFairyPointerUp = () => {
		editor.setCursor({ type: 'grab', rotation: 0 })
	}

	// Early return if fairy doesn't exist (after all hooks)
	const fairyEntity = fairy.get()
	if (!fairyEntity) return null

	return (
		<div
			ref={containerRef}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100vw',
				height: '100vh',
				pointerEvents: 'none',
				overflow: 'hidden',
			}}
		>
			{/* Fairy */}
			<div
				ref={fairyRef}
				style={{
					position: 'absolute',
					left: screenPosition.x,
					top: screenPosition.y,
					width: `${FAIRY_SIZE}px`,
					height: `${FAIRY_SIZE}px`,
					transform: `translate(-50%, -50%) scale(max(var(--tl-zoom), 0.4))${flipX ? ' scaleX(-1)' : ''}`,
					// transition:
					// 'left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
				}}
				className={isSelected ? 'fairy-selected' : ''}
			>
				{/* Fairy clickable zone */}
				<div
					onPointerDown={handleFairyPointerDown}
					onPointerUp={handleFairyPointerUp}
					onMouseEnter={() => {
						if (!isThrowToolActive) {
							if (!editor.isIn('select.idle')) return
							editor.setCursor({ type: 'grab', rotation: 0 })
						}
					}}
					onMouseLeave={() => {
						if (!isThrowToolActive) {
							editor.setCursor({ type: 'default', rotation: 0 })
						}
					}}
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						width: `${isSelected ? FAIRY_CLICKABLE_SIZE_SELECTED : FAIRY_CLICKABLE_SIZE_DEFAULT}px`,
						height: `${isSelected ? FAIRY_CLICKABLE_SIZE_SELECTED : FAIRY_CLICKABLE_SIZE_DEFAULT}px`,
						pointerEvents: isThrowToolActive ? 'none' : 'auto',
					}}
				/>
				<div>
					<FairySpriteComponent
						pose={pose}
						outfit={{
							body: 'plain',
							hat: 'pointy',
							wings: 'plain',
						}}
					/>
				</div>
			</div>
		</div>
	)
}
