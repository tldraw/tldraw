import { TLUserId } from '@tldraw/tlschema'
import { track } from 'signia-react'
import { useApp } from '../hooks/useApp'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { usePeerIds } from '../hooks/usePeerIds'
import { usePresence } from '../hooks/usePresence'

export const LiveCollaboratorsNext = track(function Collaborators() {
	const peerIds = usePeerIds()
	return (
		<g>
			{peerIds.map((id) => (
				<Collaborator key={id} userId={id} />
			))}
		</g>
	)
})

const Collaborator = track(function Collaborator({ userId }: { userId: TLUserId }) {
	const app = useApp()
	const { viewportPageBounds, zoomLevel } = app

	const {
		CollaboratorBrush,
		CollaboratorScribble,
		CollaboratorCursor,
		CollaboratorHint,
		CollaboratorShapeIndicator,
	} = useEditorComponents()

	const latestPresence = usePresence(userId)
	if (!latestPresence) return null

	// if the collaborator is on another page, ignore them
	if (latestPresence.currentPageId !== app.currentPageId) return null

	const { brush, scribble, selectedIds, userName, cursor, color } = latestPresence

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
				<CollaboratorBrush key={userId + '_brush'} brush={brush} color={color} />
			) : null}
			{isCursorInViewport && CollaboratorCursor ? (
				<CollaboratorCursor
					key={userId + '_cursor'}
					point={cursor}
					color={color}
					zoom={zoomLevel}
					name={userName !== 'New User' ? userName : null}
				/>
			) : CollaboratorHint ? (
				<CollaboratorHint
					key={userId + '_cursor_hint'}
					point={cursor}
					color={color}
					zoom={zoomLevel}
					viewport={viewportPageBounds}
				/>
			) : null}
			{scribble && CollaboratorScribble ? (
				<CollaboratorScribble
					key={userId + '_scribble'}
					scribble={scribble}
					color={color}
					zoom={zoomLevel}
				/>
			) : null}
			{CollaboratorShapeIndicator &&
				selectedIds.map((shapeId) => (
					<CollaboratorShapeIndicator key={userId + '_' + shapeId} id={shapeId} color={color} />
				))}
		</>
	)
})
