import { FairyEntity } from '@tldraw/dotcom-shared'
import { useEffect, useRef } from 'react'
import { Atom, useEditor, useValue } from 'tldraw'
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
				onClick={handleFairyClick}
				style={{
					position: 'absolute',
					left: screenPosition.x,
					top: screenPosition.y,
					width: '200px',
					height: '200px',
					transform: `translate(-50%, -50%) scale(max(var(--tl-zoom), 0.4))${flipX ? ' scaleX(-1)' : ''}`,
					transition:
						'left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
				}}
				className={isSelected ? 'fairy-selected' : ''}
			>
				<div onClick={handleFairyClick}>
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
