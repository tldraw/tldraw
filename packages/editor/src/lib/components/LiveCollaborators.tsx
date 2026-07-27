import { track, useQuickReactor } from '@tldraw/state-react'
import { TLInstancePresence } from '@tldraw/tlschema'
import { modulate } from '@tldraw/utils'
import { useRef } from 'react'
import { useEditorComponents } from '../hooks/EditorComponentsContext'
import { useEditor } from '../hooks/useEditor'
import { useSharedSafeId } from '../hooks/useSafeId'
import { toDomPrecision } from '../primitives/utils'
import { setStyleProperty } from '../utils/dom'

/**
 * The collaborator cursor layer: a DOM layer stacked as a sibling of the canvas — above all canvas
 * content, below the UI panels — hosting each visible collaborator's cursor (arrow, name tag, chat
 * message), or their off-screen hint at the viewport edge.
 *
 * Cursors are DOM rather than canvas-drawn so their chrome styles and composes like the rest of
 * the UI; per-cursor positioning writes `transform` directly (see `useTransform`), so pointer- and
 * camera-frequency updates never re-render more than the moved cursor.
 *
 * @public @react
 */
export const LiveCollaborators = track(function LiveCollaborators() {
	const editor = useEditor()
	const { CollaboratorCursor, CollaboratorHint } = useEditorComponents()

	// The inner layer carries the camera transform (same formula as the canvas's html layers), so
	// the cursor components position in page space exactly as canvas content does.
	const rHtmlLayer = useRef<HTMLDivElement>(null)
	useQuickReactor(
		'position collaborators layer',
		function positionCollaboratorsWhenCameraMoves() {
			const { x, y, z } = editor.getCamera()
			// Because the html layer has a width/height of 1px, we need a small offset when zoomed
			// to ensure it lines up exactly with the canvas layers.
			const offset =
				z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)
			setStyleProperty(
				rHtmlLayer.current,
				'transform',
				`scale(${toDomPrecision(z)}) translate(${toDomPrecision(
					x + offset
				)}px,${toDomPrecision(y + offset)}px)`
			)
		},
		[editor]
	)

	// Visibility (activity state, following, highlighting) is handled by the editor.
	const collaborators = editor.getVisibleCollaboratorsOnCurrentPage()
	if (collaborators.length === 0) return null
	if (!CollaboratorCursor && !CollaboratorHint) return null

	return (
		<div className="tl-collaborators">
			<svg className="tl-svg-context" aria-hidden="true">
				<defs>
					<CursorDef />
					<CollaboratorHintDef />
				</defs>
			</svg>
			<div ref={rHtmlLayer} className="tl-html-layer">
				{collaborators.map((presence) => (
					<Collaborator key={presence.userId} latestPresence={presence} />
				))}
			</div>
		</div>
	)
})

const Collaborator = track(function Collaborator({
	latestPresence,
}: {
	latestPresence: TLInstancePresence
}) {
	const editor = useEditor()
	const { CollaboratorCursor, CollaboratorHint } = useEditorComponents()

	const zoomLevel = editor.getZoomLevel()
	const viewportPageBounds = editor.getViewportPageBounds()
	const { userId, chatMessage, userName, cursor, color } = latestPresence

	if (!cursor) return null

	// Add a little padding to the top-left of the viewport
	// so that the cursor doesn't get cut off
	const isCursorInViewport = !(
		cursor.x < viewportPageBounds.minX - 12 / zoomLevel ||
		cursor.y < viewportPageBounds.minY - 16 / zoomLevel ||
		cursor.x > viewportPageBounds.maxX - 12 / zoomLevel ||
		cursor.y > viewportPageBounds.maxY - 16 / zoomLevel
	)

	if (isCursorInViewport) {
		if (!CollaboratorCursor) return null
		return (
			<CollaboratorCursor
				className="tl-collaborator__cursor"
				userId={userId}
				point={cursor}
				color={color}
				zoom={zoomLevel}
				name={userName !== 'New User' ? userName : null}
				chatMessage={chatMessage ?? ''}
			/>
		)
	}
	if (!CollaboratorHint) return null
	return (
		<CollaboratorHint
			className="tl-collaborator__cursor-hint"
			userId={userId}
			point={cursor}
			color={color}
			zoom={zoomLevel}
			viewport={viewportPageBounds}
		/>
	)
})

function CursorDef() {
	return (
		<g id={useSharedSafeId('cursor')}>
			<g fill="rgba(0,0,0,.2)" transform="translate(-11,-11)">
				<path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
				<path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
			</g>
			<g fill="white" transform="translate(-12,-12)">
				<path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
				<path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
			</g>
			<g fill="currentColor" transform="translate(-12,-12)">
				<path d="m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z" />
				<path d="m13 10.814v11.188l2.969-2.866.428-.139h4.768z" />
			</g>
		</g>
	)
}

function CollaboratorHintDef() {
	return <path id={useSharedSafeId('cursor_hint')} fill="currentColor" d="M -2,-5 2,0 -2,5 Z" />
}
