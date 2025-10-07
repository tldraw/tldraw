import { useRef } from 'react'
import { useEditor, useValue } from 'tldraw'
import { FairySprite } from '../../../fairy/FairySprite'
import { FairyEntity } from './FairyWrapper'

export default function FairyInner({ fairy }: { fairy: FairyEntity }) {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const fairyRef = useRef<HTMLDivElement>(null)

	// Track viewport screen bounds to position fairy correctly
	const screenPosition = useValue(
		'fairy screen position',
		() => {
			// Convert page coordinates to screen coordinates
			const screenPos = editor.pageToScreen(fairy.position)
			const screenBounds = editor.getViewportScreenBounds()
			return {
				x: screenPos.x - screenBounds.x,
				y: screenPos.y - screenBounds.y,
			}
		},
		[editor, fairy.position]
	)

	// useEffect(() => {
	// 	// Generate new whimsical target positions in page space
	// 	const moveToNewPosition = () => {
	// 		const viewport = editor.getViewportPageBounds()
	// 		const margin = 200 // Keep fairy away from edges in page space

	// 		const newX = viewport.x + margin + Math.random() * (viewport.width - margin * 2)
	// 		const newY = viewport.y + margin + Math.random() * (viewport.height - margin * 2)

	// 		setTargetPosition({ x: newX, y: newY })

	// 		// Schedule next movement with random joyful timing
	// 		const nextMove = 1500 + Math.random() * 10000
	// 		setTimeout(moveToNewPosition, nextMove)
	// 	}

	// 	moveToNewPosition()
	// }, [editor])

	// useEffect(() => {
	// 	// Smoothly animate towards target with whimsical easing
	// 	let animationFrame: number

	// 	const animate = () => {
	// 		setPosition((current) => {
	// 			const dx = targetPosition.x - current.x
	// 			const dy = targetPosition.y - current.y
	// 			const distance = Math.sqrt(dx * dx + dy * dy)

	// 			if (distance < 1) return current

	// 			// Add some flutter to the movement
	// 			const flutter = Math.sin(Date.now() * 0.01) * 3
	// 			const ease = 0.8 // Smooth easing factor

	// 			return {
	// 				x: current.x + dx * ease + flutter,
	// 				y: current.y + dy * ease + Math.cos(Date.now() * 0.008) * 2,
	// 			}
	// 		})

	// 		animationFrame = requestAnimationFrame(animate)
	// 	}

	// 	animationFrame = requestAnimationFrame(animate)

	// 	return () => cancelAnimationFrame(animationFrame)
	// }, [targetPosition])

	// I think we should override the select tool instead?
	// useEffect(() => {
	// 	// Deselect fairy when clicking outside
	// 	const handleClickOutside = (e: any) => {
	// 		if (fairyRef.current && !fairyRef.current.contains(e.target)) {
	// 			setIsSelected(false)
	// 		}
	// 	}

	// 	if (isSelected) {
	// 		document.addEventListener('mousedown', handleClickOutside)
	// 	}

	// 	return () => {
	// 		document.removeEventListener('mousedown', handleClickOutside)
	// 	}
	// }, [isSelected])

	// const handleFairyClick = (e: any) => {
	// 	e.stopPropagation()
	// 	setIsSelected((prev) => !prev)
	// }

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
				zIndex: 9999,
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
					transform: 'translate(-50%, -50%) scale(max(var(--tl-zoom), 0.4))',
					pointerEvents: 'auto',
				}}
			>
				<FairySprite
					pose="idle"
					outfit={{
						body: 'default',
						eyes: 'default',
						hat: 'default',
						mouth: 'default',
						wand: 'default',
						wings: 'default',
						arms: 'default',
						legs: 'default',
						head: 'default',
					}}
				/>
			</div>
		</div>
	)
}
