import { useCallback, useEffect } from 'react'
import {
	Box,
	SVGContainer,
	Tldraw,
	clamp,
	compact,
	react,
	track,
	useBreakpoint,
	useEditor,
} from 'tldraw'
import { PORTRAIT_BREAKPOINT } from 'tldraw/src/lib/ui/constants'
import { Pdf } from './PdfPicker'

export function PdfEditor({ pdf }: { pdf: Pdf }) {
	return (
		<Tldraw
			onMount={(editor) => {
				editor.updateInstanceState({ isDebugMode: false })
				editor.setCamera({ x: 1000, y: 1000, z: 1 })
			}}
			components={{
				OnTheCanvas: useCallback(() => {
					return <PdfBgRenderer pdf={pdf} />
				}, [pdf]),
				InFrontOfTheCanvas: useCallback(() => {
					return <PageOverlayScreen pdf={pdf} />
				}, [pdf]),
			}}
		>
			<ConstrainCamera pdf={pdf} />
		</Tldraw>
	)
}

function PdfBgRenderer({ pdf }: { pdf: Pdf }) {
	return (
		<div className="PdfBgRenderer">
			{pdf.pages.map((page, i) => (
				<img
					key={i}
					src={page.src}
					width={page.bounds.w}
					height={page.bounds.h}
					style={{ top: page.bounds.y, left: page.bounds.x }}
				/>
			))}
		</div>
	)
}

const PageOverlayScreen = track(function PageOverlayScreen({ pdf }: { pdf: Pdf }) {
	const editor = useEditor()

	const viewportPageBounds = editor.getViewportPageBounds()
	const viewportScreenBounds = editor.getViewportScreenBounds()

	const relevantPageBounds = compact(
		pdf.pages.map((page) => {
			if (!viewportPageBounds.collides(page.bounds)) return null
			const topLeft = editor.pageToViewport(page.bounds)
			const bottomRight = editor.pageToViewport({ x: page.bounds.maxX, y: page.bounds.maxY })
			return new Box(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
		})
	)

	function pathForPageBounds(bounds: Box) {
		return `M ${bounds.x} ${bounds.y} L ${bounds.maxX} ${bounds.y} L ${bounds.maxX} ${bounds.maxY} L ${bounds.x} ${bounds.maxY} Z`
	}

	const viewportPath = `M 0 0 L ${viewportScreenBounds.w} 0 L ${viewportScreenBounds.w} ${viewportScreenBounds.h} L 0 ${viewportScreenBounds.h} Z`

	return (
		<>
			<SVGContainer className="PageOverlayScreen-screen">
				<path
					d={`${viewportPath} ${relevantPageBounds.map(pathForPageBounds).join(' ')}`}
					fillRule="evenodd"
				/>
			</SVGContainer>
			{relevantPageBounds.map((bounds, i) => (
				<div
					key={i}
					className="PageOverlayScreen-outline"
					style={{
						width: bounds.w,
						height: bounds.h,
						transform: `translate(${bounds.x}px, ${bounds.y}px)`,
					}}
				/>
			))}
		</>
	)
})

function ConstrainCamera({ pdf }: { pdf: Pdf }) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM

	useEffect(() => {
		const marginTop = 64
		const marginSide = isMobile ? 16 : 164
		const marginBottom = 80

		const targetBounds = pdf.pages.reduce(
			(acc, page) => acc.union(page.bounds),
			pdf.pages[0].bounds.clone()
		)

		function constrainCamera(camera: { x: number; y: number; z: number }): {
			x: number
			y: number
			z: number
		} {
			const viewportBounds = editor.getViewportScreenBounds()

			const usableViewport = new Box(
				marginSide,
				marginTop,
				viewportBounds.w - marginSide * 2,
				viewportBounds.h - marginTop - marginBottom
			)

			const minZoom = Math.min(
				usableViewport.w / targetBounds.w,
				usableViewport.h / targetBounds.h,
				1
			)
			const zoom = Math.max(minZoom, camera.z)

			const centerX = targetBounds.x - targetBounds.w / 2 + usableViewport.midX / zoom
			const centerY = targetBounds.y - targetBounds.h / 2 + usableViewport.midY / zoom

			const availableXMovement = Math.max(0, targetBounds.w - usableViewport.w / zoom)
			const availableYMovement = Math.max(0, targetBounds.h - usableViewport.h / zoom)

			return {
				x: clamp(camera.x, centerX - availableXMovement / 2, centerX + availableXMovement / 2),
				y: clamp(camera.y, centerY - availableYMovement / 2, centerY + availableYMovement / 2),
				z: zoom,
			}
		}

		const removeOnChange = editor.sideEffects.registerBeforeChangeHandler(
			'camera',
			(_prev, next) => {
				const constrained = constrainCamera(next)
				if (constrained.x === next.x && constrained.y === next.y && constrained.z === next.z)
					return next
				return { ...next, ...constrained }
			}
		)

		const removeReaction = react('update camera when viewport/shape changes', () => {
			const original = editor.getCamera()
			const constrained = constrainCamera(original)
			if (
				original.x === constrained.x &&
				original.y === constrained.y &&
				original.z === constrained.z
			) {
				return
			}

			// this needs to be in a microtask for some reason, but idk why
			queueMicrotask(() => editor.setCamera(constrained))
		})

		return () => {
			removeOnChange()
			removeReaction()
		}
	}, [editor, isMobile, pdf.pages])

	return null
}
