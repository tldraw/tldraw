import { FairyHatType } from '@tldraw/fairy-shared'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { FairyFaceSpritePart } from './parts/FairyFaceSpritePart'
import { FairyHatSpritePart } from './parts/FairyHatSpritePart'

interface FairyMiniAvatarProps {
	hatType: FairyHatType
}

export function FairyMiniAvatar({ hatType }: FairyMiniAvatarProps) {
	return (
		<div className="fairy-avatar">
			<svg viewBox="30 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
				<FairyHatSpritePart
					hatColor="var(--tl-color-fairy-light)"
					hatType={hatType}
					bodyColor="var(--tl-color-fairy-light)"
					tint={null}
					legLength={1}
				/>
				<FairyFaceSpritePart
					bodyColor="var(--tl-color-fairy-light)"
					hatColor="var(--tl-color-fairy-light)"
					hatType={hatType}
					tint={null}
					legLength={1}
				/>
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
	return <FairyMiniAvatar hatType={agent.getConfig().hat} />
}

function FairyMiniAvatarPlaceholder() {
	return <div className="fairy-mini-avatar fairy-mini-avatar--placeholder" />
}
