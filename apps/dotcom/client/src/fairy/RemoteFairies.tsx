import { useEditor, usePeerIds, usePresence, useValue } from 'tldraw'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'

const FAIRY_SIZE = 200

/**
 * Component that renders fairies for all remote users who have an active fairy.
 */
export function RemoteFairies() {
	const peerIds = usePeerIds()
	return (
		<>
			{peerIds.map((id) => (
				<RemoteFairy key={id} userId={id} />
			))}
		</>
	)
}

function RemoteFairy({ userId }: { userId: string }) {
	const editor = useEditor()
	const presence = usePresence(userId)

	// Use useValue to reactively update screen position when camera moves
	const screenPosition = useValue(
		'remote fairy screen position',
		() => {
			if (!presence?.fairy) return { x: 0, y: 0 }
			const screenPos = editor.pageToScreen(presence.fairy.position)
			const screenBounds = editor.getViewportScreenBounds()
			return {
				x: screenPos.x - screenBounds.x,
				y: screenPos.y - screenBounds.y,
			}
		},
		[editor, presence]
	)

	// Only render if the user is on the same page and has an active fairy
	if (!presence || presence.currentPageId !== editor.getCurrentPageId()) {
		return null
	}

	const { fairy, color } = presence

	if (!fairy) {
		return null
	}

	return (
		<div
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
			<div
				style={{
					position: 'absolute',
					left: screenPosition.x,
					top: screenPosition.y,
					width: `${FAIRY_SIZE}px`,
					height: `${FAIRY_SIZE}px`,
					transform: `translate(-50%, -50%) scale(min(max(var(--tl-zoom), 0.2), 0.7))${fairy.flipX ? ' scaleX(-1)' : ''}`,
					filter: `drop-shadow(4px 8px 2px ${color})`,
				}}
			>
				<FairySpriteComponent
					pose={fairy.pose}
					outfit={{
						body: 'plain',
						hat: 'pointy',
						wings: 'plain',
					}}
				/>
			</div>
		</div>
	)
}
