import { track } from '@tldraw/state'
import { TLInstancePresence } from '@tldraw/tlschema'
import { useEffect, useRef, useState } from 'react'
import {
	COLLABORATOR_CHECK_INTERVAL,
	COLLABORATOR_IDLE_TIMEOUT,
	COLLABORATOR_INACTIVE_TIMEOUT,
} from '../constants'
import { useEditor } from '../hooks/useEditor'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { usePeerIds } from '../hooks/usePeerIds'
import { usePresence } from '../hooks/usePresence'

export const LiveCollaborators = track(function Collaborators() {
	const peerIds = usePeerIds()
	return (
		<>
			{peerIds.map((id) => (
				<CollaboratorGuard key={id} collaboratorId={id} />
			))}
		</>
	)
})

const CollaboratorGuard = track(function CollaboratorGuard({
	collaboratorId,
}: {
	collaboratorId: string
}) {
	const editor = useEditor()
	const presence = usePresence(collaboratorId)
	const collaboratorState = useCollaboratorState(presence)

	if (!(presence && presence.currentPageId === editor.currentPageId)) {
		// No need to render if we don't have a presence or if they're on a different page
		return null
	}

	switch (collaboratorState) {
		case 'inactive': {
			const { followingUserId, highlightedUserIds } = editor.instanceState
			// If they're inactive and unless we're following them or they're highlighted, hide them
			if (!(followingUserId === presence.userId || highlightedUserIds.includes(presence.userId))) {
				return null
			}
			break
		}
		case 'idle': {
			const { highlightedUserIds } = editor.instanceState
			// If they're idle and following us and unless they have a chat message or are highlighted, hide them
			if (
				presence.followingUserId === editor.user.id &&
				!(presence.chatMessage || highlightedUserIds.includes(presence.userId))
			) {
				return null
			}
			break
		}
		case 'active': {
			// If they're active, show them
			break
		}
	}

	return <Collaborator latestPresence={presence} />
})

const Collaborator = track(function Collaborator({
	latestPresence,
}: {
	latestPresence: TLInstancePresence
}) {
	const editor = useEditor()

	const {
		CollaboratorBrush,
		CollaboratorScribble,
		CollaboratorCursor,
		CollaboratorHint,
		CollaboratorShapeIndicator,
	} = useEditorComponents()

	const { viewportPageBounds, zoomLevel } = editor
	const { userId, chatMessage, brush, scribble, selectedShapeIds, userName, cursor, color } =
		latestPresence

	// Add a little padding to the top-left of the viewport
	// so that the cursor doesn't get cut off
	const isCursorInViewport = !(
		cursor.x < viewportPageBounds.minX - 12 / zoomLevel ||
		cursor.y < viewportPageBounds.minY - 16 / zoomLevel ||
		cursor.x > viewportPageBounds.maxX - 12 / zoomLevel ||
		cursor.y > viewportPageBounds.maxY - 16 / zoomLevel
	)

	return (
		<>
			{brush && CollaboratorBrush ? (
				<CollaboratorBrush
					className="tl-collaborator__brush"
					key={userId + '_brush'}
					brush={brush}
					color={color}
					opacity={0.1}
				/>
			) : null}
			{isCursorInViewport && CollaboratorCursor ? (
				<CollaboratorCursor
					className="tl-collaborator__cursor"
					key={userId + '_cursor'}
					point={cursor}
					color={color}
					zoom={zoomLevel}
					name={userName !== 'New User' ? userName : null}
					chatMessage={chatMessage}
				/>
			) : CollaboratorHint ? (
				<CollaboratorHint
					className="tl-collaborator__cursor-hint"
					key={userId + '_cursor_hint'}
					point={cursor}
					color={color}
					zoom={zoomLevel}
					viewport={viewportPageBounds}
				/>
			) : null}
			{scribble && CollaboratorScribble ? (
				<CollaboratorScribble
					className="tl-collaborator__scribble"
					key={userId + '_scribble'}
					scribble={scribble}
					color={color}
					zoom={zoomLevel}
					opacity={scribble.color === 'laser' ? 0.5 : 0.1}
				/>
			) : null}
			{CollaboratorShapeIndicator &&
				selectedShapeIds.map((shapeId) => (
					<CollaboratorShapeIndicator
						className="tl-collaborator__shape-indicator"
						key={userId + '_' + shapeId}
						id={shapeId}
						color={color}
						opacity={0.5}
					/>
				))}
		</>
	)
})

function getStateFromElapsedTime(elapsed: number) {
	return elapsed > COLLABORATOR_INACTIVE_TIMEOUT
		? 'inactive'
		: elapsed > COLLABORATOR_IDLE_TIMEOUT
		? 'idle'
		: 'active'
}

function useCollaboratorState(latestPresence: TLInstancePresence | null) {
	const rLastActivityTimestamp = useRef(latestPresence?.lastActivityTimestamp ?? -1)

	const [state, setState] = useState<'active' | 'idle' | 'inactive'>(() =>
		getStateFromElapsedTime(Date.now() - rLastActivityTimestamp.current)
	)

	useEffect(() => {
		const interval = setInterval(() => {
			setState(getStateFromElapsedTime(Date.now() - rLastActivityTimestamp.current))
		}, COLLABORATOR_CHECK_INTERVAL)

		return () => clearInterval(interval)
	}, [])

	if (latestPresence) {
		// We can do this on every render, it's free and cheaper than an effect
		// remember, there can be lots and lots of cursors moving around all the time
		rLastActivityTimestamp.current = latestPresence.lastActivityTimestamp
	}

	return state
}
