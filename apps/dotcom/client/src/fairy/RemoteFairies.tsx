import { FairyEntity, fairyEntityValidator } from '@tldraw/fairy-shared'
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

	// Only render if the user is on the same page and has active agents
	if (!presence || presence.currentPageId !== editor.getCurrentPageId()) {
		return null
	}

	const { meta, color } = presence
	if (!meta.fairies || !Array.isArray(meta.fairies) || meta.fairies.length === 0) {
		return null
	}

	const fairies = meta.fairies
		.map((fairy) => {
			if (!fairyEntityValidator.isValid(fairy)) return null
			return fairyEntityValidator.validate(fairy)
		})
		.filter((fairy) => fairy !== null)

	return (
		<>
			{fairies.map((fairy, index) => {
				return (
					<RemoteFairyIndicator
						key={`${userId}_fairy_${index}`}
						fairy={fairy}
						color={color}
						editor={editor}
					/>
				)
			})}
		</>
	)
}

function RemoteFairyIndicator({
	fairy,
	color,
	editor,
}: {
	fairy: FairyEntity
	color: string
	editor: ReturnType<typeof useEditor>
}) {
	// Use useValue to reactively update screen position when camera moves
	const screenPosition = useValue(
		'remote fairy screen position',
		() => {
			const screenPos = editor.pageToScreen(fairy.position)
			const screenBounds = editor.getViewportScreenBounds()
			return {
				x: screenPos.x - screenBounds.x,
				y: screenPos.y - screenBounds.y,
			}
		},
		[editor, fairy.position]
	)

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
					// filter: `drop-shadow(4px 8px 2px ${color})`,
				}}
			>
				<FairySpriteComponent
					animated={true}
					entity={{
						position: fairy.position,
						flipX: fairy.flipX,
						isSelected: false,
						pose: fairy.pose,
						gesture: fairy.gesture,
					}}
					outfit={{
						body: 'plain',
						hat: 'pointy',
						wings: 'plain',
					}}
					tint={color}
				/>
			</div>
		</div>
	)
}
