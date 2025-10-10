import { FairyEntity } from '@tldraw/dotcom-shared'
import { useEffect, useRef } from 'react'
import { Atom, useEditor, useValue } from 'tldraw'
import { FairySprite } from './FairySprite'

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

	// I think we should override the select tool instead?
	useEffect(() => {
		// Deselect fairy when clicking outside
		const handleClickOutside = (e: any) => {
			if (fairyRef.current && !fairyRef.current.contains(e.target)) {
				fairy.update((value) => ({
					...value,
					isSelected: false,
				}))
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
		fairy.update((value) => ({
			...value,
			isSelected: !value.isSelected,
		}))
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
				zIndex: 9999,
				overflow: 'hidden',
			}}
		>
			{/* Fairy */}
			<div
				ref={fairyRef}
				onClick={handleFairyClick}
				style={{
					position: 'absolute',
					left: screenPosition.x,
					top: screenPosition.y,
					transform: `translate(-50%, -50%) scale(max(var(--tl-zoom), 0.4))${flipX ? ' scaleX(-1)' : ''}`,
					pointerEvents: 'auto',
					transition:
						'left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
				}}
				className={isSelected ? 'fairy-selected' : ''}
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
