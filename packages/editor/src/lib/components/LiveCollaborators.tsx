import { track } from '@tldraw/state-react'
import { TLInstancePresence } from '@tldraw/tlschema'
import { useEffect, useRef, useState } from 'react'
import { Editor } from '../editor/Editor'
import { useEditor } from '../hooks/useEditor'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { usePeerIds } from '../hooks/usePeerIds'
import { usePresence } from '../hooks/usePresence'

export const LiveCollaborators = track(function Collaborators() {
	const peerIds = usePeerIds()
	return peerIds.map((id) => <CollaboratorGuard key={id} collaboratorId={id} />)
})

const CollaboratorGuard = track(function CollaboratorGuard({
	collaboratorId,
}: {
	collaboratorId: string
}) {
	const editor = useEditor()
	const presence = usePresence(collaboratorId)
	const collaboratorState = useCollaboratorState(editor, presence)

	if (!(presence && presence.currentPageId === editor.getCurrentPageId())) {
		// No need to render if we don't have a presence or if they're on a different page
		return null
	}

	switch (collaboratorState) {
		case 'inactive': {
			const { followingUserId, highlightedUserIds } = editor.getInstanceState()
			// If they're inactive and unless we're following them or they're highlighted, hide them
			if (!(followingUserId === presence.userId || highlightedUserIds.includes(presence.userId))) {
				return null
			}
			break
		}
		case 'idle': {
			const { highlightedUserIds } = editor.getInstanceState()
			// If they're idle and following us and unless they have a chat message or are highlighted, hide them
			if (
				presence.followingUserId === editor.user.getId() &&
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

	const zoomLevel = editor.getZoomLevel()
	const viewportPageBounds = editor.getViewportPageBounds()
	const { userId, chatMessage, brush, scribbles, selectedShapeIds, userName, cursor, color } =
		latestPresence

	if (!cursor) return null

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
					userId={userId}
					brush={brush}
					color={color}
					opacity={0.1}
				/>
			) : null}
			{isCursorInViewport && CollaboratorCursor ? (
				<CollaboratorCursor
					className="tl-collaborator__cursor"
					key={userId + '_cursor'}
					userId={userId}
					point={cursor}
					color={color}
					zoom={zoomLevel}
					name={userName !== 'New User' ? userName : null}
					chatMessage={chatMessage ?? ''}
				/>
			) : CollaboratorHint ? (
				<CollaboratorHint
					className="tl-collaborator__cursor-hint"
					key={userId + '_cursor_hint'}
					userId={userId}
					point={cursor}
					color={color}
					zoom={zoomLevel}
					viewport={viewportPageBounds}
				/>
			) : null}
			{CollaboratorScribble && scribbles.length ? (
				<>
					{scribbles.map((scribble) => (
						<CollaboratorScribble
							key={userId + '_scribble_' + scribble.id}
							className="tl-collaborator__scribble"
							userId={userId}
							scribble={scribble}
							color={color}
							zoom={zoomLevel}
							opacity={scribble.color === 'laser' ? 0.5 : 0.1}
						/>
					))}
				</>
			) : null}
			{CollaboratorShapeIndicator &&
				selectedShapeIds
					.filter((id) => !editor.isShapeHidden(id))
					.map((shapeId) => (
						<CollaboratorShapeIndicator
							className="tl-collaborator__shape-indicator"
							key={userId + '_' + shapeId}
							userId={userId}
							shapeId={shapeId}
							color={color}
							opacity={0.5}
						/>
					))}
		</>
	)
})

function getStateFromElapsedTime(editor: Editor, elapsed: number) {
	return elapsed > editor.options.collaboratorInactiveTimeoutMs
		? 'inactive'
		: elapsed > editor.options.collaboratorIdleTimeoutMs
			? 'idle'
			: 'active'
}

function useCollaboratorState(editor: Editor, latestPresence: TLInstancePresence | null) {
	const rLastActivityTimestamp = useRef(latestPresence?.lastActivityTimestamp ?? -1)

	const [state, setState] = useState<'active' | 'idle' | 'inactive'>(() =>
		getStateFromElapsedTime(editor, Date.now() - rLastActivityTimestamp.current)
	)

	useEffect(() => {
		const interval = editor.timers.setInterval(() => {
			setState(getStateFromElapsedTime(editor, Date.now() - rLastActivityTimestamp.current))
		}, editor.options.collaboratorCheckIntervalMs)

		return () => clearInterval(interval)
	}, [editor])

	if (latestPresence) {
		// We can do this on every render, it's free and cheaper than an effect
		// remember, there can be lots and lots of cursors moving around all the time
		rLastActivityTimestamp.current = latestPresence.lastActivityTimestamp ?? Infinity
	}

	return state
}
