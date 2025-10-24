import { getValidGesture, getValidPose } from '@tldraw/fairy-shared'
import { useMemo } from 'react'
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

	const { agents, color } = presence

	if (!agents || agents.length === 0) {
		return null
	}

	return (
		<>
			{agents.map((agent, index) => (
				<RemoteFairyAgent
					key={`${userId}_agent_${index}`}
					agent={agent}
					color={color}
					editor={editor}
				/>
			))}
		</>
	)
}

function RemoteFairyAgent({
	agent,
	color,
	editor,
}: {
	agent: {
		position: { x: number; y: number }
		flipX: boolean
		state: string
		gesture: string | null
	}
	color: string
	editor: ReturnType<typeof useEditor>
}) {
	// Use useValue to reactively update screen position when camera moves
	const screenPosition = useValue(
		'remote fairy screen position',
		() => {
			const screenPos = editor.pageToScreen(agent.position)
			const screenBounds = editor.getViewportScreenBounds()
			return {
				x: screenPos.x - screenBounds.x,
				y: screenPos.y - screenBounds.y,
			}
		},
		[editor, agent.position]
	)

	const validPose = useMemo(() => getValidPose(agent.state), [agent.state])
	const validGesture = useMemo(() => getValidGesture(agent.gesture), [agent.gesture])

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
					transform: `translate(-50%, -50%) scale(min(max(var(--tl-zoom), 0.2), 0.7))${agent.flipX ? ' scaleX(-1)' : ''}`,
					filter: `drop-shadow(4px 8px 2px ${color})`,
				}}
			>
				<FairySpriteComponent
					animated={true}
					entity={{
						position: agent.position,
						flipX: agent.flipX,
						isSelected: false,
						pose: validPose,
						gesture: validGesture,
					}}
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
