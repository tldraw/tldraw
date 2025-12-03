import {
	FairyEntity,
	fairyEntityValidator,
	FairyHatColor,
	FairyHatType,
	FairyOutfit,
	fairyOutfitValidator,
	HAT_COLORS,
	HAT_TYPES,
} from '@tldraw/fairy-shared'
import { T, useEditor, usePeerIds, usePresence } from 'tldraw'
import { FAIRY_CONTAINER_SIZE } from '../Fairy'
import { FairySprite } from '../fairy-sprite/FairySprite'

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
	hatColor: FairyHatColor
	hatType: FairyHatType
}

const fairyPresenceValidator: T.ObjectValidator<FairyPresence> = T.object({
	entity: fairyEntityValidator,
	outfit: fairyOutfitValidator,
	hatColor: T.literalEnum(...HAT_COLORS),
	hatType: T.literalEnum(...HAT_TYPES),
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
		.filter((fairyPresence) => fairyPresence !== null && fairyPresence.entity.pose !== 'sleeping')

	return (
		<>
			{fairyPresences.map((fairyPresence, index) => {
				return (
					<RemoteFairyIndicator
						key={`${userId}_fairy_${index}`}
						entity={fairyPresence.entity}
						hatColor={fairyPresence.hatColor}
						hatType={fairyPresence.hatType}
						color={color}
					/>
				)
			})}
		</>
	)
}

function RemoteFairyIndicator({
	entity,
	hatColor,
	hatType,
	color,
}: {
	entity: FairyEntity
	hatColor: FairyHatColor
	hatType: FairyHatType
	color: string
}) {
	// Match local fairy animation logic: animate if pose is not idle or if selected
	const isAnimated = entity.pose !== 'idle' || entity.isSelected

	return (
		<div
			style={{
				position: 'absolute',
				left: entity.position.x,
				top: entity.position.y,
				width: `${FAIRY_CONTAINER_SIZE}px`,
				height: `${FAIRY_CONTAINER_SIZE}px`,
				transform: `translate(-75%, -25%) scale(var(--tl-scale))`,
				transformOrigin: '75% 25%',
			}}
		>
			<FairySprite
				showShadow
				isAnimated={isAnimated}
				flipX={entity.flipX}
				gesture={entity.gesture}
				pose={entity.pose}
				hatColor={hatColor}
				hatType={hatType}
				tint={color}
			/>
		</div>
	)
}
