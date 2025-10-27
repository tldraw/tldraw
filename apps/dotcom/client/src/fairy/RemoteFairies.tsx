import {
	FairyEntity,
	fairyEntityValidator,
	FairyOutfit,
	fairyOutfitValidator,
} from '@tldraw/fairy-shared'
import { T, useEditor, usePeerIds, usePresence, useValue } from 'tldraw'
import { FAIRY_SIZE } from './Fairy'
import { FairySpriteComponent } from './fairy-sprite/FairySprite'

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

interface FairyPresence {
	entity: FairyEntity
	outfit: FairyOutfit
}

const fairyPresenceValidator: T.ObjectValidator<FairyPresence> = T.object({
	entity: fairyEntityValidator,
	outfit: fairyOutfitValidator,
})

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

	const fairyPresences = meta.fairies
		.map((fairy) => fairyPresenceValidator.validate(fairy))
		.filter((fairyPresence) => fairyPresence !== null)

	return (
		<>
			{fairyPresences.map((fairyPresence, index) => {
				return (
					<RemoteFairyIndicator
						key={`${userId}_fairy_${index}`}
						entity={fairyPresence.entity}
						outfit={fairyPresence.outfit}
						color={color}
						editor={editor}
					/>
				)
			})}
		</>
	)
}

function RemoteFairyIndicator({
	entity,
	outfit,
	color,
	editor,
}: {
	entity: FairyEntity
	outfit: FairyOutfit
	color: string
	editor: ReturnType<typeof useEditor>
}) {
	// Use useValue to reactively update screen position when camera moves
	const screenPosition = useValue(
		'remote fairy screen position',
		() => {
			const screenPos = editor.pageToScreen(entity.position)
			const screenBounds = editor.getViewportScreenBounds()
			return {
				x: screenPos.x - screenBounds.x,
				y: screenPos.y - screenBounds.y,
			}
		},
		[editor, entity.position]
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
					transform: `translate(-50%, -50%) ${entity.flipX ? ' scaleX(-1)' : ''}`,
					// filter: `drop-shadow(4px 8px 2px ${color})`,
				}}
			>
				<FairySpriteComponent
					animated={true}
					entity={{
						position: entity.position,
						flipX: entity.flipX,
						isSelected: false,
						pose: entity.pose,
						gesture: entity.gesture,
					}}
					outfit={outfit}
					tint={color}
				/>
			</div>
		</div>
	)
}
