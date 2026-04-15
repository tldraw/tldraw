import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box } from 'tldraw'
import { SceneViewProps } from '../../scene-system/types'
import {
	CUBE_ZOOM,
	FACE_NAMES,
	FACE_PAGE_ORIGINS,
	FACE_SIZE,
	getFaceContentTransform,
	type FaceName,
} from './constants'
import { CubeIsometricScene, type ProjectedFacePoint } from './CubeIsometricScene'

const VIEWPORT_W = (FACE_SIZE * 2) / CUBE_ZOOM
const VIEWPORT_H = (FACE_SIZE * 2) / CUBE_ZOOM
const CAM_X = FACE_SIZE / CUBE_ZOOM
const CAM_Y = 0

function createFaceEl(): HTMLDivElement {
	const el = document.createElement('div')
	el.className = 'threeldraw-face'
	el.style.width = `${FACE_SIZE}px`
	el.style.height = `${FACE_SIZE}px`
	el.style.position = 'relative'
	return el
}

/**
 * Prefix all id="..." attributes and url(#...) / href="#..." references
 * in an HTML string so that cloned SVG elements don't collide with the
 * originals in the hidden tldraw canvas.
 *
 * Uses ` id="` (space-prefixed) to avoid corrupting data-shape-id and
 * similar compound attributes.
 */
/**
 * Prefix all id="..." attributes and url(#...) / href="#..." references
 * in an HTML string so that cloned SVG elements don't collide with the
 * originals in the hidden tldraw canvas.
 *
 * Also converts fragment-only url(#id) to full-URL references to work
 * around a Chrome bug where SVG url() references break inside CSS-
 * transformed containers (which CSS3DRenderer uses).
 */
function prefixIds(html: string, prefix: string): string {
	return html
		.replace(/ id="([^"]+)"/g, ` id="${prefix}$1"`)
		.replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
		.replace(/ href="#([^"]+)"/g, ` href="#${prefix}$1"`)
		.replace(/ xlink:href="#([^"]+)"/g, ` xlink:href="#${prefix}$1"`)
}

/**
 * Strip unreliable `clip-path: url(...)` fragment references and the
 * grey-dashed arrow binding hint from cloned HTML.
 *
 * Inside a CSS3DRenderer face, SVG `url(#id)` paint server references are
 * flaky (Chrome drops clipped content entirely when the container has a
 * preserve-3d transform), which is what makes arrow shafts disappear. The
 * clip-path is only a visual refinement (cutting the shaft out from behind
 * labels and fancy arrowheads) — removing it costs a minor overlap but keeps
 * the shaft visible.
 */
function stripClipPathsAndHints(html: string): string {
	return html
		.replace(/clip-path:\s*url\(#[^)]+\);?\s*/g, '')
		.replace(/-webkit-clip-path:\s*url\(#[^)]+\);?\s*/g, '')
		.replace(/<path\b[^>]*class="tl-arrow-hint"[^>]*\/?>(?:<\/path>)?/g, '')
}

export function CubeSceneView({ editor, bridge }: SceneViewProps<Record<string, never>>) {
	const [faceElements] = useState<Record<FaceName, HTMLDivElement>>(() => ({
		left: createFaceEl(),
		right: createFaceEl(),
		floor: createFaceEl(),
	}))

	const getScreenPointForFacePoint = useCallback(
		(hit: ProjectedFacePoint) => {
			if (!editor) return null

			const camera = editor.getCamera()
			const pageOrigin = FACE_PAGE_ORIGINS[hit.faceName]
			const pagePoint = {
				x: pageOrigin.x + hit.localX / camera.z,
				y: pageOrigin.y + hit.localY / camera.z,
				z: hit.pressure,
			}

			return editor.pageToScreen(pagePoint)
		},
		[editor]
	)

	const handlePointerEvent = useCallback(
		(event: PointerEvent, hit: ProjectedFacePoint) => {
			const point = getScreenPointForFacePoint(hit)
			if (!point) return
			bridge.dispatchPointer(event, point)
		},
		[bridge, getScreenPointForFacePoint]
	)

	const handleWheelEvent = useCallback(
		(event: WheelEvent, hit: ProjectedFacePoint) => {
			const point = getScreenPointForFacePoint(hit)
			if (!point) return
			bridge.dispatchWheel(event, point)
		},
		[bridge, getScreenPointForFacePoint]
	)

	useEffect(() => {
		if (!editor) return

		const canvasEl = editor.getContainer().querySelector('.tl-canvas') as HTMLElement | null
		const originalGetBoundingClientRect = canvasEl?.getBoundingClientRect.bind(canvasEl)

		editor.updateViewportScreenBounds(new Box(0, 0, VIEWPORT_W, VIEWPORT_H))
		if (canvasEl && originalGetBoundingClientRect) {
			canvasEl.getBoundingClientRect = () => new DOMRect(0, 0, VIEWPORT_W, VIEWPORT_H)
		}

		editor.setCamera({ x: CAM_X, y: CAM_Y, z: CUBE_ZOOM }, { immediate: true })

		return () => {
			if (canvasEl && originalGetBoundingClientRect) {
				canvasEl.getBoundingClientRect = originalGetBoundingClientRect
				editor.updateViewportScreenBounds(canvasEl)
			} else {
				editor.updateViewportScreenBounds(editor.getContainer())
			}
		}
	}, [editor])

	useEffect(() => {
		if (!editor) return

		const container = editor.getContainer()
		const sourceShapesLayer = container.querySelector('.tl-shapes') as HTMLElement | null
		const sourceOverlaysLayer = container.querySelector('.tl-overlays') as HTMLElement | null
		if (!sourceShapesLayer) return
		const shapesLayer = sourceShapesLayer
		const overlaysLayer = sourceOverlaysLayer

		const mirrors = new Map<
			FaceName,
			{ shapesClone: HTMLDivElement; overlaysClone: HTMLDivElement }
		>()

		for (const name of FACE_NAMES) {
			const face = faceElements[name]

			const wrapper = document.createElement('div')
			wrapper.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;'

			const content = document.createElement('div')
			content.style.cssText =
				'position:absolute;inset:0;pointer-events:none;transform-origin:top left;'
			content.style.transform = getFaceContentTransform(name)
			wrapper.appendChild(content)

			const shapesClone = document.createElement('div')
			shapesClone.className = 'tl-html-layer tl-shapes'
			shapesClone.style.cssText =
				'position:absolute;width:1px;height:1px;pointer-events:none;visibility:visible;z-index:1;'
			content.appendChild(shapesClone)

			const overlaysClone = document.createElement('div')
			// Overlays (selection outlines, handles) need to render ABOVE shapes.
			// Individual shapes inside shapesClone have their own z-index values
			// (from tldraw's Shape.tsx) so a plain DOM-order stacking isn't enough.
			overlaysClone.style.cssText =
				'position:absolute;inset:0;pointer-events:none;visibility:visible;z-index:999999;'
			content.appendChild(overlaysClone)

			face.appendChild(wrapper)
			mirrors.set(name, { shapesClone, overlaysClone })
		}

		let frameId = 0

		function sync() {
			const camera = editor.getCamera()
			const zoom = camera.z

			for (const name of FACE_NAMES) {
				const mirror = mirrors.get(name)!
				const pageOrigin = FACE_PAGE_ORIGINS[name]
				const idPrefix = `f${name[0]}_`

				// Clone shapes with prefixed IDs to avoid SVG id collisions,
				// then strip clip-path references (unreliable inside CSS3D) so
				// arrow shafts etc. stay visible.
				mirror.shapesClone.innerHTML = stripClipPathsAndHints(
					prefixIds(shapesLayer.innerHTML, idPrefix)
				)
				mirror.shapesClone.style.transform = `scale(${zoom}) translate(${-pageOrigin.x}px,${-pageOrigin.y}px)`

				if (overlaysLayer) {
					mirror.overlaysClone.innerHTML = stripClipPathsAndHints(
						prefixIds(overlaysLayer.innerHTML, idPrefix)
					)
					const innerLayer = mirror.overlaysClone.querySelector(
						'.tl-html-layer'
					) as HTMLElement | null
					if (innerLayer) {
						innerLayer.style.transform = `scale(${zoom}) translate(${-pageOrigin.x}px,${-pageOrigin.y}px)`
					}
				}
			}

			frameId = requestAnimationFrame(sync)
		}

		frameId = requestAnimationFrame(sync)

		return () => {
			cancelAnimationFrame(frameId)
			for (const name of FACE_NAMES) {
				faceElements[name].innerHTML = ''
			}
		}
	}, [editor, faceElements])

	const scene = useMemo(
		() => (
			<CubeIsometricScene
				faceElements={faceElements}
				onPointerEvent={handlePointerEvent}
				onWheelEvent={handleWheelEvent}
			/>
		),
		[faceElements, handlePointerEvent, handleWheelEvent]
	)

	return scene
}
