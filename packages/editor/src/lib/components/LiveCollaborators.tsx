import { track, useQuickReactor } from '@tldraw/state-react'
import { TLInstancePresence } from '@tldraw/tlschema'
import { modulate } from '@tldraw/utils'
import { useCallback, useRef } from 'react'
import type { Editor } from '../editor/Editor'
import { useEditorComponents } from '../hooks/EditorComponentsContext'
import { useEditor } from '../hooks/useEditor'
import { useSharedSafeId } from '../hooks/useSafeId'
import { toDomPrecision } from '../primitives/utils'
import { setStyleProperty } from '../utils/dom'

/** The camera transform for a 1px html layer — the same formula as the canvas's html layers,
 *  including the small offset that lines the 1px container up exactly when zoomed. */
function cameraLayerTransform(editor: Editor): string {
	const { x, y, z } = editor.getCamera()
	const offset =
		z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)
	return `scale(${toDomPrecision(z)}) translate(${toDomPrecision(
		x + offset
	)}px,${toDomPrecision(y + offset)}px)`
}

/**
 * The collaborator cursor layer: a DOM layer stacked as a sibling of the canvas — above all canvas
 * content, below the in-front layer and the UI panels — hosting each visible collaborator's cursor
 * (arrow, name tag, chat message). Off-viewport collaborators are the canvas-drawn hint arrows' job
 * (CollaboratorHintOverlayUtil), not this layer's.
 *
 * Cursors are DOM rather than canvas-drawn so their chrome styles and composes like the rest of
 * the UI; per-cursor positioning writes `transform` directly (see `useTransform`), so pointer- and
 * camera-frequency updates never re-render more than the moved cursor.
 *
 * @public @react
 */
export const LiveCollaborators = track(function LiveCollaborators() {
	const editor = useEditor()
	const { CollaboratorCursor } = useEditorComponents()

	// The inner layer carries the camera transform, so the cursor components position in page
	// space exactly as canvas content does. Unlike the canvas's html layers this one unmounts
	// while no collaborators are visible, so the transform is written at two moments: on every
	// camera change (the reactor), and on (re)attach (the callback ref) — the reactor's last run
	// hit a null ref while the layer was unmounted, and without the attach write a reappearing
	// layer would keep an identity transform until the next camera move.
	const rHtmlLayer = useRef<HTMLDivElement | null>(null)
	const setHtmlLayer = useCallback(
		(elm: HTMLDivElement | null) => {
			rHtmlLayer.current = elm
			if (elm) setStyleProperty(elm, 'transform', cameraLayerTransform(editor))
		},
		[editor]
	)
	useQuickReactor(
		'position collaborators layer',
		function positionCollaboratorsWhenCameraMoves() {
			// Reads the camera even while the layer is unmounted, keeping the subscription alive.
			const transform = cameraLayerTransform(editor)
			setStyleProperty(rHtmlLayer.current, 'transform', transform)
		},
		[editor]
	)

	// Visibility (activity state, following, highlighting) is handled by the editor.
	const collaborators = editor.getVisibleCollaboratorsOnCurrentPage()
	if (collaborators.length === 0) return null
	if (!CollaboratorCursor) return null

	return (
		<div className="tl-collaborators">
			<svg className="tl-svg-context" aria-hidden="true">
				<defs>
					<CursorDef />
				</defs>
			</svg>
			<div ref={setHtmlLayer} className="tl-html-layer">
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
	const { CollaboratorCursor } = useEditorComponents()

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

	// Off-viewport collaborators show as the canvas-drawn hint arrows
	// (CollaboratorHintOverlayUtil) — only the cursor itself is DOM.
	if (!isCursorInViewport) return null
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
