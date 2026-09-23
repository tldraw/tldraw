import { track, useQuickReactor, useValue } from '@tldraw/state-react'
import { TLInstancePresence } from '@tldraw/tlschema'
import { useLayoutEffect, useRef } from 'react'
import { useEditorComponents } from '../hooks/EditorComponentsContext'
import { useEditor } from '../hooks/useEditor'
import { useSharedSafeId } from '../hooks/useSafeId'
import { isCursorInViewport } from '../utils/collaborators'
import { setStyleProperty } from '../utils/dom'
import { getHtmlLayerTransform } from '../utils/getHtmlLayerTransform'

/**
 * The collaborator cursor layer: a DOM layer stacked as a sibling of the canvas — above all canvas
 * content, below the in-front layer and the UI panels — hosting each visible collaborator's cursor
 * (arrow, name tag, chat message). Off-viewport collaborators are the canvas-drawn hint arrows' job
 * (CollaboratorHintOverlayUtil), not this layer's.
 *
 * Cursors are DOM rather than canvas-drawn so their chrome styles and composes like the rest of
 * the UI. Re-render traffic is kept narrow: per-cursor positioning writes `transform` directly
 * (see `useTransform`), so a pointer move re-renders only the moved cursor; the camera transform
 * is written imperatively below, so a pure pan re-renders only cursors whose viewport visibility
 * flips (an equality-gated boolean per cursor); a zoom change re-renders every visible cursor,
 * because each one rescales by `1/zoom`.
 *
 * @public @react
 */
export const LiveCollaborators = track(function LiveCollaborators() {
	const editor = useEditor()
	const { CollaboratorCursor } = useEditorComponents()

	// The inner layer carries the camera transform, so the cursor components position in page
	// space exactly as canvas content does. Unlike the canvas's html layers this one unmounts
	// while no collaborators are visible, so the transform is written at two moments: on every
	// camera change (the reactor), and after every render (the layout effect, like useTransform
	// does per cursor) — the reactor's last run hit a null ref while the layer was unmounted,
	// and without the render-time write a reappearing layer would keep an identity transform
	// until the next camera move.
	const rHtmlLayer = useRef<HTMLDivElement | null>(null)
	useLayoutEffect(() => {
		const elm = rHtmlLayer.current
		if (!elm) return
		setStyleProperty(elm, 'transform', getHtmlLayerTransform(editor))
	})
	useQuickReactor(
		'position collaborators layer',
		function positionCollaboratorsWhenCameraMoves() {
			// Reads the camera even while the layer is unmounted, keeping the subscription alive.
			const transform = getHtmlLayerTransform(editor)
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
	const { CollaboratorCursor } = useEditorComponents()

	const { userId, chatMessage, userName, cursor, color } = latestPresence

	// The viewport read lives inside this equality-gated computed rather than the tracked render:
	// pans move the viewport every frame, but this component only needs to know when the cursor
	// crosses the edge, so it subscribes to the boolean and re-renders only when it flips.
	const cursorInViewport = useValue(
		'cursor in viewport',
		() =>
			!!cursor && isCursorInViewport(cursor, editor.getViewportPageBounds(), editor.getZoomLevel()),
		[editor, cursor]
	)
	// The zoom read is tracked directly: the cursor scales by 1/zoom, so zoom changes must
	// re-render it. Pure pans leave the zoom value unchanged, so they never invalidate this.
	const zoomLevel = editor.getZoomLevel()

	if (!cursor) return null

	// Off-viewport collaborators show as the canvas-drawn hint arrows
	// (CollaboratorHintOverlayUtil), which shares this predicate — only the cursor itself is DOM.
	if (!cursorInViewport) return null
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
