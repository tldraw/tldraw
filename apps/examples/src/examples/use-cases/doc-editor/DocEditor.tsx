import { useMemo } from 'react'
import {
	Box,
	createShapeId,
	react,
	SVGContainer,
	TLComponents,
	Tldraw,
	track,
	useEditor,
} from 'tldraw'
import { Doc } from './DocPicker'
import { DOCUMENT_PAGE_TYPE, DocumentPageShapeUtil } from './DocumentPageShapeUtil'
import { ExportDocButton } from './ExportDocButton'

const shapeUtils = [DocumentPageShapeUtil]

export function DocEditor({ doc }: { doc: Doc }) {
	const pageBounds = useMemo(() => new Box(0, 0, doc.width, doc.height), [doc])

	const components = useMemo<TLComponents>(
		() => ({
			PageMenu: null,
			OnTheCanvas: () => <DocumentOverlay bounds={pageBounds} />,
			SharePanel: () => <ExportDocButton doc={doc} />,
		}),
		[doc, pageBounds]
	)

	return (
		<Tldraw
			shapeUtils={shapeUtils}
			components={components}
			onMount={(editor) => {
				// [1] Create the document page as a locked background shape.
				const shapeId = createShapeId()
				editor.createShape({
					id: shapeId,
					type: DOCUMENT_PAGE_TYPE,
					x: pageBounds.x,
					y: pageBounds.y,
					isLocked: true,
					props: { w: doc.width, h: doc.height, html: doc.html },
				})

				// [2] Don't let the user unlock the page.
				editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
					if (next.id !== shapeId) return next
					if (next.isLocked) return next
					return { ...prev, isLocked: true }
				})

				// [3] Keep the page beneath any annotations.
				function keepPageAtBottom() {
					const page = editor.getShape(shapeId)
					if (!page) return
					const siblings = editor.getSortedChildIdsForParent(editor.getCurrentPageId())
					if (siblings[0] === shapeId) return
					editor.sendToBack([shapeId])
				}
				keepPageAtBottom()
				editor.sideEffects.registerAfterCreateHandler('shape', keepPageAtBottom)
				editor.sideEffects.registerAfterChangeHandler('shape', keepPageAtBottom)

				// [4] Constrain the camera to the page.
				function updateCameraBounds(isMobile: boolean) {
					editor.setCameraOptions({
						constraints: {
							bounds: pageBounds,
							padding: { x: isMobile ? 16 : 164, y: 64 },
							origin: { x: 0.5, y: 0 },
							initialZoom: 'fit-x-100',
							baseZoom: 'default',
							behavior: 'contain',
						},
					})
					editor.setCamera(editor.getCamera(), { reset: true })
				}

				let isMobile = editor.getViewportScreenBounds().width < 840
				react('update camera', () => {
					const isMobileNow = editor.getViewportScreenBounds().width < 840
					if (isMobileNow === isMobile) return
					isMobile = isMobileNow
					updateCameraBounds(isMobile)
				})
				updateCameraBounds(isMobile)
			}}
		/>
	)
}

// [5] Dim everything outside the page so the document stands out.
const DocumentOverlay = track(function DocumentOverlay({ bounds }: { bounds: Box }) {
	const editor = useEditor()
	const viewport = editor.getViewportPageBounds()
	if (!viewport.collides(bounds)) return null

	const rect = (b: Box) =>
		`M ${b.x} ${b.y} L ${b.maxX} ${b.y} L ${b.maxX} ${b.maxY} L ${b.x} ${b.maxY} Z`

	return (
		<>
			<SVGContainer className="DocOverlay-screen">
				<path d={`${rect(viewport)} ${rect(bounds)}`} fillRule="evenodd" />
			</SVGContainer>
			<div
				className="DocOverlay-outline"
				style={{
					width: bounds.w,
					height: bounds.h,
					transform: `translate(${bounds.x}px, ${bounds.y}px)`,
				}}
			/>
		</>
	)
})
