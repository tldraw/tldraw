import {
	FairyEntity,
	fairyEntityValidator,
	FairyOutfit,
	fairyOutfitValidator,
} from '@tldraw/fairy-shared'
import { T, useEditor, usePeerIds, usePresence } from 'tldraw'
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
}: {
	entity: FairyEntity
	outfit: FairyOutfit
	color: string
}) {
	return (
		<div
			style={{
				position: 'absolute',
				left: entity.position.x,
				top: entity.position.y,
				width: `${FAIRY_SIZE}px`,
				height: `${FAIRY_SIZE}px`,
				transform: `translate(-75%, -25%) scale(var(--tl-scale)) ${entity.flipX ? ' scaleX(-1)' : ''}`,
				transformOrigin: '75% 25%',
				transition: 'left 0.1s ease-in-out, top 0.1s ease-in-out',
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
	)
}
