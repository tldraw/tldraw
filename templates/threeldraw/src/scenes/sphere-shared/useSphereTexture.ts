import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Box, Editor } from 'tldraw'
import { TEXTURE_SCALE } from './sphereConstants'

/**
 * Rasterizes the tldraw editor's shapes to a CanvasTexture for use on a 3D sphere.
 *
 * Uses `editor.getSvgString()` with explicit bounds so the SVG matches the
 * exact page region. Only re-exports when the store changes (debounced).
 */
export function useSphereTexture(editor: Editor | null, pageWidth: number, pageHeight: number) {
	const renderCallbackRef = useRef<(() => void) | null>(null)

	const { canvas, texture } = useMemo(() => {
		const texW = pageWidth * TEXTURE_SCALE
		const texH = pageHeight * TEXTURE_SCALE

		const c = document.createElement('canvas')
		c.width = texW
		c.height = texH
		const ctx = c.getContext('2d')!
		ctx.fillStyle = '#f8f8f8'
		ctx.fillRect(0, 0, texW, texH)

		const t = new THREE.CanvasTexture(c)
		t.colorSpace = THREE.SRGBColorSpace
		return { canvas: c, texture: t }
	}, [pageWidth, pageHeight])

	useEffect(() => {
		if (!editor) return

		const texW = canvas.width
		const texH = canvas.height
		const ctx = canvas.getContext('2d')!
		const pageBounds = new Box(0, 0, pageWidth, pageHeight)

		let disposed = false
		let pendingImage: HTMLImageElement | null = null
		let dirty = true
		let exporting = false

		// Mark dirty when the store changes (shapes added/removed/moved)
		const unsubscribe = editor.store.listen(
			() => {
				dirty = true
			},
			{ scope: 'document' }
		)

		async function exportAndDraw() {
			if (disposed || exporting || !dirty) return
			dirty = false
			exporting = true

			try {
				const shapeIds = [...editor.getCurrentPageShapeIds()]
				if (shapeIds.length === 0) {
					ctx.fillStyle = '#f8f8f8'
					ctx.fillRect(0, 0, texW, texH)
					texture.needsUpdate = true
					renderCallbackRef.current?.()
					exporting = false
					return
				}

				const result = await editor.getSvgString(shapeIds, {
					bounds: pageBounds,
					padding: 0,
					background: true,
					scale: TEXTURE_SCALE,
				})
				if (disposed || !result) {
					exporting = false
					return
				}

				const img = new Image()
				pendingImage = img

				img.onload = () => {
					if (disposed || pendingImage !== img) return
					ctx.clearRect(0, 0, texW, texH)
					ctx.drawImage(img, 0, 0, texW, texH)
					texture.needsUpdate = true
					renderCallbackRef.current?.()
					exporting = false
				}
				img.onerror = () => {
					exporting = false
				}

				img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`
			} catch {
				exporting = false
			}
		}

		// Poll for dirty flag — cheaper than rAF with async export
		const interval = setInterval(exportAndDraw, 200)
		// Also run immediately
		exportAndDraw()

		return () => {
			disposed = true
			clearInterval(interval)
			unsubscribe()
			pendingImage = null
		}
	}, [editor, canvas, texture, pageWidth, pageHeight])

	useEffect(
		() => () => {
			texture.dispose()
		},
		[texture]
	)

	const setRenderCallback = useCallback((cb: () => void) => {
		renderCallbackRef.current = cb
	}, [])

	return { texture, setRenderCallback }
}
