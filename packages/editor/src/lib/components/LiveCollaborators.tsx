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
				<Collaborator key={id} userId={id} />
			))}
		</>
	)
})

const Collaborator = track(function Collaborator({ userId }: { userId: string }) {
	const editor = useEditor()

	const {
		CollaboratorBrush,
		CollaboratorScribble,
		CollaboratorCursor,
		CollaboratorHint,
		CollaboratorShapeIndicator,
	} = useEditorComponents()

	const latestPresence = usePresence(userId)

	const collaboratorState = useCollaboratorState(latestPresence)

	if (!latestPresence) return null

	// if the collaborator is on another page, ignore them
	if (latestPresence.currentPageId !== editor.currentPageId) return null

	switch (collaboratorState) {
		case 'inactive': {
			// we always hide inactive collaborators
			return null
		}
		case 'idle': {
			if (
				// If they're following us
				latestPresence.followingUserId === userId &&
				// and unless they have a chat message or are highlighted
				!(latestPresence.chatMessage || editor.instanceState.highlightedUserIds.includes(userId))
			) {
				// then hide them
				return null
			}
			break
		}
		case 'active': {
			// we always show active collaborator cursors
			break
		}
	}

	const { chatMessage, brush, scribble, selectedIds, userName, cursor, color } = latestPresence
	const { viewportPageBounds, zoomLevel } = editor

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
				selectedIds.map((shapeId) => (
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

function useCollaboratorState(latestPresence: TLInstancePresence | null) {
	const [state, setState] = useState<'active' | 'idle' | 'inactive'>('active')

	const rLastSeen = useRef(-1)

	useEffect(() => {
		let elapsed: number
		const interval = setInterval(() => {
			elapsed = Date.now() - rLastSeen.current
			setState(
				elapsed > COLLABORATOR_INACTIVE_TIMEOUT
					? 'inactive'
					: elapsed > COLLABORATOR_IDLE_TIMEOUT
					? 'idle'
					: 'active'
			)
		}, COLLABORATOR_CHECK_INTERVAL)

		return () => clearInterval(interval)
	}, [])

	if (latestPresence) {
		// We can do this on every render, it's free and would be the same as running a useEffect with a dependency on the timestamp
		rLastSeen.current = latestPresence.lastActivityTimestamp
	}

	return state
}
