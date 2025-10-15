import { FairyEntity } from '@tldraw/dotcom-shared'
import { useEffect, useRef } from 'react'
import { Atom, Box, useEditor, useValue } from 'tldraw'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'

export default function FairyInner({ fairy }: { fairy: Atom<FairyEntity> }) {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const fairyRef = useRef<HTMLDivElement>(null)

	// Track viewport screen bounds to position fairy correctly
	const screenPosition = useValue(
		'fairy screen position',
		() => {
			// Convert page coordinates to screen coordinates
			const screenPos = editor.pageToScreen(fairy.get().position)
			const screenBounds = editor.getViewportScreenBounds()
			return {
				x: screenPos.x - screenBounds.x,
				y: screenPos.y - screenBounds.y,
			}
		},
		[editor, fairy]
	)

	const flipX = useValue('fairy flipX', () => fairy.get().flipX, [fairy])
	const isSelected = useValue('fairy isSelected', () => fairy.get().isSelected, [fairy])
	const pose = useValue('fairy pose', () => fairy.get().pose, [fairy])

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
			wasInitiallySelectedRef.current = fairy.get().isSelected
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

		if (wasSelectAllTriggered && !fairy.get().isSelected) {
			// Select the fairy too
			fairy.update((f) => ({ ...f, isSelected: true }))
		}

		// Detect "select none" - if no shapes are selected and previously some were
		const wasSelectNoneTriggered = currentSelectedCount === 0 && prevSelectedCountRef.current > 0

		if (wasSelectNoneTriggered && fairy.get().isSelected) {
			// Deselect the fairy too
			fairy.update((f) => ({ ...f, isSelected: false }))
		}

		prevSelectedCountRef.current = currentSelectedCount
	}, [selectedShapeIds, brush, fairy, editor])

	useEffect(() => {
		// Only process when brush is active (not null)
		if (!brush) return

		const fairyPosition = fairy.get().position
		// Create a bounding box for the fairy (200px x 200px centered on position)
		const fairyBounds = new Box(fairyPosition.x - 100, fairyPosition.y - 100, 200, 200)
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
		const currentlySelected = fairy.get().isSelected
		if (shouldBeSelected !== currentlySelected) {
			fairy.update((f) => ({ ...f, isSelected: shouldBeSelected }))
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
				fairy.update((f) => ({ ...f, isSelected: false }))
			}
		}

		if (isSelected) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isSelected, fairy])

	const handleFairyClick = (e: any) => {
		e.stopPropagation()
		fairy.update((f) => ({ ...f, isSelected: !f.isSelected }))
	}

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
					width: '200px',
					height: '200px',
					transform: `translate(-50%, -50%) scale(max(var(--tl-zoom), 0.4))${flipX ? ' scaleX(-1)' : ''}`,
					// transition:
					// 'left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
				}}
				className={isSelected ? 'fairy-selected' : ''}
			>
				{/* Fairy clickable zone */}
				<div
					onClick={handleFairyClick}
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						width: '100px',
						height: '100px',
						pointerEvents: 'auto',
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
