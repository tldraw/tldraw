import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { getHatColor } from '../FairySprite'
import { FairyFaceSpritePart } from './parts/FairyFaceSpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'

interface FairyMiniAvatarProps {
	agent: FairyAgent
}

export function FairyMiniAvatar({ agent }: FairyMiniAvatarProps) {
	const fairyConfig = useValue('fairy config', () => agent.getConfig(), [agent])

	if (!fairyConfig?.outfit) return <FairyMiniAvatarPlaceholder />

	return (
		<div className="fairy-avatar">
			<svg viewBox="30 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
				<FairyHatSpritePart hatColor={getHatColor(fairyConfig.outfit.hat)} />
				<FairyFaceSpritePart bodyColor="var(--tl-color-fairy-light)" />
			</svg>
		</div>
	)
}

export function FairyMiniAvatarById({
	agentId,
	agents,
}: {
	agentId: string
	agents: FairyAgent[]
}) {
	const agent = agents.find((a) => a.id === agentId)
	if (!agent) return <FairyMiniAvatarPlaceholder />
	return <FairyMiniAvatar agent={agent} />
}

function FairyMiniAvatarPlaceholder() {
	return <div className="fairy-mini-avatar fairy-mini-avatar--placeholder" />
}
