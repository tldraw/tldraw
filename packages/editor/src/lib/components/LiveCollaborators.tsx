import { Box2d } from '@tldraw/primitives'
import { TLUserPresence } from '@tldraw/tlschema'
import React, { useMemo } from 'react'
import { track, useAtom } from 'signia-react'
import { useApp } from '../hooks/useApp'
import { useEditorComponents } from '../hooks/useEditorComponents'

export const useActivePresences = () => {
	const app = useApp()
	const time = useAtom('time', Date.now())

	React.useEffect(() => {
		const interval = setInterval(() => time.set(Date.now()), 1000 * 5)
		return () => clearInterval(interval)
	}, [time])

	return useMemo(
		() =>
			app.store.query.records('user_presence', () => ({
				lastActivityTimestamp: { gt: time.value - COLLABORATOR_INACTIVITY_TIMEOUT },
				userId: { neq: app.userId },
			})),
		[app, time]
	)
}

export const LiveCollaborators = track(function Collaborators() {
	const app = useApp()
	const { viewportPageBounds, zoomLevel } = app
	const presences = useActivePresences()

	return (
		<g>
			{presences.value.map((userPresence) => (
				<Collaborator
					key={userPresence.id}
					presence={userPresence}
					viewport={viewportPageBounds}
					zoom={zoomLevel}
				/>
			))}
		</g>
	)
})

const COLLABORATOR_INACTIVITY_TIMEOUT = 1000 * 10

const Collaborator = track(function Collaborator({
	presence,
	viewport,
	zoom,
}: {
	presence: TLUserPresence
	viewport: Box2d
	zoom: number
}) {
	const app = useApp()

	const {
		CollaboratorBrush,
		CollaboratorScribble,
		CollaboratorCursor,
		CollaboratorHint,
		CollaboratorShapeIndicator,
	} = useEditorComponents()

	const { userId, color, cursor, lastUsedInstanceId } = presence

	const pageState = useMemo(
		() =>
			lastUsedInstanceId
				? app.store.query.record('instance_page_state', () => ({
						instanceId: { eq: lastUsedInstanceId },
						pageId: { eq: app.currentPageId },
				  }))
				: null,
		[app, lastUsedInstanceId]
	)

	const user = useMemo(
		() =>
			app.store.query.record('user', () => ({
				id: { eq: userId },
			})),
		[app, userId]
	)

	if (!lastUsedInstanceId || !pageState || !user) return null
	const instance = app.store.get(lastUsedInstanceId)
	if (!instance) return null

	// if the collaborator is on another page, ignore them
	if (instance.currentPageId !== app.currentPageId) return null

	if (!pageState.value) return null
	if (!user.value) return null

	const { brush, scribble } = instance
	const { selectedIds } = pageState.value
	const { name } = user.value

	// Add a little padding to the top-left of the viewport
	// so that the cursor doesn't get cut off
	const isCursorInViewport = !(
		cursor.x < viewport.minX - 12 / zoom ||
		cursor.y < viewport.minY - 16 / zoom ||
		cursor.x > viewport.maxX - 12 / zoom ||
		cursor.y > viewport.maxY - 16 / zoom
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
					zoom={zoom}
					nameTag={name !== 'New User' ? name : null}
				/>
			) : CollaboratorHint ? (
				<CollaboratorHint
					key={userId + '_cursor_hint'}
					point={cursor}
					color={color}
					zoom={zoom}
					viewport={viewport}
				/>
			) : null}
			{scribble && CollaboratorScribble ? (
				<CollaboratorScribble
					key={userId + '_scribble'}
					scribble={scribble}
					color={color}
					zoom={zoom}
				/>
			) : null}
			{CollaboratorShapeIndicator &&
				selectedIds.map((shapeId) => (
					<CollaboratorShapeIndicator key={userId + '_' + shapeId} id={shapeId} color={color} />
				))}
		</>
	)
})
